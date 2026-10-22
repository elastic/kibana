/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Collects the raw CSS a booted Kibana page is styled with, in cascade order.
 *
 * Three sources, none of which is the `<style data-emotion>` text this package used to read:
 * Kibana's Emotion caches run `speedy: true`, so rules go in through `CSSStyleSheet.
 * insertRule` and the `<style>` element's text stays empty (that read returned ~115 bytes
 * on a dashboard styled by ~490KB of CSS). And jsdom's own `cssRules` can't stand in:
 * `cssom` silently drops what it can't parse. So:
 *
 * 1. `<link rel="stylesheet">`: the raw body `LoopbackResourceLoader` already fetched.
 * 2. `<style>` with text: its `textContent`.
 * 3. Speedy Emotion `<style>`: the rule strings recorded as they were passed to `insertRule`.
 */

type RuleListOwner = object;

const recordedRules = new WeakMap<RuleListOwner, string[]>();
let recorderInstalled = false;

/**
 * Wraps `CSSStyleSheet.prototype.insertRule`/`deleteRule` to keep each sheet's rule text
 * verbatim. `cssom`'s `CSSStyleSheet` is one class shared by every jsdom window in the
 * process, so this is installed once; sheets are keyed weakly, so it holds nothing alive.
 */
export const installStyleSheetRecorder = (): void => {
  if (recorderInstalled) return;
  recorderInstalled = true;
  // eslint-disable-next-line @typescript-eslint/no-var-requires, import/order
  const { JSDOM } = require('jsdom') as typeof import('jsdom');
  const probe = new JSDOM('<style></style>');
  const sheet = probe.window.document.getElementsByTagName('style')[0].sheet as unknown as {
    constructor: { prototype: Record<string, (...args: unknown[]) => unknown> };
  };
  const proto = sheet.constructor.prototype;
  probe.window.close();

  const originalInsert = proto.insertRule;
  const originalDelete = proto.deleteRule;

  proto.insertRule = function (this: RuleListOwner, rule: unknown, index: unknown) {
    let list = recordedRules.get(this);
    if (!list) {
      list = [];
      recordedRules.set(this, list);
    }
    const at = typeof index === 'number' ? Math.min(Math.max(index, 0), list.length) : 0;
    // Recorded before the call: `cssom` is stricter than a browser and throws on some valid
    // rules, which a real browser (what Emotion was written for) would have accepted.
    list.splice(at, 0, String(rule));
    return originalInsert.call(this, rule, index);
  };
  proto.deleteRule = function (this: RuleListOwner, index: unknown) {
    const list = recordedRules.get(this);
    if (list && typeof index === 'number') list.splice(index, 1);
    return originalDelete.call(this, index);
  };
};

/** Test hook: rules recorded for a stylesheet object. */
export const getRecordedRules = (sheet: RuleListOwner): string[] => recordedRules.get(sheet) ?? [];

export interface PageCss {
  /** Where each stylesheet came from, for diagnostics. */
  source: string;
  css: string;
}

/**
 * Every stylesheet on the page, in document order (which is cascade order for equal
 * specificity). Walks the DOM with `getElementsByTagName`, not a selector: see
 * `render_elastic_charts_to_png.ts` on staying clear of the selector engine.
 */
export const collectPageCss = (env: {
  document: Document;
  getFetchedStylesheet: (url: string) => string | undefined;
}): PageCss[] => {
  const out: PageCss[] = [];
  for (const element of Array.from(env.document.getElementsByTagName('*'))) {
    const tag = element.localName;
    if (tag === 'link' && (element.getAttribute('rel') ?? '').toLowerCase() === 'stylesheet') {
      const href = (element as HTMLLinkElement).href;
      const css = env.getFetchedStylesheet(href);
      if (css) out.push({ source: `link:${href}`, css });
    } else if (tag === 'style') {
      const text = element.textContent ?? '';
      const recorded = getRecordedRules((element as HTMLStyleElement).sheet as RuleListOwner);
      const css = [text, ...recorded].filter(Boolean).join('\n');
      if (css) {
        out.push({
          source: element.hasAttribute('data-emotion')
            ? `emotion:${element.getAttribute('data-emotion')}`
            : 'style',
          css,
        });
      }
    }
  }
  return out;
};
