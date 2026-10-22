/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable @typescript-eslint/no-var-requires */

/**
 * Headless Kibana client worker plan, phase 1: compatibility shim that makes jsdom's
 * selector engine safe under Kibana's packaged `--disallow-code-generation-from-strings`
 * V8 flag.
 *
 * jsdom's native `querySelector`/`querySelectorAll`/`matches`/`closest` (and several
 * internal helpers that call them without going through the public DOM API, see below)
 * are backed by `nwsapi`, which always compiles a matcher function with `new
 * Function(...)` -- there is no config flag in nwsapi to use an interpreted fallback
 * instead. Verified directly: loading a real built Kibana bundle
 * (`target/public/bundles/kibana.bundle.js`) in jsdom under the flag throws inside
 * `nwsapi.compile`, reached both through `document.baseURI`'s internal `<base>`-tag lookup
 * and through any ordinary `document.querySelectorAll(realSelector)` call.
 *
 * This file closes both gaps:
 *
 * 1. {@link patchJsdomBaseUrlResolution} -- a require-cache patch of jsdom's internal
 *    `living/helpers/document-base-url.js` module. Every jsdom-internal consumer of it
 *    (`HTMLScriptElement-impl`, `HTMLLinkElement-impl`, `HTMLHyperlinkElementUtils-impl`,
 *    `HTMLBaseElement-impl`, `HTMLStyleElement-impl`, `Node-impl`'s `baseURI` getter) calls
 *    `document.querySelector("base[href]")` to resolve relative URLs against a possible
 *    `<base>` element, bypassing any monkeypatch of the *public* `Document.prototype`
 *    (jsdom has a public "wrapper" layer and an internal "impl" layer; these call the impl
 *    directly). Kibana never injects a `<base href>` tag, so this patch treats every
 *    document as having none and resolves straight to the fallback base URL -- functionally
 *    identical for Kibana's case, and a narrow, auditable scope (one helper module) rather
 *    than reimplementing URL resolution generally.
 *
 *    **Must be applied before `jsdom` is required anywhere in the process**: jsdom's
 *    internal modules destructure the functions they need from this module at `require`
 *    time (`const { parseURLToResultingURLRecord } = require(...)`), so patching the
 *    module's `exports` object only takes effect for requires that happen afterward. This
 *    worker package's entry point calls this function first, before importing `jsdom`.
 *
 * 2. {@link installSelectorEngine} -- replaces `Document.prototype`/`Element.prototype`'s
 *    `querySelector`, `querySelectorAll`, `matches`, and `closest` on a given jsdom window
 *    with implementations backed by `css-select`/`css-what` (already transitive
 *    dependencies; confirmed by inspection to contain no `new Function`/`eval` anywhere in
 *    their source). This covers every *application-level* selector call -- Kibana's own
 *    code, EUI, Elastic Charts, and any other bundled library -- which (1) does not reach.
 *    Call this once per `window` after creating it.
 */

let baseUrlPatchApplied = false;
let baseUrlPatchSkippedTooLate = false;

/**
 * Patches jsdom's internal base-URL resolution helper via the require cache. Idempotent.
 *
 * If `jsdom` has already been required elsewhere in this process by the time this runs, the
 * patch is too late to take effect for jsdom's own internal consumers (they already
 * destructured the unpatched functions) -- this is logged rather than thrown, since the
 * selector-engine half of this shim ({@link installSelectorEngine}) still closes the
 * application-level half of the gap regardless, and a prototype worker sharing a process
 * with something else that already needed jsdom (e.g. an unrelated Jest-environment-jsdom
 * test in the same worker) should degrade, not crash.
 */
export const patchJsdomBaseUrlResolution = (): void => {
  if (baseUrlPatchApplied || baseUrlPatchSkippedTooLate) return;

  if (require.cache[require.resolve('jsdom')]) {
    baseUrlPatchSkippedTooLate = true;
    // eslint-disable-next-line no-console
    console.warn(
      '[reporting-server-render] jsdom was already loaded before patchJsdomBaseUrlResolution() ' +
        'ran; document.baseURI and <script src="">/<img>/<link> URL resolution will still use ' +
        'nwsapi and can throw under --disallow-code-generation-from-strings. Import ' +
        '`jsdom_selector_compat` before any other module that imports `jsdom` to fix this.'
    );
    return;
  }

  const modulePath = require.resolve('jsdom/lib/jsdom/living/helpers/document-base-url.js');
  const real = require(modulePath);
  const whatwgURL = require('whatwg-url');

  const patched = {
    ...real,
    documentBaseURL: (document: unknown) => real.fallbackBaseURL(document),
    documentBaseURLSerialized: (document: unknown) =>
      whatwgURL.serializeURL(real.fallbackBaseURL(document)),
    parseURLToResultingURLRecord: (url: string, document: unknown) =>
      whatwgURL.parseURL(url, { baseURL: real.fallbackBaseURL(document) }),
  };

  require.cache[modulePath]!.exports = patched;
  baseUrlPatchApplied = true;
};

