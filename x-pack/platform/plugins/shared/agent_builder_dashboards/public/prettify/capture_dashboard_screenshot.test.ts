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
import { CAPTURE_TIMEOUT_MS, captureDashboardScreenshot } from './capture_dashboard_screenshot';

jest.mock('dom-to-image-more', () => ({
  toCanvas: jest.fn(),
}));

const { toCanvas } = jest.requireMock('dom-to-image-more') as { toCanvas: jest.Mock };

const POLL_MS = 100;

const smallBlob = (type: string) => new Blob(['image-bytes'], { type });
const hugeBlob = (type: string) => new Blob([new Uint8Array(MAX_IMAGE_BYTES + 1)], { type });

const fakeCanvas = (blobsByType: Record<string, Blob>) => ({
  toBlob: (callback: (blob: Blob | null) => void, type: string) => {
    callback(blobsByType[type] ?? null);
  },
});

const createDashboardApi = ({ collapsed = false, panelCount = 0 } = {}) => {
  const layout$ = new BehaviorSubject({
    panels: Object.fromEntries(
      Array.from({ length: panelCount }, (_, index) => [`panel-${index}`, { grid: {} }])
    ),
    sections: { sec: { collapsed, title: 'Section', grid: { y: 0 } } },
    pinnedPanels: {},
  });
  return { api: { layout$ } as unknown as DashboardApi, layout$ };
};

const addRenderedPanel = (grid: HTMLElement) => {
  const panel = document.createElement('div');
  panel.setAttribute('data-test-subj', 'embeddablePanel');
  panel.setAttribute('data-render-complete', 'true');
  grid.appendChild(panel);
  return panel;
};

const createFiles = () => {
  const create = jest.fn().mockResolvedValue({ file: { id: 'file-1' } });
  const upload = jest.fn().mockResolvedValue(undefined);
  return {
    files: {
      filesClientFactory: {
        asScoped: jest.fn(() => ({ create, upload })),
      },
    } as unknown as FilesStart,
    upload,
  };
};

describe('captureDashboardScreenshot', () => {
  let grid: HTMLElement;

  beforeEach(() => {
    jest.useFakeTimers();
    grid = document.createElement('div');
    grid.setAttribute('data-shared-items-container', 'true');
    document.body.appendChild(grid);
    toCanvas.mockReset();
    toCanvas.mockResolvedValue(fakeCanvas({ 'image/png': smallBlob('image/png') }));
  });

  afterEach(() => {
    jest.useRealTimers();
    document.body.innerHTML = '';
  });

  it('uploads a PNG of the dashboard and returns an image attachment', async () => {
    const { api } = createDashboardApi();
    const { files, upload } = createFiles();

    const pending = captureDashboardScreenshot({ dashboardApi: api, files });
    await jest.advanceTimersByTimeAsync(POLL_MS);

    await expect(pending).resolves.toEqual({
      id: expect.any(String),
      type: 'image',
      description: 'Dashboard screenshot',
      data: {
        file_id: 'file-1',
        name: 'dashboard-screenshot.png',
        mime_type: 'image/png',
      },
    });
    expect(toCanvas).toHaveBeenCalledWith(grid, expect.any(Object));
    expect(upload).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'file-1', contentType: 'image/png' })
    );
  });

  it('waits until every panel is rendered before capturing', async () => {
    const { api } = createDashboardApi({ panelCount: 2 });
    const { files } = createFiles();
    addRenderedPanel(grid);

    const pending = captureDashboardScreenshot({ dashboardApi: api, files });
    await jest.advanceTimersByTimeAsync(POLL_MS * 4);
    expect(toCanvas).not.toHaveBeenCalled();

    addRenderedPanel(grid);
    await jest.advanceTimersByTimeAsync(POLL_MS);

    await expect(pending).resolves.toMatchObject({ type: 'image' });
    expect(toCanvas).toHaveBeenCalledTimes(1);
  });

  it('waits for visualizations that are still drawing after their data loaded', async () => {
    const { api } = createDashboardApi({ panelCount: 1 });
    const { files } = createFiles();
    const chart = document.createElement('div');
    chart.setAttribute('data-render-complete', 'false');
    addRenderedPanel(grid).appendChild(chart);

    const pending = captureDashboardScreenshot({ dashboardApi: api, files });
    await jest.advanceTimersByTimeAsync(POLL_MS * 4);
    expect(toCanvas).not.toHaveBeenCalled();

    chart.setAttribute('data-render-complete', 'true');
    await jest.advanceTimersByTimeAsync(POLL_MS);

    await expect(pending).resolves.toMatchObject({ type: 'image' });
  });

  it('rejects when panels never finish rendering', async () => {
    const { api } = createDashboardApi({ panelCount: 1 });
    const { files } = createFiles();

    const pending = captureDashboardScreenshot({ dashboardApi: api, files });
    const assertion = expect(pending).rejects.toThrow();
    await jest.advanceTimersByTimeAsync(CAPTURE_TIMEOUT_MS + POLL_MS);

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
    const { files } = createFiles();

    const pending = captureDashboardScreenshot({ dashboardApi: api, files });
    await jest.advanceTimersByTimeAsync(POLL_MS);

    await expect(pending).resolves.toMatchObject({
      data: { name: 'dashboard-screenshot.jpg', mime_type: 'image/jpeg' },
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
    const { files, upload } = createFiles();

    const pending = captureDashboardScreenshot({ dashboardApi: api, files });
    const assertion = expect(pending).rejects.toThrow('size limit');
    await jest.advanceTimersByTimeAsync(POLL_MS);

    await assertion;
    expect(upload).not.toHaveBeenCalled();
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
    await jest.advanceTimersByTimeAsync(POLL_MS);
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
    await jest.advanceTimersByTimeAsync(POLL_MS);

    await assertion;
    expect(layout$.getValue().sections.sec.collapsed).toBe(true);
  });

  it('leaves the layout untouched when no section is collapsed', async () => {
    const { api, layout$ } = createDashboardApi();
    const next = jest.spyOn(layout$, 'next');
    const { files } = createFiles();

    const pending = captureDashboardScreenshot({ dashboardApi: api, files });
    await jest.advanceTimersByTimeAsync(POLL_MS);
    await pending;

    expect(next).not.toHaveBeenCalled();
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
