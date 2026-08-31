/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
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
import { apiPublishesDataLoading } from '@kbn/presentation-publishing';
import type { ToastsStart } from '@kbn/core/public';
import domtoimage from 'dom-to-image-more';

export const CAPTURE_TIMEOUT_MS = 30_000;
export const CAPTURE_POLL_MS = 100;

export type CaptureFailureReason =
  | 'missing_grid'
  | 'timeout'
  | 'clone_failed'
  | 'file_too_large'
  | 'upload_failed';

export type CaptureResult =
  | { ok: true; attachment: AttachmentInput<typeof AttachmentType.image, ImageAttachmentData> }
  | { ok: false; reason: CaptureFailureReason };

export interface CaptureDashboardScreenshotDeps {
  dashboardApi: DashboardApi;
  files: FilesStart;
  createAttachmentId?: () => string;
  now?: () => number;
  sleep?: (ms: number) => Promise<void>;
}

type DashboardLayout = ReturnType<DashboardApi['layout$']['getValue']>;

const GRID_SELECTOR = '[data-shared-items-container], [data-test-subj="dshDashboardViewport"]';
const PANEL_CHROME_SELECTOR = '[data-test-subj="embeddablePanel"]';
const SCREENSHOT_DESCRIPTION = 'Dashboard screenshot';

const keepCrossOriginStyles = (style: CSSStyleSheet): boolean => {
  try {
    void style.cssRules;
    return true;
  } catch {
    return false;
  }
};

export const snapshotLayout = (layout: DashboardLayout): DashboardLayout => structuredClone(layout);

export const layoutWithOpenSections = (layout: DashboardLayout): DashboardLayout => ({
  ...layout,
  sections: Object.fromEntries(
    Object.entries(layout.sections).map(([id, section]) => [id, { ...section, collapsed: false }])
  ),
});

export const arePanelsReady = (dashboardApi: DashboardApi): boolean => {
  const { panels } = dashboardApi.layout$.getValue();
  const children = dashboardApi.children$.getValue();
  const panelIds = Object.keys(panels);

  const childrenReady = panelIds.every((id) => {
    const child = children[id];
    if (!child) {
      return false;
    }
    if (apiPublishesDataLoading(child) && child.dataLoading$.getValue() === true) {
      return false;
    }
    return true;
  });

  if (!childrenReady) {
    return false;
  }

  const chrome = document.querySelectorAll(PANEL_CHROME_SELECTOR);
  if (chrome.length === 0) {
    return true;
  }
  if (chrome.length < panelIds.length) {
    return false;
  }
  return document.querySelector(`${PANEL_CHROME_SELECTOR}[data-loading]`) === null;
};

export const waitUntil = async (
  isReady: () => boolean,
  timeoutMs: number,
  intervalMs: number,
  sleep: (ms: number) => Promise<void>,
  now: () => number
): Promise<boolean> => {
  const started = now();
  while (!isReady()) {
    if (now() - started >= timeoutMs) {
      return false;
    }
    await sleep(intervalMs);
  }
  return true;
};

const defaultSleep = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });

export const wakeHiddenPanels = async (
  dashboardApi: DashboardApi,
  sleep: (ms: number) => Promise<void>
): Promise<void> => {
  if (!dashboardApi.fetchOnlyVisible$.getValue()) {
    return;
  }

  for (const panelId of Object.keys(dashboardApi.layout$.getValue().panels)) {
    dashboardApi.setScrollToPanelId(panelId);
    await sleep(75);
  }
  dashboardApi.setScrollToPanelId(undefined);
};

const showCaptureMask = (grid: HTMLElement): (() => void) => {
  const host = grid.parentElement ?? grid;
  const previousPosition = host.style.position;
  if (getComputedStyle(host).position === 'static') {
    host.style.position = 'relative';
  }

  const mask = document.createElement('div');
  mask.setAttribute('data-test-subj', 'dashboardPrettifyCaptureMask');
  mask.style.position = 'absolute';
  mask.style.inset = '0';
  mask.style.zIndex = '10000';
  mask.style.display = 'flex';
  mask.style.alignItems = 'center';
  mask.style.justifyContent = 'center';
  mask.style.background = 'color-mix(in srgb, var(--euiColorEmptyShade, #fff) 82%, transparent)';
  mask.textContent = i18n.translate(
    'xpack.agentBuilderDashboards.prettifyDashboard.capturingLabel',
    {
      defaultMessage: 'Capturing the dashboard...',
    }
  );
  host.appendChild(mask);

  return () => {
    mask.remove();
    host.style.position = previousPosition;
  };
};

