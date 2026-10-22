/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { JSDOM } from 'jsdom';
import {
  setExplicitRect,
  installLayoutShim,
  installMatchMediaShim,
  installIntersectionObserverShim,
  installScrollShim,
  installPerformanceMarkShim,
} from './layout_shim';
import { ShimUsageLog } from './shim_usage_log';

describe('layout_shim', () => {
  const makeDom = () =>
    new JSDOM('<!doctype html><html><body><div id="a"><span></span></div></body></html>');

  describe('installLayoutShim', () => {
    it('reports an explicit rect for offsetWidth/Height, clientWidth/Height, and getBoundingClientRect', () => {
      const dom = makeDom();
      const usageLog = new ShimUsageLog();
      installLayoutShim(
        dom.window as unknown as { HTMLElement: { prototype: HTMLElement } },
        usageLog
      );

      const el = dom.window.document.getElementById('a') as HTMLElement;
      setExplicitRect(el, { width: 600, height: 300, top: 10, left: 5 });

      expect(el.offsetWidth).toBe(600);
      expect(el.offsetHeight).toBe(300);
      expect(el.clientWidth).toBe(600);
      expect(el.clientHeight).toBe(300);

      const rect = el.getBoundingClientRect();
      expect(rect.width).toBe(600);
      expect(rect.height).toBe(300);
      expect(rect.top).toBe(10);
      expect(rect.left).toBe(5);
      expect(rect.right).toBe(605);
      expect(rect.bottom).toBe(310);

      expect(usageLog.getEntries().some((e) => e.name === 'layout.explicitRect')).toBe(true);
    });

    it('inherits the nearest ancestor explicit rect', () => {
      const dom = makeDom();
      installLayoutShim(
        dom.window as unknown as { HTMLElement: { prototype: HTMLElement } },
        new ShimUsageLog()
      );

      const parent = dom.window.document.getElementById('a') as HTMLElement;
      // Deliberately `getElementsByTagName`, not `querySelector`: jsdom's native
      // `querySelector` goes through nwsapi, which this test's jsdom instance hasn't had
      // `jsdom_selector_compat`'s `installSelectorEngine` applied to (that's covered by
      // `jsdom_selector_compat.test.ts`; this test is only about the layout shim).
      const child = parent.getElementsByTagName('span')[0] as HTMLElement;
      setExplicitRect(parent, { width: 400, height: 200 });

      expect(child.offsetWidth).toBe(400);
      expect(child.offsetHeight).toBe(200);
    });

    it('falls back to 0 when nothing set an explicit rect', () => {
      const dom = makeDom();
      installLayoutShim(
        dom.window as unknown as { HTMLElement: { prototype: HTMLElement } },
        new ShimUsageLog()
      );
      const el = dom.window.document.getElementById('a') as HTMLElement;
      expect(el.offsetWidth).toBe(0);
      expect(el.getBoundingClientRect().width).toBe(0);
    });

    it('measures a leaf text-only element via measureText instead of falling back to 0 (Phase 5 Tier 6 finding: @kbn/flot-charts text.js valueLabel)', () => {
      const dom = makeDom();
      const usageLog = new ShimUsageLog();
      installLayoutShim(
        dom.window as unknown as { HTMLElement: { prototype: HTMLElement } },
        usageLog
      );

      const label = dom.window.document.createElement('div');
      label.className = 'valueLabel';
      label.textContent = '12,345';
      dom.window.document.body.appendChild(label);

      expect(label.offsetWidth).toBeGreaterThan(0);
      expect(label.offsetHeight).toBeGreaterThan(0);
      expect(label.getBoundingClientRect().width).toBe(label.offsetWidth);
      expect(usageLog.getEntries().some((e) => e.name === 'layout.measureTextFallback')).toBe(true);
    });

    it('does not use the text-measurement fallback for an element with child elements', () => {
      const dom = makeDom();
      installLayoutShim(
        dom.window as unknown as { HTMLElement: { prototype: HTMLElement } },
        new ShimUsageLog()
      );
      // `id="a"` has a child <span>; appending a text node alongside it (not overwriting via
      // `.textContent =`, which would replace the span) keeps a non-empty `textContent` on
      // an element that still has a child element, which must not get a text-measurement
      // estimate -- only an explicit rect (or an ancestor's) is a valid size source for an
      // element with children.
      const parent = dom.window.document.getElementById('a') as HTMLElement;
      parent.appendChild(dom.window.document.createTextNode('some text next to the span'));
      expect(parent.children).toHaveLength(1);
      expect(parent.offsetWidth).toBe(0);
    });

    it('falls back to the default font size/family when no inline font style is set', () => {
      const dom = makeDom();
      installLayoutShim(
        dom.window as unknown as { HTMLElement: { prototype: HTMLElement } },
        new ShimUsageLog()
      );
      const label = dom.window.document.createElement('div');
      label.textContent = 'x';
      dom.window.document.body.appendChild(label);
      // A single narrow glyph still measures to a small but nonzero width/height.
      expect(label.offsetWidth).toBeGreaterThan(0);
      expect(label.offsetHeight).toBeCloseTo(13 * 1.4, 5);
    });
  });

  it('installMatchMediaShim always reports no match', () => {
    const dom = makeDom();
    const usageLog = new ShimUsageLog();
    installMatchMediaShim(dom.window as unknown as { matchMedia?: unknown }, usageLog);
    const result = (dom.window as unknown as Window).matchMedia('(min-width: 100px)');
    expect(result.matches).toBe(false);
    expect(usageLog.getEntries().map((e) => e.name)).toContain('matchMedia');
  });

  it('installIntersectionObserverShim reports full intersection synchronously on observe', () => {
    const dom = makeDom();
    const usageLog = new ShimUsageLog();
    installLayoutShim(
      dom.window as unknown as { HTMLElement: { prototype: HTMLElement } },
      usageLog
    );
    installIntersectionObserverShim(
      dom.window as unknown as { IntersectionObserver?: unknown },
      usageLog
    );

    const el = dom.window.document.getElementById('a') as HTMLElement;
    const entries: IntersectionObserverEntry[] = [];
    const Observer = (
      dom.window as unknown as { IntersectionObserver: typeof IntersectionObserver }
    ).IntersectionObserver;
    const observer = new Observer((observed) => entries.push(...observed), {});
    observer.observe(el);

    expect(entries).toHaveLength(1);
    expect(entries[0].isIntersecting).toBe(true);
    expect(entries[0].intersectionRatio).toBe(1);
  });

  describe('installPerformanceMarkShim', () => {
    // Regression test for a real crash: `CoreSystem.reportKibanaLoadedEvent` calls
    // `performance.measure(...)` and reports the returned entry's `duration` as a
    // `performance_metric` analytics event. A no-op `measure` returning `undefined` made
    // that event fail schema validation with `duration: undefined`, and the resulting
    // rejected `AnalyticsClient.reportEvent()` promise went unhandled -- which crashed the
    // whole Kibana Node process, not just the render (confirmed live against a dev Kibana).
    it('measure() returns a real numeric duration computed from mark() timestamps', () => {
      const dom = new JSDOM('<!doctype html><html><body></body></html>');
      const usageLog = new ShimUsageLog();
      const { performance } = dom.window as unknown as { performance: Record<string, unknown> };
      // jsdom's `Performance` already implements `mark`/`measure` on some versions; delete
      // them so this test exercises the shim's own implementation regardless.
      delete performance.mark;
      delete performance.measure;
      delete performance.getEntriesByName;

      installPerformanceMarkShim(
        dom.window as unknown as { performance?: Record<string, unknown> },
        usageLog
      );

      const mark = performance.mark as (name: string) => void;
      const measure = performance.measure as (
        name: string,
        start?: string,
        end?: string
      ) => { duration: number };
      const getEntriesByName = performance.getEntriesByName as (
        name: string
      ) => Array<{ duration: number }>;

      mark('kbnStart');
      mark('kbnReady');
      const entry = measure('kbnLoad', 'kbnStart', 'kbnReady');

      expect(typeof entry.duration).toBe('number');
      expect(Number.isNaN(entry.duration)).toBe(false);
      expect(getEntriesByName('kbnLoad')).toEqual([entry]);
    });
  });

  it('installScrollShim no-ops scrollTo/scroll without throwing', () => {
    const dom = makeDom();
    const usageLog = new ShimUsageLog();
    installScrollShim(dom.window as unknown as { scrollTo?: unknown; scroll?: unknown }, usageLog);
    expect(() => (dom.window as unknown as Window).scrollTo(0, 100)).not.toThrow();
    expect(usageLog.getEntries().map((e) => e.name)).toContain('scrollTo');
  });
});