// Applied as an import-time side effect so the ordering described above only requires
// importing this module before `jsdom` anywhere else in the same file / process, rather
// than requiring every call site to remember to call this function explicitly.
patchJsdomBaseUrlResolution();

/** Minimal `css-select` Adapter backed by plain DOM APIs; works against real jsdom nodes. */
const createDomAdapter = () => {
  const getChildren = (node: Node): Node[] => Array.prototype.slice.call(node.childNodes || []);
  const isTag = (node: Node): node is Element => node.nodeType === 1;

  const findAll = (test: (el: Element) => boolean, nodes: Node[]): Element[] => {
    const out: Element[] = [];
    const walk = (node: Node) => {
      for (const child of getChildren(node)) {
        if (isTag(child) && test(child)) out.push(child);
        walk(child);
      }
    };
    nodes.forEach(walk);
    return out;
  };

  const findOne = (test: (el: Element) => boolean, nodes: Node[]): Element | null => {
    for (const node of nodes) {
      for (const child of getChildren(node)) {
        if (isTag(child) && test(child)) return child;
        const found = findOne(test, [child]);
        if (found) return found;
      }
    }
    return null;
  };

  return {
    isTag,
    existsOne: (test: (el: Element) => boolean, elems: Node[]): boolean =>
      findOne(test, elems) !== null,
    getAttributeValue: (elem: Element, name: string) =>
      elem.hasAttribute(name) ? elem.getAttribute(name) ?? undefined : undefined,
    getChildren,
    getName: (elem: Element) => elem.tagName.toLowerCase(),
    getParent: (node: Element) => node.parentElement,
    getSiblings: (node: Node) =>
      node.parentNode ? Array.prototype.slice.call(node.parentNode.childNodes) : [node],
    getText: (node: Node) => node.textContent || '',
    hasAttrib: (elem: Element, name: string) => elem.hasAttribute(name),
    removeSubsets: (nodes: Node[]) =>
      nodes.filter(
        (n, i) => !nodes.some((other, j) => i !== j && other !== n && other.contains?.(n))
      ),
    findAll,
    findOne,
  };
};

/**
 * Replaces this window's native (nwsapi-backed) `querySelector`/`querySelectorAll`/
 * `matches`/`closest` with `css-select`-backed implementations that never call `new
 * Function`. Call once per jsdom window, after creation.
 */
export const installSelectorEngine = (window: { Document: unknown; Element: unknown }): void => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const cssSelect = require('css-select');
  const adapter = createDomAdapter();

  const DocumentProto = (window.Document as { prototype: Document }).prototype;
  const ElementProto = (window.Element as { prototype: Element }).prototype;

  DocumentProto.querySelector = function (this: Document, selector: string) {
    return cssSelect.selectOne(selector, [this.documentElement], { adapter });
  } as Document['querySelector'];
  DocumentProto.querySelectorAll = function (this: Document, selector: string) {
    const matches = cssSelect.selectAll(selector, [this.documentElement], { adapter });
    return matches as unknown as NodeListOf<Element>;
  } as Document['querySelectorAll'];
  ElementProto.querySelector = function (this: Element, selector: string) {
    return cssSelect.selectOne(selector, [this], { adapter });
  } as Element['querySelector'];
  ElementProto.querySelectorAll = function (this: Element, selector: string) {
    const matches = cssSelect.selectAll(selector, [this], { adapter });
    return matches as unknown as NodeListOf<Element>;
  } as Element['querySelectorAll'];
  ElementProto.matches = function (this: Element, selector: string) {
    return cssSelect.is(this, selector, { adapter });
  } as Element['matches'];
  ElementProto.closest = function (this: Element, selector: string) {
    let el: Element | null = this;
    while (el) {
      if (cssSelect.is(el, selector, { adapter })) return el;
      el = el.parentElement;
    }
    return null;
  } as Element['closest'];
};