const hideHoverChrome = (grid: HTMLElement): (() => void) => {
  const nodes = Array.from(grid.querySelectorAll<HTMLElement>('.embPanel__hoverActions'));
  const previous = nodes.map((node) => node.style.display);
  nodes.forEach((node) => {
    node.style.display = 'none';
  });
  return () => {
    nodes.forEach((node, index) => {
      node.style.display = previous[index];
    });
  };
};

const snapshotWebglCanvases = (grid: HTMLElement): (() => void) => {
  const restorers: Array<() => void> = [];

  grid.querySelectorAll('canvas').forEach((canvas) => {
    if (canvas.width === 0 || canvas.height === 0) {
      return;
    }

    let dataUrl: string;
    try {
      dataUrl = canvas.toDataURL('image/png');
    } catch {
      return;
    }

    const image = document.createElement('img');
    image.src = dataUrl;
    image.width = canvas.width;
    image.height = canvas.height;
    image.style.width = `${canvas.clientWidth}px`;
    image.style.height = `${canvas.clientHeight}px`;
    canvas.insertAdjacentElement('afterend', image);
    const previousDisplay = canvas.style.display;
    canvas.style.display = 'none';
    restorers.push(() => {
      image.remove();
      canvas.style.display = previousDisplay;
    });
  });

  return () => {
    restorers.forEach((restore) => restore());
  };
};

const readBackgroundColor = (node: HTMLElement): string => {
  let current: HTMLElement | null = node;
  while (current) {
    const color = getComputedStyle(current).backgroundColor;
    if (color && color !== 'rgba(0, 0, 0, 0)' && color !== 'transparent') {
      return color;
    }
    current = current.parentElement;
  }
  return '#ffffff';
};

const cloneGrid = async (grid: HTMLElement, scale: number, bgcolor: string): Promise<Blob> => {
  const width = grid.scrollWidth;
  const height = grid.scrollHeight;
  const blob = await domtoimage.toBlob(grid, {
    quality: 1,
    bgcolor,
    cacheBust: true,
    width: width * scale,
    height: height * scale,
    style: {
      transform: `scale(${scale})`,
      transformOrigin: 'top left',
      width: `${width}px`,
      height: `${height}px`,
    },
    styleFilter: keepCrossOriginStyles,
  });
  if (!blob || blob.size === 0) {
    throw new Error('empty clone');
  }
  return blob;
};

const toJpeg = async (png: Blob, quality: number, bgcolor: string): Promise<Blob> => {
  const objectUrl = URL.createObjectURL(png);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const element = new Image();
      element.onload = () => resolve(element);
      element.onerror = () => reject(new Error('jpeg decode'));
      element.src = objectUrl;
    });
    const canvas = document.createElement('canvas');
    canvas.width = image.width;
    canvas.height = image.height;
    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('jpeg canvas');
    }
    context.fillStyle = bgcolor;
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0);
    const jpeg = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (next) => {
          if (next) {
            resolve(next);
          } else {
            reject(new Error('jpeg encode'));
          }
        },
        'image/jpeg',
        quality
      );
    });
    return jpeg;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
};

export const compressUnderLimit = async (
  grid: HTMLElement,
  bgcolor: string
): Promise<{ blob: Blob; mimeType: SupportedImageMimeType } | { reason: 'file_too_large' }> => {
  const pngScale2 = await cloneGrid(grid, 2, bgcolor);
  if (pngScale2.size <= MAX_IMAGE_BYTES) {
    return { blob: pngScale2, mimeType: 'image/png' };
  }

  const pngScale1 = await cloneGrid(grid, 1, bgcolor);
  if (pngScale1.size <= MAX_IMAGE_BYTES) {
    return { blob: pngScale1, mimeType: 'image/png' };
  }

  for (const quality of [0.85, 0.7, 0.5]) {
    const jpeg = await toJpeg(pngScale1, quality, bgcolor);
    if (jpeg.size <= MAX_IMAGE_BYTES) {
      return { blob: jpeg, mimeType: 'image/jpeg' };
    }
  }

  return { reason: 'file_too_large' };
};

