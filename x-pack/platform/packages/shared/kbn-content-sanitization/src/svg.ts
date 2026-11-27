/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DOMWindow } from 'jsdom';
import { getFragmentId } from './href';
import { sanitizeWithInlinedStyles } from './inline_svg_styles';

const HREF_ATTRIBUTES: ReadonlySet<string> = new Set(['href', 'xlink:href']);
// Embedded raster images only: an SVG data URI would be a second document that escapes sanitization.
const RASTER_DATA_URI = /^data:image\/(?:png|jpe?g|gif|webp);base64,[\sA-Za-z0-9+/]+={0,2}$/i;
// Browsers render a copy of what each <use> references, so nested or repeated references let a small file
// make a page render far more than it contains. Registry icons stay far below both limits.
const MAX_USE_REFERENCES = 256;
const MAX_USE_COPIED_ELEMENTS = 10_000;

// Same-document references only where registry logos need them, e.g. <use href="#shape">; anything else could
// load a remote resource.
const FRAGMENT_HREF_TAGS: ReadonlySet<string> = new Set([
  'use',
  'lineargradient',
  'radialgradient',
]);

const isSafeHref = (tagName: string, value: string): boolean =>
  tagName === 'image'
    ? RASTER_DATA_URI.test(value)
    : FRAGMENT_HREF_TAGS.has(tagName) && getFragmentId(value) !== undefined;

const collectElements = (root: Element, window: DOMWindow): Element[] => {
  // Prototype method, because a parsed element can shadow a document's methods by name.
  const walker = window.Document.prototype.createTreeWalker.call(
    root.ownerDocument,
    root,
    window.NodeFilter.SHOW_ELEMENT
  );
  const elements: Element[] = [];
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    elements.push(node as Element);
  }
  return elements;
};

// Undefined when the copy would contain another <use>, which includes a <use> inside what it references.
const countCopiedElements = (
  target: Element,
  budget: number,
  window: DOMWindow
): number | undefined => {
  const walker = window.Document.prototype.createTreeWalker.call(
    target.ownerDocument,
    target,
    window.NodeFilter.SHOW_ELEMENT
  );
  let count = 0;
  for (let node: Node | null = target; node; node = walker.nextNode()) {
    count++;
    if (count > budget || (node as Element).localName === 'use') {
      return undefined;
    }
  }
  return count;
};

// Runs on the sanitized tree, so every target checked is the element the browser will find for that id.
const limitUseReferences = (root: Element, window: DOMWindow): void => {
  const uses: Element[] = [];
  const elementsById = new Map<string, Element>();
  for (const element of collectElements(root, window)) {
    if (element.localName === 'use') {
      uses.push(element);
    }

    const id = element.getAttribute('id');
    if (id && !elementsById.has(id)) {
      elementsById.set(id, element);
    }
  }

  // Undefined when a target is missing or its copy would exceed the budget.
  const countTargets = (ids: Set<string | undefined>, budget: number): number | undefined => {
    let total = 0;
    for (const id of ids) {
      const target = id === undefined ? undefined : elementsById.get(id);
      const count = target && countCopiedElements(target, budget - total, window);
      if (count === undefined) {
        return undefined;
      }
      total += count;
    }
    return total;
  };

  let references = 0;
  let copiedElements = 0;
  for (const use of uses) {
    const hrefs = Array.from(use.attributes).filter(({ localName }) => localName === 'href');
    if (hrefs.length === 0) {
      continue;
    }

    // An href and its xlink:href fallback that name the same target render it once.
    const targetIds = new Set(hrefs.map(({ value }) => getFragmentId(value)));
    const count =
      ++references <= MAX_USE_REFERENCES
        ? countTargets(targetIds, MAX_USE_COPIED_ELEMENTS - copiedElements)
        : undefined;
    // A <use> that loses its hrefs renders nothing, so only an allowed one is charged.
    if (count === undefined) {
      hrefs.forEach((href) => use.removeAttributeNode(href));
    } else {
      copiedElements += count;
    }
  }
};

export function isBase64Encoded(str: unknown): boolean {
  if (typeof str !== 'string' || str.length === 0) {
    return false;
  }

  try {
    // Check if the string can be converted to a Buffer with 'base64' encoding
    // and then back to base64, comparing it with the original.
    // This ensures it's a valid Base64 string and not just random characters.
    return Buffer.from(str, 'base64').toString('base64') === str;
  } catch (e) {
    return false;
  }
}

export function sanitizeSvg(svgContent: Buffer): Buffer {
  try {
    // Convert buffer to string
    const svgString = svgContent.toString('utf8');

    // Check if the content is base64 encoded
    let contentToSanitize = svgString;
    if (isBase64Encoded(svgString)) {
      try {
        const decoded = Buffer.from(svgString, 'base64').toString('utf8');
        // Simple verification that it looks like SVG content
        if (decoded.includes('<svg') || decoded.includes('<?xml')) {
          contentToSanitize = decoded;
        }
      } catch (decodeError) {
        // If decoding fails, use the original content
        return svgContent;
      }
    }

    // Create a DOM environment - both packages are loaded lazily to avoid paying
    // the ~494 CJS module startup cost in processes that never sanitize SVGs.
    // eslint-disable-next-line @kbn/compat/typescript-no-var-requires
    const { JSDOM } = require('jsdom') as typeof import('jsdom');
    // dompurify's CJS bundle uses `module.exports = purify` (no `default` key),
    // while its ESM bundle exposes the factory as `default`. Handle both shapes.
    // eslint-disable-next-line @kbn/compat/typescript-no-var-requires
    const dompurifyModule = require('dompurify') as
      | typeof import('dompurify')
      | (typeof import('dompurify'))['default'];
    const DOMPurify =
      typeof dompurifyModule === 'function'
        ? dompurifyModule
        : (dompurifyModule as typeof import('dompurify')).default;
    const window = new JSDOM('').window;
    const purify = DOMPurify(window);

    // Configure DOMPurify for SVG. RETURN_DOM lets the <use> limits run on the final tree; DOMPurify's own string
    // output is the same tree's innerHTML.
    purify.setConfig({
      USE_PROFILES: { svg: true, svgFilters: true },
      ADD_TAGS: ['svg', 'path', 'circle', 'rect', 'line', 'g', 'defs', 'use'],
      FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed', 'form', 'foreignObject'],
      FORBID_ATTR: [
        'onerror',
        'onload',
        'onclick',
        'onmouseover',
        'eval',
        'javascript',
        'formaction',
        'src',
        'data',
      ],
      RETURN_DOM: true,
    });
    purify.addHook('uponSanitizeAttribute', (node, data) => {
      if (HREF_ATTRIBUTES.has(data.attrName)) {
        data.keepAttr = isSafeHref(node.nodeName.toLowerCase(), data.attrValue);
      }
    });

    // Sanitize and convert the result back to a Buffer
    return Buffer.from(
      sanitizeWithInlinedStyles(contentToSanitize, window, (svg) => {
        // setConfig doesn't narrow the return type the way a per-call RETURN_DOM does.
        const body = purify.sanitize(svg) as unknown as Element | null;
        if (!body) {
          return '';
        }
        limitUseReferences(body, window);
        return body.innerHTML;
      }),
      'utf8'
    );
  } catch (error) {
    throw new Error(`SVG sanitization failed: ${error.message}`);
  }
}
