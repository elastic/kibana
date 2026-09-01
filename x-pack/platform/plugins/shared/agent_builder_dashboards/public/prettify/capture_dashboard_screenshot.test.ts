/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BehaviorSubject } from 'rxjs';
import { MAX_IMAGE_BYTES } from '@kbn/agent-builder-common/attachments';
import type { DashboardApi } from '@kbn/dashboard-plugin/public';
import type { FilesStart } from '@kbn/files-plugin/public';
import {
  CAPTURE_TIMEOUT_MS,
  captureDashboardScreenshot,
  SCREENSHOT_PREVIEW_STORAGE_KEY,
} from './capture_dashboard_screenshot';

jest.mock('dom-to-image-more', () => ({
  toCanvas: jest.fn(),
}));

const { toCanvas } = jest.requireMock('dom-to-image-more') as { toCanvas: jest.Mock };

// kbn-test's jsdom polyfill provides URL.createObjectURL but not revokeObjectURL
if (!Object.hasOwn(URL, 'revokeObjectURL')) {
  Object.defineProperty(URL, 'revokeObjectURL', { value: () => {} });
}

const DEBOUNCE_MS = 300;

const smallBlob = (type: string) => new Blob(['image-bytes'], { type });
const hugeBlob = (type: string) => new Blob([new Uint8Array(MAX_IMAGE_BYTES + 1)], { type });

const fakeCanvas = (blobsByType: Record<string, Blob>) => ({
  toBlob: (callback: (blob: Blob | null) => void, type: string) => {
    callback(blobsByType[type] ?? null);
  },
});

const createLayout = (collapsed: boolean) => ({
  panels: {},
  sections: { sec: { collapsed, title: 'Section', grid: { y: 0 } } },
  pinnedPanels: {},
});

const createDashboardApi = ({
  dataLoading = false as boolean | undefined,
  collapsed = false,
} = {}) => {
  const dataLoading$ = new BehaviorSubject<boolean | undefined>(dataLoading);
  const layout$ = new BehaviorSubject(createLayout(collapsed));
  return { api: { dataLoading$, layout$ } as unknown as DashboardApi, dataLoading$, layout$ };
};

const createFiles = (fileId = 'file-1') => {
  const create = jest.fn().mockResolvedValue({ file: { id: fileId } });
  const upload = jest.fn().mockResolvedValue(undefined);
  return {
    files: {
      filesClientFactory: {
        asScoped: jest.fn(() => ({ create, upload })),
      },
    } as unknown as FilesStart,
    create,
    upload,
  };
};