const uploadImage = async (
  files: FilesStart,
  blob: Blob,
  mimeType: SupportedImageMimeType,
  name: string
): Promise<string> => {
  const client = files.filesClientFactory.asScoped(CHAT_ATTACHMENT_IMAGES_FILE_KIND);
  const { file } = await client.create({ name, mimeType });
  await client.upload({
    id: file.id,
    body: blob,
    contentType: mimeType,
    selfDestructOnAbort: true,
  });
  return file.id;
};

export const captureFailureText = (reason: CaptureFailureReason): string => {
  switch (reason) {
    case 'missing_grid':
      return i18n.translate('xpack.agentBuilderDashboards.prettifyDashboard.missingGridError', {
        defaultMessage: 'Could not find the dashboard to capture.',
      });
    case 'timeout':
      return i18n.translate('xpack.agentBuilderDashboards.prettifyDashboard.timeoutError', {
        defaultMessage: 'The dashboard took too long to finish loading.',
      });
    case 'clone_failed':
      return i18n.translate('xpack.agentBuilderDashboards.prettifyDashboard.cloneError', {
        defaultMessage: 'Could not take a picture of the dashboard.',
      });
    case 'file_too_large':
      return i18n.translate('xpack.agentBuilderDashboards.prettifyDashboard.tooLargeError', {
        defaultMessage: 'The dashboard picture was too large to attach.',
      });
    case 'upload_failed':
      return i18n.translate('xpack.agentBuilderDashboards.prettifyDashboard.uploadError', {
        defaultMessage: 'Could not attach the dashboard picture.',
      });
    default: {
      const exhaustive: never = reason;
      return exhaustive;
    }
  }
};

export const showCaptureFailure = (toasts: ToastsStart, reason: CaptureFailureReason): void => {
  toasts.addDanger({
    title: i18n.translate('xpack.agentBuilderDashboards.prettifyDashboard.captureFailedTitle', {
      defaultMessage: 'Could not capture the dashboard',
    }),
    text: captureFailureText(reason),
  });
};

export const captureDashboardScreenshot = async ({
  dashboardApi,
  files,
  createAttachmentId = () => crypto.randomUUID(),
  now = () => Date.now(),
  sleep = defaultSleep,
}: CaptureDashboardScreenshotDeps): Promise<CaptureResult> => {
  const grid = document.querySelector<HTMLElement>(GRID_SELECTOR);
  if (!grid) {
    return { ok: false, reason: 'missing_grid' };
  }

  const layoutBefore = snapshotLayout(dashboardApi.layout$.getValue());
  const hideMask = showCaptureMask(grid);

  try {
    dashboardApi.layout$.next(layoutWithOpenSections(layoutBefore));

    const mounted = await waitUntil(
      () => arePanelsReady(dashboardApi),
      CAPTURE_TIMEOUT_MS,
      CAPTURE_POLL_MS,
      sleep,
      now
    );
    if (!mounted) {
      return { ok: false, reason: 'timeout' };
    }

    await wakeHiddenPanels(dashboardApi, sleep);

    const painted = await waitUntil(
      () => arePanelsReady(dashboardApi),
      CAPTURE_TIMEOUT_MS,
      CAPTURE_POLL_MS,
      sleep,
      now
    );
    if (!painted) {
      return { ok: false, reason: 'timeout' };
    }

    await sleep(32);
    hideMask();

    const bgcolor = readBackgroundColor(grid);
    const restoreHover = hideHoverChrome(grid);
    const restoreCanvases = snapshotWebglCanvases(grid);

    try {
      let compressed: Awaited<ReturnType<typeof compressUnderLimit>>;
      try {
        compressed = await compressUnderLimit(grid, bgcolor);
      } catch {
        return { ok: false, reason: 'clone_failed' };
      }
      if ('reason' in compressed) {
        return { ok: false, reason: compressed.reason };
      }

      const name =
        compressed.mimeType === 'image/png'
          ? 'dashboard-screenshot.png'
          : 'dashboard-screenshot.jpg';

      try {
        const fileId = await uploadImage(files, compressed.blob, compressed.mimeType, name);
        return {
          ok: true,
          attachment: {
            id: createAttachmentId(),
            type: AttachmentType.image,
            description: SCREENSHOT_DESCRIPTION,
            data: {
              file_id: fileId,
              name,
              mime_type: compressed.mimeType,
            },
          },
        };
      } catch {
        return { ok: false, reason: 'upload_failed' };
      }
    } finally {
      restoreCanvases();
      restoreHover();
    }
  } finally {
    dashboardApi.layout$.next(layoutBefore);
    hideMask();
  }
};
