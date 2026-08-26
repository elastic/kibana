/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { captureDashboardElementPng } from './capture_dashboard_element';

jest.mock('dom-to-image-more', () => ({
  toPng: jest.fn(),
}));

describe('captureDashboardElementPng', () => {
  const { toPng } = jest.requireMock('dom-to-image-more');

  beforeEach(() => {
    toPng.mockReset().mockResolvedValue('data:image/png;base64,AQID');
  });

  it('captures the full dashboard grid at native size as one PNG', async () => {
    const container = document.createElement('div');
    Object.defineProperty(container, 'scrollWidth', { value: 1200 });
    Object.defineProperty(container, 'scrollHeight', { value: 400 });

    const grid = document.createElement('div');
    grid.setAttribute('data-test-subj', 'kbnGridLayout');
    Object.defineProperty(grid, 'scrollWidth', { value: 1200 });
    Object.defineProperty(grid, 'scrollHeight', { value: 2400 });
    container.appendChild(grid);

    const blob = await captureDashboardElementPng(container);

    expect(blob.type).toBe('image/png');
    expect(toPng).toHaveBeenCalledTimes(1);
    expect(toPng).toHaveBeenCalledWith(
      container,
      expect.objectContaining({
        bgcolor: '#ffffff',
        width: 1200,
        height: 2400,
        style: expect.objectContaining({
          overflow: 'visible',
          width: '1200px',
          height: '2400px',
        }),
      })
    );
    expect(toPng.mock.calls[0][1].style.transform).toBeUndefined();
  });

  it('rejects SVG output', async () => {
    toPng.mockResolvedValue(
      'data:image/svg+xml;charset=utf-8,<svg xmlns="http://www.w3.org/2000/svg"/>'
    );
    const element = document.createElement('div');
    Object.defineProperty(element, 'scrollWidth', { value: 800 });
    Object.defineProperty(element, 'scrollHeight', { value: 600 });

    await expect(captureDashboardElementPng(element)).rejects.toThrow(/PNG|JPEG/i);
  });
});
