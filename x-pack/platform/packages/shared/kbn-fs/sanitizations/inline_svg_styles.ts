/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DOMWindow } from 'jsdom';

// Limits keep the synchronous pre-pass cheap on hostile input; registry icons stay far below each one.
const MAX_STYLE_TEXT_LENGTH = 16_384;
const MAX_STYLE_RULES = 256;
const MAX_VALUE_LENGTH = 64;
const MAX_DASH_ARRAY_ENTRIES = 16;
const MAX_RESOLUTION_STEPS = 20_000;
const MAX_ADDED_ATTRIBUTE_BYTES = 65_536;

// CSS numbers need a digit after the decimal point: `1.5` and `.5` are valid, `1.` is not.
const NUMERIC = String.raw`(?:\d+(?:\.\d+)?|\.\d+)`;
const NUMBER = new RegExp(`^${NUMERIC}$`);
const PERCENTAGE = new RegExp(`^${NUMERIC}%$`);
const LENGTH = new RegExp(`^${NUMERIC}(?:px|%)?$`, 'i');
const HEX_COLOR = /^#(?:[\da-f]{3,4}|[\da-f]{6}|[\da-f]{8})$/i;
// Same-document references only, e.g. url(#GreenGradient); anything else could load a remote resource.
const LOCAL_REFERENCE = /^url\(\s*#[\w-]+\s*\)$/;
const CLASS_SELECTOR = /^\.(-?[_a-zA-Z][\w-]*)$/;
const SVG_TYPE_SELECTOR = 'svg';
const STYLE_TAG = /<style[\s>]/i;
const CSS_COMMENT = /\/\*[\s\S]*?\*\//g;
// Strings and escapes can hide braces and semicolons from the parser below. Only printable ASCII and CSS
// whitespace are allowed, so JavaScript's wider \s, trim() and toLowerCase() agree with CSS tokenization.
const UNSUPPORTED_CSS_CHARACTERS = /["'\\]|[^\t\n\f\r -~]/;
// CSS never reads comments, blocks or declaration ends inside url(), so its contents may not look like any.
const URL_TOKEN = /url\([^;{}()[\]*]*\)/gi;
const URL_FUNCTION = /url\(/i;
// A `;` or `}` nested in parentheses or brackets does not end a declaration, but the parser below would split on it.
const GROUPING = /[()[\]]/;
// HTML splits class attributes on ASCII whitespace only.
const ASCII_WHITESPACE = /[\t\n\f\r ]+/;
const CSS_WHITESPACE_EDGES = /^[\t\n\f\r ]+|[\t\n\f\r ]+$/g;
const SVG_NAMESPACE = 'http://www.w3.org/2000/svg';
// On these elements `fill` means freeze or remove, and nothing they contain is rendered.
const ANIMATION_ELEMENTS: ReadonlySet<string> = new Set([
  'animate',
  'animatecolor',
  'animatemotion',
  'animatetransform',
  'set',
]);
// Statements that cannot style elements when the SVG is rendered as an image. `@namespace` is not one:
// a default namespace changes which elements class selectors match.
const IGNORED_STATEMENT_AT_RULES: ReadonlySet<string> = new Set(['import']);
// Blocks that never style elements; conditional or cascade-changing blocks (@media, @supports, @layer, …) fall back.
const IGNORED_BLOCK_AT_RULES: ReadonlySet<string> = new Set([
  'page',
  'font-face',
  'keyframes',
  'counter-style',
  'property',
]);
const AT_RULE_NAME = /@([a-zA-Z-]+)/y;

type Grammar = (value: string) => boolean;

const isKeyword =
  (...keywords: readonly string[]): Grammar =>
  (value) =>
    keywords.includes(value.toLowerCase());
const isNone = isKeyword('none');
const isPaint: Grammar = (value) =>
  isNone(value) || HEX_COLOR.test(value) || LOCAL_REFERENCE.test(value);
const isDashArray: Grammar = (value) => {
  if (isNone(value)) {
    return true;
  }
  const entries = value.split(/\s*,\s*|\s+/);
  return entries.length <= MAX_DASH_ARRAY_ENTRIES && entries.every((entry) => LENGTH.test(entry));
};

// Covers the value forms registry icons use; any other value for these properties makes the whole SVG fall back.
const PROPERTY_GRAMMARS: ReadonlyMap<string, Grammar> = new Map<string, Grammar>([
  ['fill', isPaint],
  ['stroke', isPaint],
  ['stroke-width', (value) => LENGTH.test(value)],
  ['stroke-miterlimit', (value) => NUMBER.test(value) && Number(value) >= 1],
  ['stroke-dasharray', isDashArray],
  ['stroke-linejoin', isKeyword('miter', 'round', 'bevel')],
  ['opacity', (value) => NUMBER.test(value) || PERCENTAGE.test(value)],
  ['fill-rule', isKeyword('nonzero', 'evenodd')],
  ['clip-rule', isKeyword('nonzero', 'evenodd')],
  ['clip-path', (value) => isNone(value) || LOCAL_REFERENCE.test(value)],
]);

interface StyleRule {
  readonly selectorText: string;
  readonly declarations: ReadonlyArray<readonly [property: string, value: string]>;
}

interface Declaration {
  readonly property: string;
  readonly value: string;
  // A class selector (1) beats the `svg` type selector (0); within the same specificity, later rules win.
  readonly specificity: number;
  readonly order: number;
}

// Winning declaration per selector key (`.name` or `svg`) and property.
type DeclarationsBySelector = Map<string, Map<string, Declaration>>;

const isDefined = (key: string | undefined): key is string => key !== undefined;

const outranks = (candidate: Declaration, current: Declaration): boolean =>
  candidate.specificity !== current.specificity
    ? candidate.specificity > current.specificity
    : candidate.order > current.order;

// Unicode-aware toLowerCase() folds characters such as the Kelvin sign that browsers compare as distinct.
const toAsciiLowerCase = (value: string): string =>
  value.replace(/[A-Z]/g, (letter) => letter.toLowerCase());

// `ignored` styles never apply on screen (non-CSS types, print-only); `unsupported` ones might, so they fall back.
const classifyStyleElement = (styleElement: Element): 'css' | 'ignored' | 'unsupported' => {
  // Browsers compare type without trimming, so " text/css " is not CSS.
  const type = toAsciiLowerCase(styleElement.getAttribute('type') ?? '');
  if (!['', 'text/css'].includes(type)) {
    return 'ignored';
  }
  // A titled stylesheet may belong to an alternate set that the browser leaves disabled.
  if (styleElement.getAttribute('title')) {
    return 'unsupported';
  }
  const media = toAsciiLowerCase(
    (styleElement.getAttribute('media') ?? '').replace(CSS_WHITESPACE_EDGES, '')
  );
  if (['', 'all', 'screen'].includes(media)) {
    return 'css';
  }
  return media === 'print' ? 'ignored' : 'unsupported';
};

// Maps a selector to the key used to look up declarations: `.name` for classes, `svg` for the type selector.
const toSelectorKey = (selector: string): string | undefined => {
  if (selector.toLowerCase() === SVG_TYPE_SELECTOR) {
    return SVG_TYPE_SELECTOR;
  }
  const match = CLASS_SELECTOR.exec(selector);
  return match ? `.${match[1]}` : undefined;
};

// Returns the position after an ignorable `@import …;` statement or `@keyframes … { … }` block, or
// undefined for any at-rule that could style elements.
const skipAtRule = (text: string, start: number): number | undefined => {
  AT_RULE_NAME.lastIndex = start;
  const name = AT_RULE_NAME.exec(text)?.[1].toLowerCase() ?? '';
  const semicolonIndex = text.indexOf(';', start);
  const openIndex = text.indexOf('{', start);
  if (openIndex === -1 || (semicolonIndex !== -1 && semicolonIndex < openIndex)) {
    return semicolonIndex === -1 || !IGNORED_STATEMENT_AT_RULES.has(name)
      ? undefined
      : semicolonIndex + 1;
  }
  if (!IGNORED_BLOCK_AT_RULES.has(name) || text.slice(start, openIndex).includes('}')) {
    return undefined;
  }

  let depth = 0;
  for (let index = openIndex; index < text.length; index++) {
    if (text[index] === '{') {
      depth++;
    } else if (text[index] === '}') {
      depth--;
      if (depth === 0) {
        return index + 1;
      }
    }
  }
  return undefined;
};

const parseDeclarations = (body: string): StyleRule['declarations'] | undefined => {
  const declarations: Array<readonly [string, string]> = [];
  for (const declaration of body.split(';')) {
    if (declaration.trim() === '') {
      continue;
    }
    const colonIndex = declaration.indexOf(':');
    if (colonIndex === -1) {
      return undefined;
    }
    declarations.push([
      declaration.slice(0, colonIndex).trim().toLowerCase(),
      declaration.slice(colonIndex + 1).trim(),
    ]);
  }
  return declarations;
};

// A strict parser for the supported subset. jsdom's CSSOM is not an option: attaching a <style> runs its
// selector engine, which compiles selectors with `new Function`, and Kibana disallows code generation from strings.
// At-rules are skipped; anything else unexpected returns undefined so the whole SVG falls back.
const parseStyleRules = (cssText: string): StyleRule[] | undefined => {
  if (URL_FUNCTION.test(cssText.replace(URL_TOKEN, ' '))) {
    return undefined;
  }
  const text = cssText.replace(CSS_COMMENT, ' ');
  if (
    text.includes('/*') ||
    UNSUPPORTED_CSS_CHARACTERS.test(text) ||
    GROUPING.test(text.replace(URL_TOKEN, ' '))
  ) {
    return undefined;
  }

  const rules: StyleRule[] = [];
  let position = 0;
  while (position < text.length) {
    if (/\s/.test(text[position])) {
      position++;
      continue;
    }

    if (text[position] === '@') {
      const next = skipAtRule(text, position);
      if (next === undefined) {
        return undefined;
      }
      position = next;
      continue;
    }

    const openIndex = text.indexOf('{', position);
    const closeIndex = openIndex === -1 ? -1 : text.indexOf('}', openIndex);
    if (closeIndex === -1) {
      return undefined;
    }
    const selectorText = text.slice(position, openIndex);
    const body = text.slice(openIndex + 1, closeIndex);
    const declarations = parseDeclarations(body);
    if (selectorText.includes('}') || body.includes('{') || !declarations) {
      return undefined;
    }
    rules.push({ selectorText: selectorText.trim(), declarations });
    position = closeIndex + 1;
  }
  return rules;
};

// Returns the winning declaration per selector and property, or undefined when the CSS is outside the supported subset.
const collectDeclarations = (cssTexts: readonly string[]): DeclarationsBySelector | undefined => {
  const rules: StyleRule[] = [];
  for (const cssText of cssTexts) {
    const parsedRules = parseStyleRules(cssText);
    if (!parsedRules) {
      return undefined;
    }
    rules.push(...parsedRules);
  }
  if (rules.length > MAX_STYLE_RULES) {
    return undefined;
  }

  const declarationsBySelector: DeclarationsBySelector = new Map();
  for (const [order, { selectorText, declarations: ruleDeclarations }] of rules.entries()) {
    const selectorKeys = selectorText.split(',').map((selector) => toSelectorKey(selector.trim()));
    if (!selectorKeys.every(isDefined)) {
      return undefined;
    }
    const uniqueSelectorKeys = new Set(selectorKeys);

    for (const [property, value] of ruleDeclarations) {
      // The `all` shorthand resets every supported property, so it cannot be skipped like the others.
      if (property === 'all') {
        return undefined;
      }
      const grammar = PROPERTY_GRAMMARS.get(property);
      // Other unsupported properties are never written, so skipping them cannot change another property's winner.
      if (!grammar) {
        continue;
      }
      // Skipping an unsupported value could let an earlier declaration win instead, so fall back entirely.
      if (value.length > MAX_VALUE_LENGTH || !grammar(value)) {
        return undefined;
      }
      for (const selectorKey of uniqueSelectorKeys) {
        const specificity = selectorKey === SVG_TYPE_SELECTOR ? 0 : 1;
        const declarations =
          declarationsBySelector.get(selectorKey) ?? new Map<string, Declaration>();
        // Rules are visited in source order, so a later declaration for the same selector always wins.
        declarations.set(property, { property, value, specificity, order });
        declarationsBySelector.set(selectorKey, declarations);
      }
    }
  }
  return declarationsBySelector;
};

// A single linear pass. querySelectorAll compiles selectors with `new Function`, and iterating jsdom's live
// getElementsByTagName collection is quadratic in the number of elements.
const collectElements = (svgDocument: Document, window: DOMWindow): Element[] => {
  const walker = svgDocument.createTreeWalker(svgDocument, window.NodeFilter.SHOW_ELEMENT);
  const elements: Element[] = [];
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    if (node instanceof window.Element) {
      elements.push(node);
    }
  }
  return elements;
};

// HTML parsing ignores xmlns, but in the XML file a foreign default namespace takes an element and its
// descendants out of SVG (Illustrator's `<sfw xmlns="ns_sfw;">` metadata, for example). Elements arrive in
// document order, so each parent is classified before its children.
const collectForeignElements = (elements: readonly Element[]): ReadonlySet<Element> => {
  const foreignElements = new Set<Element>();
  for (const element of elements) {
    const namespace = element.getAttribute('xmlns');
    const { parentElement } = element;
    const isForeign =
      namespace === null
        ? parentElement !== null && foreignElements.has(parentElement)
        : namespace !== SVG_NAMESPACE;
    if (isForeign) {
      foreignElements.add(element);
    }
  }
  return foreignElements;
};

// Resolves winners against the untouched DOM before anything is written; undefined when the work budget runs out.
const resolveAttributes = (
  elements: readonly Element[],
  declarationsBySelector: DeclarationsBySelector
): Map<Element, Map<string, Declaration>> | undefined => {
  const resolved = new Map<Element, Map<string, Declaration>>();
  let steps = 0;
  for (const element of elements) {
    const selectorKeys = new Set(
      (element.getAttribute('class') ?? '')
        .split(ASCII_WHITESPACE)
        .filter(Boolean)
        .map((className) => `.${className}`)
    );
    if (element.localName === SVG_TYPE_SELECTOR) {
      selectorKeys.add(SVG_TYPE_SELECTOR);
    }

    const winners = new Map<string, Declaration>();
    for (const selectorKey of selectorKeys) {
      const declarations = declarationsBySelector.get(selectorKey);
      if (!declarations) {
        continue;
      }
      steps += declarations.size;
      if (steps > MAX_RESOLUTION_STEPS) {
        return undefined;
      }
      for (const declaration of declarations.values()) {
        const current = winners.get(declaration.property);
        if (!current || outranks(declaration, current)) {
          winners.set(declaration.property, declaration);
        }
      }
    }
    if (winners.size > 0) {
      resolved.set(element, winners);
    }
  }
  return resolved;
};

const countAddedBytes = (
  resolved: ReadonlyMap<Element, ReadonlyMap<string, Declaration>>
): number =>
  Array.from(resolved.values())
    .flatMap((winners) => Array.from(winners.values()))
    .reduce((total, { property, value }) => total + property.length + value.length + 4, 0);

const inlineSupportedStyles = (svgContent: string, window: DOMWindow): string => {
  // Parse as HTML like DOMPurify does; XML parsing plus re-serialization makes DOMPurify drop Inkscape SVGs.
  const svgDocument = new window.DOMParser().parseFromString(svgContent, 'text/html');
  const elements = collectElements(svgDocument, window);
  const foreignElements = collectForeignElements(elements);
  const cssTexts: string[] = [];
  for (const element of elements) {
    if (element.localName !== 'style') {
      continue;
    }
    const kind = foreignElements.has(element) ? 'unsupported' : classifyStyleElement(element);
    if (kind === 'unsupported') {
      return svgContent;
    }
    if (kind === 'css') {
      cssTexts.push(element.textContent ?? '');
    }
  }
  const cssLength = cssTexts.reduce((total, cssText) => total + cssText.length, 0);
  // `!important` can't be expressed as a presentation attribute, and it keeps an overridden duplicate
  // (`fill:#f00!important;fill:#00f`) winning, so any `!` falls back.
  if (cssLength > MAX_STYLE_TEXT_LENGTH || cssTexts.some((cssText) => cssText.includes('!'))) {
    return svgContent;
  }

  const declarationsBySelector = collectDeclarations(cssTexts);
  const targets = elements.filter(
    (element) =>
      !foreignElements.has(element) && !ANIMATION_ELEMENTS.has(toAsciiLowerCase(element.localName))
  );
  const resolved = declarationsBySelector && resolveAttributes(targets, declarationsBySelector);
  if (!resolved || resolved.size === 0 || countAddedBytes(resolved) > MAX_ADDED_ATTRIBUTE_BYTES) {
    return svgContent;
  }

  for (const [element, winners] of resolved) {
    for (const { property, value } of winners.values()) {
      element.setAttribute(property, value);
    }
  }
  return svgDocument.body.innerHTML;
};

/** Copies supported `<style>` rules onto elements as presentation attributes, or returns the input unchanged. */
export const inlineSvgStyles = (svgContent: string, window: DOMWindow): string => {
  if (!STYLE_TAG.test(svgContent)) {
    return svgContent;
  }
  try {
    return inlineSupportedStyles(svgContent, window);
  } catch {
    // e.g. nesting deep enough to overflow jsdom's parser; keep today's output rather than failing the request.
    return svgContent;
  }
};
