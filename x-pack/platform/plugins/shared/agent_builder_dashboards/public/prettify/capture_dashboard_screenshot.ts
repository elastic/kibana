/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { debounceTime, first, firstValueFrom, timeout } from 'rxjs';
import {
  AttachmentType,
  CHAT_ATTACHMENT_IMAGES_FILE_KIND,
  MAX_IMAGE_BYTES,
  type AttachmentInput,
  type ImageAttachmentData,
  type SupportedImageMimeType,
} from '@kbn/agent-builder-common/attachments';
import type { DashboardApi } from '@kbn/dashboard-plugin/public';
import type { FilesStart } from '@kbn/files-plugin/public';
// @ts-expect-error this module has no exported types
import domtoimage from 'dom-to-image-more';

export const CAPTURE_TIMEOUT_MS = 30_000;

export const DASHBOARD_ELEMENT_SELECTOR = '[data-shared-items-container]';
const JPEG_QUALITY = 0.8;

export type ImageAttachment = AttachmentInput<typeof AttachmentType.image, ImageAttachmentData>;

export interface CaptureDashboardScreenshotDeps {
  dashboardApi: DashboardApi;
  files: FilesStart;
}

const waitForPanelsToLoad = (dashboardApi: DashboardApi): Promise<boolean | undefined> =>
  firstValueFrom(
    dashboardApi.dataLoading$.pipe(
      // give panels a moment to start loading before trusting an idle signal
      debounceTime(300),
      first((loading) => loading !== true),
      timeout(CAPTURE_TIMEOUT_MS)
    )
  );

// Panels inside collapsed sections are not rendered, so expand them for the capture.
const expandCollapsedSections = (dashboardApi: DashboardApi): (() => void) => {
  const layout = dashboardApi.layout$.getValue();
  if (!Object.values(layout.sections).some((section) => section.collapsed)) {
    return () => {};
  }
  dashboardApi.layout$.next({
    ...layout,
    sections: Object.fromEntries(
      Object.entries(layout.sections).map(([id, section]) => [id, { ...section, collapsed: false }])
    ),
  });
  return () => dashboardApi.layout$.next(layout);
};

const getPageBackgroundColor = (): string => {
  const color = getComputedStyle(document.body).backgroundColor;
  return !color || color === 'rgba(0, 0, 0, 0)' || color === 'transparent' ? '#ffffff' : color;
};

const encodeCanvas = (
  canvas: HTMLCanvasElement,
  mimeType: SupportedImageMimeType,
  quality?: number
): Promise<Blob> =>
  new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error(`could not encode ${mimeType}`))),
      mimeType,
      quality
    );
  });

const renderGrid = async (
  grid: HTMLElement
): Promise<{ blob: Blob; mimeType: SupportedImageMimeType }> => {
  const canvas: HTMLCanvasElement = await domtoimage.toCanvas(grid, {
    bgcolor: getPageBackgroundColor(),
  });

  const png = await encodeCanvas(canvas, 'image/png');
  if (png.size <= MAX_IMAGE_BYTES) {
    return { blob: png, mimeType: 'image/png' };
  }

  const jpeg = await encodeCanvas(canvas, 'image/jpeg', JPEG_QUALITY);
  if (jpeg.size <= MAX_IMAGE_BYTES) {
    return { blob: jpeg, mimeType: 'image/jpeg' };
  }

  throw new Error('dashboard screenshot exceeds the attachment size limit');
};

export const SCREENSHOT_PREVIEW_STORAGE_KEY = 'agentBuilderDashboards.previewDashboardScreenshot';

// Dev-only: run localStorage.setItem('agentBuilderDashboards.previewDashboardScreenshot', 'true')
// in the browser console to see each captured screenshot in a click-to-dismiss overlay.
const maybePreviewScreenshot = (blob: Blob): void => {
  if (localStorage.getItem(SCREENSHOT_PREVIEW_STORAGE_KEY) !== 'true') {
    return;
  }
  const url = URL.createObjectURL(blob);
  const overlay = document.createElement('div');
  overlay.setAttribute('data-test-subj', 'dashboardScreenshotPreview');
  overlay.style.cssText =
    'position:fixed;inset:0;z-index:10000;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.6);cursor:pointer;';
  const image = document.createElement('img');
  image.src = url;
  image.style.cssText = 'max-width:90%;max-height:90%;background:#fff;';
  overlay.appendChild(image);
  overlay.addEventListener('click', () => {
    URL.revokeObjectURL(url);
    overlay.remove();
  });
  document.body.appendChild(overlay);
};

export const captureDashboardScreenshot = async ({
  dashboardApi,
  files,
}: CaptureDashboardScreenshotDeps): Promise<ImageAttachment> => {
  const grid = document.querySelector<HTMLElement>(DASHBOARD_ELEMENT_SELECTOR);
  if (!grid) {
    throw new Error('dashboard element not found');
  }

  const restoreCollapsedSections = expandCollapsedSections(dashboardApi);
  try {
    await waitForPanelsToLoad(dashboardApi);

    const { blob, mimeType } = await renderGrid(grid);
    maybePreviewScreenshot(blob);
    const name = mimeType === 'image/png' ? 'dashboard-screenshot.png' : 'dashboard-screenshot.jpg';

    const client = files.filesClientFactory.asScoped(CHAT_ATTACHMENT_IMAGES_FILE_KIND);
    const { file } = await client.create({ name, mimeType });
    await client.upload({
      id: file.id,
      body: blob,
      contentType: mimeType,
      selfDestructOnAbort: true,
    });

    return {
      id: crypto.randomUUID(),
      type: AttachmentType.image,
      description: 'Dashboard screenshot',
      data: { file_id: file.id, name, mime_type: mimeType },
    };
  } finally {
    restoreCollapsedSections();
  }
};
