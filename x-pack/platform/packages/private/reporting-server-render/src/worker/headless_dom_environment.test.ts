/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createHeadlessDomEnvironment, setExplicitSize } from './headless_dom_environment';
import { LoopbackHttpClient } from '../services/loopback_http_client';

// `url` is only honored alongside a `loopbackHttpClient` (see `createHeadlessDomEnvironment`'s
// doc comment: the non-navigating constructor branch never sets jsdom's URL at all), so the
// `WindowRequest` tests below need one even though they never call `.fetch()` on it.
const makeNavigatingEnv = (url: string) =>
  createHeadlessDomEnvironment({
    url,
    loopbackHttpClient: new LoopbackHttpClient({
      baseUrl: 'http://localhost:5601',
      forwardedHeaders: {},
    }),
  });

describe('headless_dom_environment', () => {
  describe('window Request/Response/Headers/streams globals', () => {
    it("resolves a relative URL against the page location, unlike Node's own Request", () => {
      const env = makeNavigatingEnv('http://localhost:5601/app/dashboards');
      try {
        const WindowRequest = (env.window as unknown as { Request: typeof Request }).Request;
        const request = new WindowRequest('/api/core/capabilities');
        expect(request.url).toBe('http://localhost:5601/api/core/capabilities');
      } finally {
        env.dispose();
      }
    });

    it('still accepts an already-absolute URL', () => {
      const env = makeNavigatingEnv('http://localhost:5601/app/dashboards');
      try {
        const WindowRequest = (env.window as unknown as { Request: typeof Request }).Request;
        const request = new WindowRequest('http://localhost:5601/api/status');
        expect(request.url).toBe('http://localhost:5601/api/status');
      } finally {
        env.dispose();
      }
    });

    it('exposes TextEncoder/TextDecoder/ReadableStream/WritableStream/TransformStream/PerformanceObserver on window', () => {
      const env = createHeadlessDomEnvironment();
      try {
        const win = env.window as unknown as Record<string, unknown>;
        for (const key of [
          'TextEncoder',
          'TextDecoder',
          'ReadableStream',
          'WritableStream',
          'TransformStream',
          'PerformanceObserver',
          'BroadcastChannel',
          'EventSource',
          'Worker',
          'Response',
          'Headers',
        ]) {
          expect(win[key]).toBeDefined();
        }
      } finally {
        env.dispose();
      }
    });

    it(
      'exposes Path2D/ImageData/DOMMatrix/DOMPoint/DOMRect on window, not just the host ' +
        "globalThis (confirmed live: jsdom's own window has none of these -- a navigated " +
        "bundle's bare `new Path2D(...)` call, e.g. Elastic Charts' annotation/icon-marker " +
        'drawing, threw `ReferenceError: Path2D is not defined` because `vm.runInContext` ' +
        "runs against `window` as the context global, not the host process's `globalThis` " +
        'that the `globals` array patches)',
      () => {
        const env = createHeadlessDomEnvironment();
        try {
          const win = env.window as unknown as Record<string, unknown>;
          for (const key of ['Path2D', 'ImageData', 'DOMMatrix', 'DOMPoint', 'DOMRect']) {
            expect(win[key]).toBeDefined();
          }
        } finally {
          env.dispose();
        }
      }
    );

    it(
      "accepts a window-realm AbortController's signal in a Request init without throwing " +
        "(confirmed live: data's SearchInterceptor passes " +
        '`new window.AbortController().signal` into `Fetch.createRequest`, which previously ' +
        'threw `TypeError: RequestInit: Expected signal ("AbortSignal {}") to be an instance ' +
        "of AbortSignal` because jsdom's own vm-context-intrinsic AbortSignal differs from " +
        "the host realm's, which `WindowRequest`'s underlying `NativeRequest` validates " +
        'against -- `WindowRequest` now drops `signal` before constructing `NativeRequest` ' +
        'rather than forwarding it)',
      () => {
        const env = makeNavigatingEnv('http://localhost:5601/app/dashboards');
        try {
          const WindowAbortController = (
            env.window as unknown as { AbortController: typeof AbortController }
          ).AbortController;
          const WindowRequest = (env.window as unknown as { Request: typeof Request }).Request;
          const controller = new WindowAbortController();

          expect(
            () =>
              new WindowRequest('http://localhost:5601/api/status', { signal: controller.signal })
          ).not.toThrow();
        } finally {
          env.dispose();
        }
      }
    );

    it("never throws constructing or using a BroadcastChannel (Tier 5 finding: the security plugin's SessionTimeout service constructs one unconditionally)", () => {
      const env = createHeadlessDomEnvironment();
      try {
        const BroadcastChannelCtor = (
          env.window as unknown as { BroadcastChannel: new (name: string) => BroadcastChannel }
        ).BroadcastChannel;
        const channel = new BroadcastChannelCtor('session-timeout');
        expect(() => channel.postMessage({ type: 'ping' })).not.toThrow();
        expect(() => channel.close()).not.toThrow();
      } finally {
        env.dispose();
      }
    });
  });

  describe('FakeResizeObserver', () => {
    it('reports contentRect and the modern borderBoxSize/contentBoxSize entry shape', () => {
      const env = createHeadlessDomEnvironment();
      try {
        const el = env.document.createElement('div');
        setExplicitSize(el, { width: 640, height: 480 });

        let observedEntries: ResizeObserverEntry[] | undefined;
        const observer = new env.window.ResizeObserver((entries) => {
          observedEntries = entries;
        });
        observer.observe(el);

        expect(observedEntries).toHaveLength(1);
        const [entry] = observedEntries!;
        expect(entry.contentRect).toMatchObject({ width: 640, height: 480 });
        // EUI's resize-observer wrapper reads `entries[0].borderBoxSize[0]` unconditionally;
        // an entry shaped like only `contentRect` (the pre-fix shape) throws there.
        expect(
          (entry as unknown as { borderBoxSize: Array<{ inlineSize: number; blockSize: number }> })
            .borderBoxSize[0]
        ).toEqual({ inlineSize: 640, blockSize: 480 });
        expect(
          (entry as unknown as { contentBoxSize: Array<{ inlineSize: number; blockSize: number }> })
            .contentBoxSize[0]
        ).toEqual({ inlineSize: 640, blockSize: 480 });
      } finally {
        env.dispose();
      }
    });

    describe('FakeResizeObserver nearest-ancestor sizing', () => {
      it('reports the nearest ancestor rect, and nothing (with a log entry) when there is none', () => {
        const env = createHeadlessDomEnvironment();
        try {
          const parent = env.document.createElement('div');
          const child = env.document.createElement('span');
          parent.appendChild(child);
          const callback = jest.fn();
          const observer = new env.window.ResizeObserver(callback);

          observer.observe(child);
          expect(callback).not.toHaveBeenCalled();
          expect(env.usageLog.getEntries().map((e) => e.name)).toContain('ResizeObserver.noRect');

          // A rect assigned to the ancestor re-fires the already-observed descendant, once.
          setExplicitSize(parent, { width: 300, height: 200 });
          expect(callback).toHaveBeenCalledTimes(1);
          expect(callback.mock.calls[0][0][0].contentRect).toMatchObject({
            width: 300,
            height: 200,
          });

          // An unrelated subtree is not re-fired.
          setExplicitSize(env.document.createElement('div'), { width: 1, height: 1 });
          expect(callback).toHaveBeenCalledTimes(1);
        } finally {
          env.dispose();
        }
      });
    });

    describe('canvas backing size', () => {
      it('follows width/height property and attribute changes, and keeps the context usable', () => {
        const env = createHeadlessDomEnvironment();
        try {
          const canvas = env.document.createElement('canvas');
          canvas.width = 1;
          canvas.height = 1;
          const ctx = canvas.getContext('2d')!;
          expect(env.getBackingCanvas(canvas)).toMatchObject({ width: 1, height: 1 });

          canvas.width = 120;
          canvas.height = 80;
          expect(env.getBackingCanvas(canvas)).toMatchObject({ width: 120, height: 80 });

          canvas.setAttribute('width', '200');
          canvas.setAttribute('height', '90');
          expect(env.getBackingCanvas(canvas)).toMatchObject({ width: 200, height: 90 });

          // The context obtained before the resizes still draws onto the resized surface.
          (ctx as CanvasRenderingContext2D).fillStyle = '#ff0000';
          (ctx as CanvasRenderingContext2D).fillRect(0, 0, 200, 90);
          const pixel = (
            env.getBackingCanvas(canvas)!.getContext('2d') as unknown as CanvasRenderingContext2D
          ).getImageData(100, 45, 1, 1).data;
          expect(Array.from(pixel)).toEqual([255, 0, 0, 255]);
        } finally {
          env.dispose();
        }
      });
    });
  });
});
