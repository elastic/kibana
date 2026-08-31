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
  arePanelsReady,
  captureDashboardScreenshot,
  compressUnderLimit,
  layoutWithOpenSections,
  snapshotLayout,
  waitUntil,
} from './capture_dashboard_screenshot';

jest.mock('dom-to-image-more', () => ({
  toBlob: jest.fn(),
}));

const { toBlob } = jest.requireMock('dom-to-image-more') as { toBlob: jest.Mock };

const createLayout = (collapsed: boolean) => ({
  panels: {
    a: { type: 'lens', grid: { x: 0, y: 0, w: 24, h: 15, sectionId: 'sec' } },
  },
  sections: {
    sec: { collapsed, title: 'Hidden', grid: { y: 0 } },
  },
  pinnedPanels: {},
});

const createDashboardApi = ({
  collapsed = true,
  children = {},
  fetchOnlyVisible = false,
  dataLoading = false,
}: {
  collapsed?: boolean;
  children?: Record<string, { dataLoading$: BehaviorSubject<boolean | undefined> }>;
  fetchOnlyVisible?: boolean;
  dataLoading?: boolean;
} = {}) => {
  const layout$ = new BehaviorSubject(createLayout(collapsed));
  const children$ = new BehaviorSubject(
    Object.keys(children).length > 0
      ? children
      : { a: { dataLoading$: new BehaviorSubject<boolean | undefined>(dataLoading) } }
  );
  const setScrollToPanelId = jest.fn();
  return {
    api: {
      layout$,
      children$,
      fetchOnlyVisible$: new BehaviorSubject(fetchOnlyVisible),
      setScrollToPanelId,
    } as unknown as DashboardApi,
    layout$,
    setScrollToPanelId,
  };
};

const createFiles = (fileId = 'file-1') => {
  const create = jest.fn().mockResolvedValue({ file: { id: fileId } });
  const upload = jest.fn().mockResolvedValue({ ok: true, size: 12 });
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

describe('layout helpers', () => {
  it('opens every collapsed section without mutating the snapshot', () => {
    const original = createLayout(true);
    const snapshot = snapshotLayout(original);
    const opened = layoutWithOpenSections(original);

    original.sections.sec.collapsed = false;

    expect(snapshot.sections.sec.collapsed).toBe(true);
    expect(opened.sections.sec.collapsed).toBe(false);
  });
});

describe('arePanelsReady', () => {
  it('is false while a panel has no child', () => {
    const { api, layout$ } = createDashboardApi({ children: {} });
    (api.children$ as unknown as BehaviorSubject<Record<string, never>>).next({});
    expect(layout$.getValue().panels.a).toBeDefined();
    expect(arePanelsReady(api)).toBe(false);
  });

  it('is false while a child is still loading data', () => {
    const { api } = createDashboardApi({ dataLoading: true });
    expect(arePanelsReady(api)).toBe(false);
  });

  it('is true when every panel child has finished loading', () => {
    const { api } = createDashboardApi({ dataLoading: false });
    expect(arePanelsReady(api)).toBe(true);
  });
});

describe('waitUntil', () => {
  it('returns false when the timeout elapses', async () => {
    let clock = 0;
    const ready = await waitUntil(
      () => false,
      50,
      10,
      async (ms) => {
        clock += ms;
      },
      () => clock
    );
    expect(ready).toBe(false);
  });

  it('returns true when the predicate passes', async () => {
    let clock = 0;
    let ok = false;
    const ready = waitUntil(
      () => ok,
      1000,
      10,
      async () => {
        clock += 10;
        ok = true;
      },
      () => clock
    );
    await expect(ready).resolves.toBe(true);
  });
});

describe('compressUnderLimit', () => {
  const grid = document.createElement('div');

  beforeEach(() => {
    toBlob.mockReset();
    Object.defineProperty(grid, 'scrollWidth', { value: 100, configurable: true });
    Object.defineProperty(grid, 'scrollHeight', { value: 80, configurable: true });
  });

  it('keeps a small PNG at scale 2', async () => {
    toBlob.mockResolvedValue(new Blob(['png'], { type: 'image/png' }));
    const result = await compressUnderLimit(grid, '#fff');
    expect(result).toEqual({
      blob: expect.any(Blob),
      mimeType: 'image/png',
    });
    expect(toBlob).toHaveBeenCalledTimes(1);
    expect(toBlob.mock.calls[0][1].width).toBe(200);
  });

  it('falls back to scale 1 when scale 2 is over the limit', async () => {
    const huge = new Blob([new Uint8Array(MAX_IMAGE_BYTES + 1)], { type: 'image/png' });
    const small = new Blob(['ok'], { type: 'image/png' });
    toBlob.mockResolvedValueOnce(huge).mockResolvedValueOnce(small);

    const result = await compressUnderLimit(grid, '#fff');
    expect(result).toMatchObject({ mimeType: 'image/png' });
    expect(toBlob).toHaveBeenCalledTimes(2);
    expect(toBlob.mock.calls[1][1].width).toBe(100);
  });
});

describe('captureDashboardScreenshot', () => {
  const grid = document.createElement('div');
  grid.setAttribute('data-shared-items-container', 'true');

  beforeEach(() => {
    document.body.appendChild(grid);
    toBlob.mockReset();
    toBlob.mockResolvedValue(new Blob(['png'], { type: 'image/png' }));
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('expands collapsed sections, uploads an image attachment, then restores the layout', async () => {
    const { api, layout$ } = createDashboardApi({ collapsed: true });
    const { files, create, upload } = createFiles('uploaded-1');

    const result = await captureDashboardScreenshot({
      dashboardApi: api,
      files,
      createAttachmentId: () => 'image-1',
      sleep: async () => undefined,
    });

    expect(result).toEqual({
      ok: true,
      attachment: {
        id: 'image-1',
        type: 'image',
        description: 'Dashboard screenshot',
        data: {
          file_id: 'uploaded-1',
          name: 'dashboard-screenshot.png',
          mime_type: 'image/png',
        },
      },
    });
    expect(create).toHaveBeenCalled();
    expect(upload).toHaveBeenCalled();
    expect(layout$.getValue().sections.sec.collapsed).toBe(true);
  });

  it('restores collapsed sections when capture fails', async () => {
    const { api, layout$ } = createDashboardApi({ collapsed: true });
    const { files } = createFiles();
    toBlob.mockRejectedValue(new Error('boom'));

    const result = await captureDashboardScreenshot({
      dashboardApi: api,
      files,
      sleep: async () => undefined,
    });

    expect(result).toEqual({ ok: false, reason: 'clone_failed' });
    expect(layout$.getValue().sections.sec.collapsed).toBe(true);
  });

  it('fails when the grid is missing', async () => {
    document.body.innerHTML = '';
    const { api } = createDashboardApi();
    const { files } = createFiles();

    await expect(
      captureDashboardScreenshot({
        dashboardApi: api,
        files,
      })
    ).resolves.toEqual({ ok: false, reason: 'missing_grid' });
  });

  it('fails when panels never become ready', async () => {
    const { api } = createDashboardApi({ children: {} });
    (api.children$ as unknown as BehaviorSubject<Record<string, never>>).next({});
    const { files } = createFiles();
    let clock = 0;

    await expect(
      captureDashboardScreenshot({
        dashboardApi: api,
        files,
        now: () => clock,
        sleep: async (ms) => {
          clock += ms;
        },
      })
    ).resolves.toEqual({ ok: false, reason: 'timeout' });
    expect(api.layout$.getValue().sections.sec.collapsed).toBe(true);
  });
});
