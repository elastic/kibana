/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { first, firstValueFrom, interval, timeout } from 'rxjs';
import { v4 as uuidv4 } from 'uuid';
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
import { i18n } from '@kbn/i18n';
// @ts-expect-error this module has no exported types
import domtoimage from 'dom-to-image-more';

export const CAPTURE_TIMEOUT_MS = 30_000;

export const DASHBOARD_ELEMENT_SELECTOR = '[data-shared-items-container]';
const JPEG_QUALITY = 0.8;
const RENDER_POLL_MS = 100;

export type ImageAttachment = AttachmentInput<typeof AttachmentType.image, ImageAttachmentData>;

export interface CaptureDashboardScreenshotDeps {
  dashboardApi: DashboardApi;
  files: FilesStart;
}

// Mirrors how reporting decides a dashboard is ready.
const isDashboardRendered = (dashboardApi: DashboardApi, grid: HTMLElement): boolean => {
  const expectedPanels = Object.keys(dashboardApi.layout$.getValue().panels).length;
  const renderedPanels = grid.querySelectorAll(
    '[data-test-subj="embeddablePanel"][data-render-complete="true"]'
  ).length;
  // Also counts chart renderers nested inside panels, which flag their own render state.
  const pendingVisualizations = grid.querySelectorAll('[data-render-complete="false"]').length;
  return renderedPanels >= expectedPanels && pendingVisualizations === 0;
};

const waitForPanelsToRender = async (
  dashboardApi: DashboardApi,
  grid: HTMLElement
): Promise<void> => {
  await firstValueFrom(
    interval(RENDER_POLL_MS).pipe(
      first(() => isDashboardRendered(dashboardApi, grid)),
      timeout(CAPTURE_TIMEOUT_MS)
    )
  );
};

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
  // The grid itself is transparent between panels; fill with the wrapper's background to match the screen.
  const canvas: HTMLCanvasElement = await domtoimage.toCanvas(grid, {
    bgcolor: getComputedStyle(grid.parentElement ?? grid).backgroundColor,
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
    await waitForPanelsToRender(dashboardApi, grid);

    const { blob, mimeType } = await renderGrid(grid);
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
      id: uuidv4(),
      type: AttachmentType.image,
      description: i18n.translate(
        'xpack.agentBuilderDashboards.prettifyDashboard.screenshotDescription',
        { defaultMessage: 'Dashboard screenshot' }
      ),
      data: { file_id: file.id, name, mime_type: mimeType },
    };
  } finally {
    restoreCollapsedSections();
  }
};
