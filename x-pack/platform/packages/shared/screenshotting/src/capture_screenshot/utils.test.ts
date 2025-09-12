/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  waitForNoGlobalLoadingIndicator,
  getSelectorForUrl,
  waitForSelector,
  canvasToBlob,
} from './utils';

describe('waitForNoGlobalLoadingIndicator', () => {
  it('resolves immediately if doc is null', async () => {
    const result = await waitForNoGlobalLoadingIndicator(null, 1000, 100);
    expect(result).toBeUndefined();
  });

  it('resolves after stableFor ms with no loading indicator', async () => {
    const doc = document.implementation.createHTMLDocument();
    const start = Date.now();
    await waitForNoGlobalLoadingIndicator(doc, 1000, 200);
    expect(Date.now() - start).toBeGreaterThanOrEqual(200);
  });

  it('resolves after timeout if loading indicator never disappears', async () => {
    const doc = document.implementation.createHTMLDocument();
    const loading = doc.createElement('div');
    loading.setAttribute('data-test-subj', 'globalLoadingIndicator');
    doc.body.appendChild(loading);

    const start = Date.now();
    await waitForNoGlobalLoadingIndicator(doc, 500, 100);
    expect(Date.now() - start).toBeGreaterThanOrEqual(500);
  });

  it('waits until loading indicator is removed, then stableFor, then resolves', async () => {
    const doc = document.implementation.createHTMLDocument();
    const loading = doc.createElement('div');
    loading.setAttribute('data-test-subj', 'globalLoadingIndicator');
    doc.body.appendChild(loading);

    setTimeout(() => {
      doc.body.removeChild(loading);
    }, 200);

    const start = Date.now();
    await waitForNoGlobalLoadingIndicator(doc, 1000, 200);
    expect(Date.now() - start).toBeGreaterThanOrEqual(300);
  });
});

describe('getSelectorForUrl', () => {
  it('returns .kbnAppWrapper for certain app URLs', () => {
    expect(getSelectorForUrl('http://localhost:5601/app/discover')).toBe('.kbnAppWrapper');
    expect(getSelectorForUrl('http://localhost:5601/app/dashboards')).toBe('.kbnAppWrapper');
  });

  it('returns main for other URLs', () => {
    expect(getSelectorForUrl('http://localhost:5601/unknown')).toBe('main');
  });
});

describe('waitForSelector', () => {
  let iframe: HTMLIFrameElement;
  let iframeDoc: Document;

  beforeEach(() => {
    iframe = document.createElement('iframe');
    document.body.appendChild(iframe);
    iframeDoc = iframe.contentDocument!;
  });

  afterEach(() => {
    document.body.removeChild(iframe);
  });

  it('resolves with the element inside an iframe', async () => {
    const el = iframeDoc.createElement('div');
    el.className = 'inside-iframe';
    iframeDoc.body.appendChild(el);

    const found = await waitForSelector(iframe, '.inside-iframe', 100);
    expect(found).toBe(el);
  });

  it('resolves null if element not found in iframe', async () => {
    const found = await waitForSelector(iframe, '.not-found', 50);
    expect(found).toBeNull();
  });

  it('resolves with the element if found after a delay', async () => {
    setTimeout(() => {
      const el = iframeDoc.createElement('div');
      el.className = 'bar';
      iframeDoc.body.appendChild(el);
    }, 50);

    const found = await waitForSelector(iframe, '.bar', 200);
    expect(found).not.toBeNull();
    expect(found?.className).toBe('bar');
  });

  it('resolves null if not found within timeout', async () => {
    const found = await waitForSelector(iframe, '.baz', 50);
    expect(found).toBeNull();
  });
});

describe('canvasToBlob', () => {
  it('returns a blob from a canvas', async () => {
    const canvas = document.createElement('canvas');
    // Mock toBlob
    canvas.toBlob = (cb, type, quality) => {
      cb?.(new Blob(['test'], { type: 'image/png' }));
    };
    const blob = await canvasToBlob(canvas);
    expect(blob).toBeInstanceOf(Blob);
    expect(blob?.type).toBe('image/png');
  });

  it('throws error if toBlob fails', async () => {
    const canvas = document.createElement('canvas');
    canvas.toBlob = (cb, type, quality) => {
      cb?.(null);
    };
    await expect(canvasToBlob(canvas)).rejects.toEqual(new Error('failed to generate blob'));
  });
});