describe('captureDashboardScreenshot', () => {
  const grid = document.createElement('div');
  grid.setAttribute('data-shared-items-container', 'true');

  beforeEach(() => {
    jest.useFakeTimers();
    Object.defineProperty(crypto, 'randomUUID', {
      configurable: true,
      value: () => 'image-1',
    });
    document.body.appendChild(grid);
    toCanvas.mockReset();
    toCanvas.mockResolvedValue(fakeCanvas({ 'image/png': smallBlob('image/png') }));
  });

  afterEach(() => {
    jest.useRealTimers();
    grid.innerHTML = '';
    document.body.innerHTML = '';
    localStorage.clear();
  });

  it('uploads a PNG of the dashboard and returns an image attachment', async () => {
    const { api } = createDashboardApi();
    const { files, create, upload } = createFiles('uploaded-1');

    const pending = captureDashboardScreenshot({ dashboardApi: api, files });
    await jest.advanceTimersByTimeAsync(DEBOUNCE_MS);

    await expect(pending).resolves.toEqual({
      id: 'image-1',
      type: 'image',
      description: 'Dashboard screenshot',
      data: {
        file_id: 'uploaded-1',
        name: 'dashboard-screenshot.png',
        mime_type: 'image/png',
      },
    });
    expect(toCanvas).toHaveBeenCalledWith(grid, expect.any(Object));
    expect(create).toHaveBeenCalledWith({
      name: 'dashboard-screenshot.png',
      mimeType: 'image/png',
    });
    expect(upload).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'uploaded-1', contentType: 'image/png' })
    );
  });

  it('waits until panels finish loading before rendering', async () => {
    const { api, dataLoading$ } = createDashboardApi({ dataLoading: true });
    const { files } = createFiles();

    const pending = captureDashboardScreenshot({ dashboardApi: api, files });
    await jest.advanceTimersByTimeAsync(DEBOUNCE_MS * 4);
    expect(toCanvas).not.toHaveBeenCalled();

    dataLoading$.next(false);
    await jest.advanceTimersByTimeAsync(DEBOUNCE_MS);

    await expect(pending).resolves.toMatchObject({ type: 'image' });
    expect(toCanvas).toHaveBeenCalledTimes(1);
  });

  it('rejects when panels never finish loading', async () => {
    const { api } = createDashboardApi({ dataLoading: true });
    const { files } = createFiles();

    const pending = captureDashboardScreenshot({ dashboardApi: api, files });
    const assertion = expect(pending).rejects.toThrow();
    await jest.advanceTimersByTimeAsync(CAPTURE_TIMEOUT_MS + DEBOUNCE_MS);

    await assertion;
    expect(toCanvas).not.toHaveBeenCalled();
  });

  it('falls back to JPEG when the PNG is over the attachment limit', async () => {
    toCanvas.mockResolvedValue(
      fakeCanvas({
        'image/png': hugeBlob('image/png'),
        'image/jpeg': smallBlob('image/jpeg'),
      })
    );
    const { api } = createDashboardApi();
    const { files, create } = createFiles();

    const pending = captureDashboardScreenshot({ dashboardApi: api, files });
    await jest.advanceTimersByTimeAsync(DEBOUNCE_MS);

    await expect(pending).resolves.toMatchObject({
      data: { name: 'dashboard-screenshot.jpg', mime_type: 'image/jpeg' },
    });
    expect(create).toHaveBeenCalledWith({
      name: 'dashboard-screenshot.jpg',
      mimeType: 'image/jpeg',
    });
  });

  it('rejects when even the JPEG is over the attachment limit', async () => {
    toCanvas.mockResolvedValue(
      fakeCanvas({
        'image/png': hugeBlob('image/png'),
        'image/jpeg': hugeBlob('image/jpeg'),
      })
    );
    const { api } = createDashboardApi();
    const { files, create } = createFiles();

    const pending = captureDashboardScreenshot({ dashboardApi: api, files });
    const assertion = expect(pending).rejects.toThrow('size limit');
    await jest.advanceTimersByTimeAsync(DEBOUNCE_MS);

    await assertion;
    expect(create).not.toHaveBeenCalled();
  });

  it('expands collapsed sections for the capture and restores them afterwards', async () => {
    const { api, layout$ } = createDashboardApi({ collapsed: true });
    const { files } = createFiles();
    let collapsedDuringRender: boolean | undefined;
    toCanvas.mockImplementation(async () => {
      collapsedDuringRender = layout$.getValue().sections.sec.collapsed;
      return fakeCanvas({ 'image/png': smallBlob('image/png') });
    });

    const pending = captureDashboardScreenshot({ dashboardApi: api, files });
    await jest.advanceTimersByTimeAsync(DEBOUNCE_MS);
    await pending;

    expect(collapsedDuringRender).toBe(false);
    expect(layout$.getValue().sections.sec.collapsed).toBe(true);
  });

  it('restores collapsed sections when the capture fails', async () => {
    const { api, layout$ } = createDashboardApi({ collapsed: true });
    const { files } = createFiles();
    toCanvas.mockRejectedValue(new Error('boom'));

    const pending = captureDashboardScreenshot({ dashboardApi: api, files });
    const assertion = expect(pending).rejects.toThrow('boom');
    await jest.advanceTimersByTimeAsync(DEBOUNCE_MS);

    await assertion;
    expect(layout$.getValue().sections.sec.collapsed).toBe(true);
  });

  it('leaves the layout untouched when no section is collapsed', async () => {
    const { api, layout$ } = createDashboardApi();
    const next = jest.spyOn(layout$, 'next');
    const { files } = createFiles();

    const pending = captureDashboardScreenshot({ dashboardApi: api, files });
    await jest.advanceTimersByTimeAsync(DEBOUNCE_MS);
    await pending;

    expect(next).not.toHaveBeenCalled();
  });

  it('shows a click-to-dismiss preview overlay when the dev flag is set', async () => {
    localStorage.setItem(SCREENSHOT_PREVIEW_STORAGE_KEY, 'true');
    const { api } = createDashboardApi();
    const { files } = createFiles();

    const pending = captureDashboardScreenshot({ dashboardApi: api, files });
    await jest.advanceTimersByTimeAsync(DEBOUNCE_MS);
    await pending;

    const overlay = document.querySelector<HTMLElement>(
      '[data-test-subj="dashboardScreenshotPreview"]'
    );
    expect(overlay?.querySelector('img')).not.toBeNull();

    overlay?.click();
    expect(document.querySelector('[data-test-subj="dashboardScreenshotPreview"]')).toBeNull();
  });

  it('does not show a preview overlay by default', async () => {
    const { api } = createDashboardApi();
    const { files } = createFiles();

    const pending = captureDashboardScreenshot({ dashboardApi: api, files });
    await jest.advanceTimersByTimeAsync(DEBOUNCE_MS);
    await pending;

    expect(document.querySelector('[data-test-subj="dashboardScreenshotPreview"]')).toBeNull();
  });

  it('rejects when the dashboard element is missing', async () => {
    document.body.innerHTML = '';
    const { api } = createDashboardApi();
    const { files } = createFiles();

    await expect(captureDashboardScreenshot({ dashboardApi: api, files })).rejects.toThrow(
      'dashboard element not found'
    );
    expect(toCanvas).not.toHaveBeenCalled();
  });
});
