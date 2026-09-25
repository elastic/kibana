/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DOMWindow } from 'jsdom';

// Keep the synchronous pre-pass cheap on hostile input; registry icons stay far below each one.
const MAX_STYLE_TEXT_LENGTH = 16_384;
const MAX_STYLE_RULES = 256;
const MAX_VALUE_LENGTH = 64;
const MAX_DASH_ARRAY_ENTRIES = 16;
const MAX_RESOLUTION_STEPS = 20_000;
const MAX_ADDED_ATTRIBUTE_BYTES = 65_536;
const MAX_COPIED_MARKUP_BYTES = 65_536;
const MAX_REFERENCE_DEPTH = 8;

const NUMERIC = String.raw`(?:\d+(?:\.\d+)?|\.\d+)`;
const NUMBER = new RegExp(`^${NUMERIC}$`);
const PERCENTAGE = new RegExp(`^${NUMERIC}%$`);
const LENGTH = new RegExp(`^${NUMERIC}(?:px|%)?$`, 'i');
const HEX_COLOR = /^#(?:[\da-f]{3,4}|[\da-f]{6}|[\da-f]{8})$/i;
// Same-document references only, e.g. url(#GreenGradient); anything else could load a remote resource.
const LOCAL_REFERENCE = /^url\(\s*#([\w-]+)\s*\)$/;
const LOCAL_HREF = /^#([\w-]+)$/;
const LOCAL_URL = /url\(\s*['"]?#([^\s'")]+)/gi;
const CLASS_SELECTOR = /^\.(-?[_a-zA-Z][\w-]*)$/;
const SVG_TYPE_SELECTOR = 'svg';
const STYLE_TAG = /<style[\s>]/i;
const CSS_COMMENT = /\/\*[\s\S]*?\*\//g;
// Quotes and escapes can hide `{`, `}` and `;` from the parser, and outside ASCII JavaScript's \s and
// toLowerCase() disagree with CSS.
const UNSUPPORTED_CSS_CHARACTERS = /["'\\]|[^\t\n\f\r -~]/;
// CSS never reads comments, blocks or declaration ends inside url(), so its contents may not look like any.
const URL_TOKEN = /url\([^;{}()[\]*]*\)/gi;
const URL_FUNCTION = /url\(/i;
// A `;` or `}` nested in parentheses or brackets does not end a declaration, but the parser below would split on it.
const GROUPING = /[()[\]]/;
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
const GRADIENT_ELEMENTS: ReadonlySet<string> = new Set(['lineargradient', 'radialgradient']);
const CONTAINER_REFERENCES: ReadonlySet<string> = new Set([
  'clippath',
  'mask',
  'pattern',
  'filter',
]);
// Geometry is only inherited from a gradient of the same type.
const SHARED_GRADIENT_ATTRIBUTES = ['gradientUnits', 'gradientTransform', 'spreadMethod'] as const;
const GRADIENT_GEOMETRY_ATTRIBUTES: Readonly<Record<string, readonly string[]>> = {
  lineargradient: ['x1', 'y1', 'x2', 'y2'],
  radialgradient: ['cx', 'cy', 'r', 'fx', 'fy', 'fr'],
};
const BASIC_SHAPES: ReadonlySet<string> = new Set([
  'path',
  'rect',
  'circle',
  'ellipse',
  'line',
  'polyline',
  'polygon',
]);
// `overflow` has no effect on a basic shape, so Illustrator's `style="overflow:visible;"` on <use> can be dropped.
const OVERFLOW_DECLARATION = /^overflow\s*:\s*[a-z]+$/i;
// `@namespace` is deliberately absent: a default namespace changes which elements class selectors match.
const IGNORED_STATEMENT_AT_RULES: ReadonlySet<string> = new Set(['import']);
// Conditional or cascade-changing blocks (@media, @supports, @layer, …) fall back instead.
const IGNORED_BLOCK_AT_RULES: ReadonlySet<string> = new Set([
  'page',
  'font-face',
  'keyframes',
  'counter-style',
  'property',
]);
const AT_RULE_NAME = /@([a-zA-Z-]+)/y;
// Stop properties aren't inherited, but these values read from the stop's parent, which changes when it's copied.
const PARENT_DEPENDENT_VALUE = /currentcolor|inherit|var\(|\\/i;
const MARKUP_NAME = /<\/?([a-zA-Z][^\s/>]*)|[\s"']([^\s"'<>/=]+)\s*=/g;

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

// Covers the properties and value forms registry icons use; any other property or value makes the whole SVG
// fall back, because dropping it would render something that is neither the original nor today's output.
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
// Illustrator writes `enable-background`, which no browser implements, so dropping it changes nothing.
const IGNORED_PROPERTIES: ReadonlySet<string> = new Set(['enable-background']);

interface StyleRule {
  readonly selectorText: string;
  readonly declarations: ReadonlyArray<readonly [property: string, value: string]>;
}

interface Declaration {
  readonly property: string;
  readonly value: string;
  readonly specificity: number;
  readonly order: number;
}

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

const toSelectorKey = (selector: string): string | undefined => {
  if (selector === SVG_TYPE_SELECTOR) {
    return SVG_TYPE_SELECTOR;
  }
  const match = CLASS_SELECTOR.exec(selector);
  return match ? `.${match[1]}` : undefined;
};

// Undefined for any at-rule that could style elements.
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

// jsdom's CSSOM compiles selectors with `new Function`, which Kibana disallows, so this parses the subset by hand.
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
      if (IGNORED_PROPERTIES.has(property)) {
        continue;
      }
      const grammar = PROPERTY_GRAMMARS.get(property);
      if (!grammar) {
        return undefined;
      }
      // Skipping an unsupported value could let an earlier declaration win instead, so fall back entirely.
      if (value.length > MAX_VALUE_LENGTH || !grammar(value)) {
        return undefined;
      }
      for (const selectorKey of uniqueSelectorKeys) {
        const specificity = selectorKey === SVG_TYPE_SELECTOR ? 0 : 1;
        const declarations =
          declarationsBySelector.get(selectorKey) ?? new Map<string, Declaration>();
        declarations.set(property, { property, value, specificity, order });
        declarationsBySelector.set(selectorKey, declarations);
      }
    }
  }
  return declarationsBySelector;
};

// querySelectorAll uses `new Function`, and iterating jsdom's live getElementsByTagName is quadratic.
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

// Lowercased tag and attribute names this module matches on.
const READ_NAMES: ReadonlySet<string> = new Set(
  [
    'class',
    'id',
    'href',
    'xlink:href',
    'xmlns',
    'type',
    'media',
    'title',
    SVG_TYPE_SELECTOR,
    'style',
    'stop',
    'use',
    ...ANIMATION_ELEMENTS,
    ...GRADIENT_ELEMENTS,
    ...CONTAINER_REFERENCES,
    ...BASIC_SHAPES,
    ...SHARED_GRADIENT_ATTRIBUTES,
    ...Object.values(GRADIENT_GEOMETRY_ATTRIBUTES).flat(),
  ].map(toAsciiLowerCase)
);

// The HTML parser rewrites the case of names (`CLASS`, `<STYLE>`, `lineargradient`), while XML matches them
// exactly, so inlining could apply rules or references the browser never would.
const changesNameCase = (svgContent: string, elements: readonly Element[]): boolean => {
  const names = new Set(
    elements.flatMap((element) => [
      element.localName,
      ...Array.from(element.attributes, ({ name }) => name),
    ])
  );
  for (const [, tagName, attributeName] of svgContent.matchAll(MARKUP_NAME)) {
    const name = tagName ?? attributeName;
    if (!names.has(name) && READ_NAMES.has(toAsciiLowerCase(name))) {
      return true;
    }
  }
  return false;
};

// HTML parsing ignores xmlns, but in the XML file a foreign default namespace takes an element and its
// descendants out of SVG (Illustrator's `<sfw xmlns="ns_sfw;">` metadata, for example).
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

const kindOf = (element: Element): string => toAsciiLowerCase(element.localName);

const indexById = (elements: readonly Element[]): ReadonlyMap<string, Element> => {
  const elementsById = new Map<string, Element>();
  for (const element of elements) {
    const id = element.getAttribute('id');
    if (id && !elementsById.has(id)) {
      elementsById.set(id, element);
    }
  }
  return elementsById;
};

const getHrefTarget = (
  element: Element,
  elementsById: ReadonlyMap<string, Element>
): Element | undefined => {
  const href = element.getAttribute('href') ?? element.getAttribute('xlink:href') ?? '';
  const id = LOCAL_HREF.exec(href)?.[1];
  return id === undefined ? undefined : elementsById.get(id);
};

const hasStops = (gradient: Element): boolean =>
  Array.from(gradient.children).some((child) => kindOf(child) === 'stop');

interface Copy {
  readonly elements: readonly Element[];
  readonly target: Element;
  readonly mode: 'append' | 'replace';
}

interface ReferencePlan {
  readonly copies: readonly Copy[];
  readonly attributes: ReadonlyArray<readonly [element: Element, name: string, value: string]>;
  // Gradients whose href can be stripped because everything they inherit is copied.
  readonly resolvedGradients: ReadonlySet<Element>;
}

// Only flat elements are copied, so the markup measured while planning is exactly what gets written.
const isFlat = (element: Element): boolean => element.children.length === 0;

const isCopyableStop = (stop: Element): boolean =>
  isFlat(stop) &&
  Array.from(stop.attributes).every(({ value }) => !PARENT_DEPENDENT_VALUE.test(value));

// DOMPurify strips href and drops <use>, so gradients inheriting through href would paint nothing and clip
// paths built from <use> would hide their shape.
const planReferences = (
  elements: readonly Element[],
  elementsById: ReadonlyMap<string, Element>
): ReferencePlan | undefined => {
  const copies: Copy[] = [];
  const attributes: Array<readonly [Element, string, string]> = [];
  const resolvedGradients = new Set<Element>();
  let copiedBytes = 0;
  const withinBudget = (bytes: number): boolean => {
    copiedBytes += bytes;
    return copiedBytes <= MAX_COPIED_MARKUP_BYTES;
  };

  for (const element of elements) {
    const kind = kindOf(element);
    if (GRADIENT_ELEMENTS.has(kind)) {
      const chain: Element[] = [];
      let next = getHrefTarget(element, elementsById);
      while (
        next &&
        GRADIENT_ELEMENTS.has(kindOf(next)) &&
        next !== element &&
        !chain.includes(next) &&
        chain.length < MAX_REFERENCE_DEPTH
      ) {
        chain.push(next);
        next = getHrefTarget(next, elementsById);
      }
      // A cycle or a chain past the depth limit ends on another gradient and stays unresolved.
      let isResolved = !next || !GRADIENT_ELEMENTS.has(kindOf(next));

      const stopSource = hasStops(element) ? undefined : chain.find(hasStops);
      if (stopSource) {
        const stops = Array.from(stopSource.children).filter((child) => kindOf(child) === 'stop');
        if (stops.every(isCopyableStop)) {
          if (!withinBudget(stops.reduce((total, stop) => total + stop.outerHTML.length, 0))) {
            return undefined;
          }
          copies.push({ elements: stops, target: element, mode: 'append' });
        } else {
          isResolved = false;
        }
      }
      for (const name of [...SHARED_GRADIENT_ATTRIBUTES, ...GRADIENT_GEOMETRY_ATTRIBUTES[kind]]) {
        const isShared = (SHARED_GRADIENT_ATTRIBUTES as readonly string[]).includes(name);
        const source = element.hasAttribute(name)
          ? undefined
          : chain.find(
              (gradient) => (isShared || kindOf(gradient) === kind) && gradient.hasAttribute(name)
            );
        const value = source?.getAttribute(name);
        if (value != null) {
          if (!withinBudget(name.length + value.length + 4)) {
            return undefined;
          }
          attributes.push([element, name, value]);
        }
      }
      if (isResolved) {
        resolvedGradients.add(element);
      }
    } else if (
      kind === 'use' &&
      element.parentElement &&
      kindOf(element.parentElement) === 'clippath'
    ) {
      const shape = getHrefTarget(element, elementsById);
      const onlyReferences = Array.from(element.attributes).every(
        ({ name, value }) =>
          name === 'href' ||
          name === 'xlink:href' ||
          (name === 'style' &&
            value
              .split(';')
              .every(
                (declaration) =>
                  declaration.trim() === '' || OVERFLOW_DECLARATION.test(declaration.trim())
              ))
      );
      if (shape && BASIC_SHAPES.has(kindOf(shape)) && isFlat(shape) && onlyReferences) {
        if (!withinBudget(shape.outerHTML.length)) {
          return undefined;
        }
        copies.push({ elements: [shape], target: element, mode: 'replace' });
      }
    }
  }
  return { copies, attributes, resolvedGradients };
};

const applyReferences = ({ copies, attributes }: ReferencePlan): void => {
  for (const [element, name, value] of attributes) {
    element.setAttribute(name, value);
  }
  for (const { elements, target, mode } of copies) {
    const clones = elements.map((element) => {
      const clone = element.cloneNode(false) as Element;
      clone.removeAttribute('id');
      return clone;
    });
    if (mode === 'replace') {
      target.replaceWith(...clones);
    } else {
      target.append(...clones);
    }
  }
};

// Elements are in document order, so walking them backwards counts every child before its parent.
const countDescendants = (elements: readonly Element[]): ReadonlyMap<Element, number> => {
  const counts = new Map<Element, number>();
  for (let index = elements.length - 1; index >= 0; index--) {
    const element = elements[index];
    const { parentElement } = element;
    if (parentElement) {
      counts.set(parentElement, (counts.get(parentElement) ?? 0) + (counts.get(element) ?? 0) + 1);
    }
  }
  return counts;
};

interface InlinedReference {
  readonly property: string;
  readonly id: string;
}

interface InlinedSvg {
  readonly svg: string;
  readonly references: readonly InlinedReference[];
  // Element count of everything the references reach; fewer after sanitization means content was removed.
  readonly dependencies: ReadonlyMap<string, number>;
}

const hasHref = (element: Element): boolean =>
  Array.from(element.attributes).some(({ localName }) => toAsciiLowerCase(localName) === 'href');

// Undefined when anything reachable still needs an href that sanitization strips.
const collectDependencies = (
  ids: readonly string[],
  elements: readonly Element[],
  resolvedGradients: ReadonlySet<Element>
): Map<string, number> | undefined => {
  const elementsById = indexById(elements);
  const descendants = countDescendants(elements);
  const positions = new Map(elements.map((element, index) => [element, index]));
  const dependencies = new Map<string, number>();
  const pending = [...ids];
  let steps = 0;
  for (let next = 0; next < pending.length; next++) {
    const id = pending[next];
    if (dependencies.has(id)) {
      continue;
    }
    const target = elementsById.get(id);
    const count = (target && descendants.get(target)) ?? 0;
    dependencies.set(id, count);
    const start = target && positions.get(target);
    if (start === undefined) {
      continue;
    }
    // A subtree is contiguous in document order.
    for (const element of elements.slice(start, start + count + 1)) {
      steps += 1;
      if (steps > MAX_RESOLUTION_STEPS || (hasHref(element) && !resolvedGradients.has(element))) {
        return undefined;
      }
      for (const { value } of Array.from(element.attributes)) {
        // CSS escapes can spell url() in a way LOCAL_URL doesn't see, e.g. `u\72l(#id)`.
        if (value.includes('\\')) {
          return undefined;
        }
        for (const [, referencedId] of value.matchAll(LOCAL_URL)) {
          pending.push(referencedId);
        }
      }
    }
  }
  return dependencies;
};

const inlineSupportedStyles = (svgContent: string, window: DOMWindow): InlinedSvg | undefined => {
  // Parse as HTML like DOMPurify does; XML parsing plus re-serialization makes DOMPurify drop Inkscape SVGs.
  const svgDocument = new window.DOMParser().parseFromString(svgContent, 'text/html');
  const elements = collectElements(svgDocument, window);
  if (changesNameCase(svgContent, elements)) {
    return undefined;
  }
  const foreignElements = collectForeignElements(elements);
  const cssTexts: string[] = [];
  for (const element of elements) {
    if (element.localName !== 'style') {
      continue;
    }
    const kind = foreignElements.has(element) ? 'unsupported' : classifyStyleElement(element);
    if (kind === 'unsupported') {
      return undefined;
    }
    if (kind === 'css') {
      cssTexts.push(element.textContent ?? '');
    }
  }
  const cssLength = cssTexts.reduce((total, cssText) => total + cssText.length, 0);
  // `!important` can't be expressed as a presentation attribute.
  if (cssLength > MAX_STYLE_TEXT_LENGTH || cssTexts.some((cssText) => cssText.includes('!'))) {
    return undefined;
  }

  const declarationsBySelector = collectDeclarations(cssTexts);
  const targets = elements.filter(
    (element) =>
      !foreignElements.has(element) && !ANIMATION_ELEMENTS.has(toAsciiLowerCase(element.localName))
  );
  const resolved = declarationsBySelector && resolveAttributes(targets, declarationsBySelector);
  if (!resolved || resolved.size === 0 || countAddedBytes(resolved) > MAX_ADDED_ATTRIBUTE_BYTES) {
    return undefined;
  }

  for (const [element, winners] of resolved) {
    for (const { property, value } of winners.values()) {
      element.setAttribute(property, value);
    }
  }
  const plan = planReferences(elements, indexById(elements));
  if (!plan) {
    return undefined;
  }
  applyReferences(plan);

  const references = new Map<string, InlinedReference>();
  for (const winners of resolved.values()) {
    for (const { property, value } of winners.values()) {
      const id = LOCAL_REFERENCE.exec(value)?.[1];
      if (id !== undefined) {
        references.set(`${property} ${id}`, { property, id });
      }
    }
  }
  const dependencies = collectDependencies(
    Array.from(references.values(), ({ id }) => id),
    collectElements(svgDocument, window),
    plan.resolvedGradients
  );
  return dependencies
    ? { svg: svgDocument.body.innerHTML, references: Array.from(references.values()), dependencies }
    : undefined;
};

const isRenderableTarget = (target: Element): boolean => {
  const kind = kindOf(target);
  if (GRADIENT_ELEMENTS.has(kind)) {
    return hasStops(target);
  }
  return !CONTAINER_REFERENCES.has(kind) || target.children.length > 0;
};

const isRenderableReference = (property: string, target: Element): boolean => {
  const kind = kindOf(target);
  const fitsProperty =
    property === 'clip-path'
      ? kind === 'clippath'
      : GRADIENT_ELEMENTS.has(kind) || kind === 'pattern';
  return fitsProperty && isRenderableTarget(target);
};

// A clip path or pattern that loses only part of its content to sanitization still hides part of the artwork.
const breaksReference = (
  sanitizedSvg: string,
  { references, dependencies }: InlinedSvg,
  window: DOMWindow
): boolean => {
  if (references.length === 0) {
    return false;
  }
  const svgDocument = new window.DOMParser().parseFromString(sanitizedSvg, 'text/html');
  const elements = collectElements(svgDocument, window);
  const elementsById = indexById(elements);
  const descendants = countDescendants(elements);
  const isIntact = (id: string, before: number): boolean => {
    const target = elementsById.get(id);
    return (
      target !== undefined &&
      isRenderableTarget(target) &&
      (descendants.get(target) ?? 0) === before
    );
  };
  return (
    references.some(({ property, id }) => {
      const target = elementsById.get(id);
      return !target || !isRenderableReference(property, target);
    }) || Array.from(dependencies).some(([id, before]) => !isIntact(id, before))
  );
};

/** Sanitizes with supported `<style>` rules inlined, unless an inlined reference would not survive sanitization. */
export const sanitizeWithInlinedStyles = (
  svgContent: string,
  window: DOMWindow,
  sanitize: (svg: string) => string
): string => {
  if (!STYLE_TAG.test(svgContent)) {
    return sanitize(svgContent);
  }
  try {
    const inlined = inlineSupportedStyles(svgContent, window);
    if (!inlined) {
      return sanitize(svgContent);
    }
    const sanitized = sanitize(inlined.svg);
    return breaksReference(sanitized, inlined, window) ? sanitize(svgContent) : sanitized;
  } catch {
    // e.g. nesting deep enough to overflow jsdom's parser.
    return sanitize(svgContent);
  }
};
