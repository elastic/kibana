/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { captureDashboardElementPng } from './capture_dashboard_element';

jest.mock('dom-to-image-more', () => ({
  toBlob: jest.fn(),
}));

describe('captureDashboardElementPng', () => {
  const { toBlob } = jest.requireMock('dom-to-image-more');

  beforeEach(() => {
    toBlob.mockReset().mockResolvedValue(new Blob(['png'], { type: 'image/png' }));
  });

  it('rasterizes the dashboard element to a PNG blob', async () => {
    const element = document.createElement('div');
    Object.defineProperty(element, 'scrollWidth', { value: 800 });
    Object.defineProperty(element, 'scrollHeight', { value: 600 });

    const blob = await captureDashboardElementPng(element);

    expect(blob.type).toBe('image/png');
    expect(toBlob).toHaveBeenCalledWith(
      element,
      expect.objectContaining({
        bgcolor: '#ffffff',
        width: 800,
        height: 600,
      })
    );
  });

  it('fails when the library cannot produce a PNG', async () => {
    toBlob.mockResolvedValue(null);
    const element = document.createElement('div');

    await expect(captureDashboardElementPng(element)).rejects.toThrow(/PNG/);
  });
});
