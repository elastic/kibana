/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CssDeclaration, CssNode, CssRule } from './css_parser';
import { parseCss, parseInlineStyle, serializeDeclarations, splitSelectorList } from './css_parser';

/**
 * Lowers a booted Kibana page's CSS into what Takumi (a Rust HTML/CSS-subset renderer) can
 * use. What `scripts/probe_takumi_css.js` established, and this module is built around:
 *
 * - Takumi has a real cascade (specificity, inheritance, `var()`, `calc()`, `!important`,
 *   `@media`, `@layer`, `:hover` never matching), so none of that is reimplemented here.
 * - In a **stylesheet**, a declaration whose value Takumi can't parse is silently dropped.
 *   In an **inline `style` attribute** it fails the whole render. Both go through
 *   {@link lowerDeclarations} so the two paths can't diverge.
 * - Logical properties (`inline-size`, `border-inline-start`, ...), which EUI emits
 *   everywhere, parse but are not applied; they're mapped to physical ones here.
 * - A page carries ~500KB of CSS (EUI, Emotion, legacy themes) of which a panel uses a
 *   sliver; rules that can't match the panel's markup are pruned for size.
 */

// --- declaration lowering -------------------------------------------------------------

/** Properties that only matter for interaction or animation: dropped to shrink the output. */
const DROPPED_PROPERTIES =
  /^(cursor|pointer-events|user-select|-webkit-user-select|transition(-.*)?|animation(-.*)?|will-change|scroll-.*|overscroll-.*|caret-color|resize|touch-action|-webkit-tap-highlight-color|appearance|-webkit-appearance|-moz-appearance)$/;

export const LOGICAL_TO_PHYSICAL: Record<string, string> = {
  'inline-size': 'width',
  'block-size': 'height',
  'min-inline-size': 'min-width',
  'min-block-size': 'min-height',
  'max-inline-size': 'max-width',
  'max-block-size': 'max-height',
  'margin-inline-start': 'margin-left',
  'margin-inline-end': 'margin-right',
  'margin-block-start': 'margin-top',
  'margin-block-end': 'margin-bottom',
  'padding-inline-start': 'padding-left',
  'padding-inline-end': 'padding-right',
  'padding-block-start': 'padding-top',
  'padding-block-end': 'padding-bottom',
  'inset-inline-start': 'left',
  'inset-inline-end': 'right',
  'inset-block-start': 'top',
  'inset-block-end': 'bottom',
  'border-inline-start': 'border-left',
  'border-inline-end': 'border-right',
  'border-block-start': 'border-top',
  'border-block-end': 'border-bottom',
  'border-inline-start-width': 'border-left-width',
  'border-inline-end-width': 'border-right-width',
  'border-block-start-width': 'border-top-width',
  'border-block-end-width': 'border-bottom-width',
  'border-inline-start-color': 'border-left-color',
  'border-inline-end-color': 'border-right-color',
  'border-block-start-color': 'border-top-color',
  'border-block-end-color': 'border-bottom-color',
  'border-inline-start-style': 'border-left-style',
  'border-inline-end-style': 'border-right-style',
  'border-block-start-style': 'border-top-style',
  'border-block-end-style': 'border-bottom-style',
};

/** Two-sided logical shorthands: `[first, second]` physical sides for `a` / `a b` values. */
export const LOGICAL_PAIRS: Record<string, [string, string]> = {
  'margin-inline': ['margin-left', 'margin-right'],
  'margin-block': ['margin-top', 'margin-bottom'],
  'padding-inline': ['padding-left', 'padding-right'],
  'padding-block': ['padding-top', 'padding-bottom'],
  'inset-inline': ['left', 'right'],
  'inset-block': ['top', 'bottom'],
};

/** Splits a value on top-level whitespace (not inside `()`), e.g. `4px 8px`. */
export const splitValueTokens = (value: string): string[] => {
  const tokens: string[] = [];
  let depth = 0;
  let start = -1;
  for (let i = 0; i < value.length; i++) {
    const ch = value[i];
    if (ch === '(') depth++;
    else if (ch === ')') depth = Math.max(0, depth - 1);
    if (/\s/.test(ch) && depth === 0) {
      if (start !== -1) tokens.push(value.slice(start, i));
      start = -1;
    } else if (start === -1) {
      start = i;
    }
  }
  if (start !== -1) tokens.push(value.slice(start));
  return tokens;
};

/** jsdom's `cssstyle` serializes some values with their closing paren lost (`repeat(1, minmax(0, 1fr)`). */
export const balanceParens = (value: string): string => {
  let depth = 0;
  for (const ch of value) {
    if (ch === '(') depth++;
    else if (ch === ')') depth = Math.max(0, depth - 1);
  }
  return depth > 0 ? value + ')'.repeat(depth) : value;
};

const GRID_TRACK_KEYWORDS = /(?:^|[\s(,])(?:auto(?![\w-])|min-content|max-content|fit-content\()/;

/**
 * Fixes one declaration's value for Takumi, or returns `undefined` to drop it. Each branch
 * is a value Takumi's inline-style parser was observed to reject (see
 * `scripts/probe_takumi_css.js`); everything else passes through untouched.
 */
const lowerValue = (prop: string, rawValue: string): string | undefined => {
  const value = balanceParens(rawValue.trim());
  const lower = value.toLowerCase();
  if (/\b(?:env|attr)\(/.test(lower) && prop !== 'content') return undefined;

  switch (prop) {
    case 'overflow':
    case 'overflow-x':
    case 'overflow-y':
      // Takumi: only visible/clip/hidden. A scroll container clips in a static render.
      return /\b(?:auto|scroll|overlay)\b/.test(lower)
        ? value.replace(/\b(?:auto|scroll|overlay)\b/gi, 'hidden')
        : value;
    case 'display':
      return lower === 'contents' ? undefined : value;
    case 'position':
      return lower === 'sticky' ? 'relative' : value;
    case 'width':
    case 'height':
      return /-available|^stretch$/.test(lower) ? '100%' : value;
    case 'min-width':
    case 'min-height':
    case 'max-width':
    case 'max-height':
      return /^(?:fit-content|min-content|max-content|-webkit-fill-available|stretch)/.test(lower)
        ? undefined
        : value;
    case 'grid-template-columns':
    case 'grid-template-rows':
      return GRID_TRACK_KEYWORDS.test(` ${lower}`) ? undefined : value;
    case 'align-self':
    case 'justify-self':
      return lower === 'auto' ? undefined : value;
    case 'white-space':
      return lower === 'break-spaces' ? 'pre-wrap' : value;
    default:
      return value;
  }
};

/** Lowers a declaration list: drops interaction-only properties, maps logical to physical, fixes values. */
export const lowerDeclarations = (declarations: CssDeclaration[]): CssDeclaration[] => {
  const out: CssDeclaration[] = [];
  for (const declaration of declarations) {
    const { value, important } = declaration;
    let { prop } = declaration;
    if (DROPPED_PROPERTIES.test(prop)) continue;

    const pair = LOGICAL_PAIRS[prop];
    if (pair) {
      const [first, second = first] = splitValueTokens(value);
      for (const [side, sideValue] of [
        [pair[0], first],
        [pair[1], second],
      ] as const) {
        const lowered = lowerValue(side, sideValue);
        if (lowered !== undefined) out.push({ prop: side, value: lowered, important });
      }
      continue;
    }

    prop = LOGICAL_TO_PHYSICAL[prop] ?? prop;
    const lowered = lowerValue(prop, value);
    if (lowered !== undefined) out.push({ prop, value: lowered, important });
  }
  return out;
};

/** Lowers the text of one inline `style="..."` attribute; an empty result means "remove the attribute". */
export const lowerInlineStyle = (style: string): string =>
  serializeDeclarations(lowerDeclarations(parseInlineStyle(style)));

/**
 * Lowers every inline `style` attribute under `root` (inclusive), in place. Inline values
 * are where Takumi is strict, and where React libraries (`react-window`, EUI's grid, Elastic
 * Charts' metric grid) put the values that trip it.
 */
export const lowerInlineStyles = (root: Element): void => {
  const elements = [root, ...Array.from(root.getElementsByTagName('*'))];
  for (const element of elements) {
    const style = element.getAttribute('style');
    if (style === null) continue;
    const lowered = lowerInlineStyle(style);
    if (lowered) element.setAttribute('style', lowered);
    else element.removeAttribute('style');
  }
};

/**
 * Copies each element's inline style from `original` onto the matching element of `clone`
 * (same structure, same order), lowered for Takumi -- reading the original's `style`
 * *object*, not the clone's attribute text. Some libraries set a value with a closing paren
 * missing (Elastic Charts' metric grid: `repeat(1, minmax(0, 1fr)`), which is valid per
 * property (the CSS parser closes it at the end of the value) but, once `cssstyle` writes it
 * into attribute text, the unbalanced paren swallows the `;` and the declarations after it.
 * Per-property reads never see that text.
 */
export const lowerInlineStylesFrom = (original: Element, clone: Element): void => {
  const originals = [original, ...Array.from(original.getElementsByTagName('*'))];
  const clones = [clone, ...Array.from(clone.getElementsByTagName('*'))];
  originals.forEach((source, i) => {
    const target = clones[i];
    if (!target) return;
    const style = (source as HTMLElement).style;
    if (!style || style.length === 0) {
      target.removeAttribute('style');
      return;
    }
    const declarations: CssDeclaration[] = [];
    for (let j = 0; j < style.length; j++) {
      const prop = style.item(j);
      const value = style.getPropertyValue(prop);
      if (prop && value) {
        declarations.push({
          prop,
          value,
          important: style.getPropertyPriority(prop) === 'important',
        });
      }
    }
    const lowered = serializeDeclarations(lowerDeclarations(declarations));
    if (lowered) target.setAttribute('style', lowered);
    else target.removeAttribute('style');
  });
};

// --- stylesheet lowering --------------------------------------------------------------

/** What a panel's markup contains, for cheaply ruling out selectors that cannot match it. */
export interface ScopeIndex {
  root: Element;
  classes: Set<string>;
  ids: Set<string>;
}

export const buildScopeIndex = (root: Element): ScopeIndex => {
  const classes = new Set<string>();
  const ids = new Set<string>();
  for (const element of [root, ...Array.from(root.getElementsByTagName('*'))]) {
    if (element.id) ids.add(element.id);
    const className = element.getAttribute('class');
    if (className) for (const name of className.split(/\s+/)) if (name) classes.add(name);
  }
  return { root, classes, ids };
};

/** Pseudo-classes that can never match in a static render, or vendor pseudo-elements Takumi has no use for. */
export const NEVER_MATCHING =
  /:(?:hover|focus|focus-visible|focus-within|active|visited|target)\b|::?-(?:webkit|moz|ms)-[\w-]+|::(?:placeholder|selection|marker|backdrop|file-selector-button|cue)\b/;

export const PSEUDO_ELEMENT = /::?(?:before|after|first-line|first-letter)\b/g;

/** Removes `(...)` arguments, `[...]` attribute selectors and strings, leaving only class/id/tag structure. */
export const stripSelectorArguments = (selector: string): string => {
  let out = '';
  let depth = 0;
  let quote = '';
  for (let i = 0; i < selector.length; i++) {
    const ch = selector[i];
    if (quote) {
      if (ch === '\\') i++;
      else if (ch === quote) quote = '';
      continue;
    }
    if (ch === '"' || ch === "'") quote = ch;
    else if (ch === '(' || ch === '[') depth++;
    else if (ch === ')' || ch === ']') depth = Math.max(0, depth - 1);
    else if (depth === 0) out += ch;
  }
  return out;
};

const TOKEN = /[.#]((?:[\w-]|[^\x00-\x7f])+)/g;

/**
 * Whether `selector` could match something inside `scope`. Over-inclusive by design (a kept
 * rule that matches nothing costs bytes, a wrongly dropped one costs fidelity): class/id
 * tokens are checked against the scope's own, and only selectors with none (tag-only,
 * attribute-only, `*`) are actually evaluated, through the `css-select`-backed `matches`/
 * `querySelector` that `jsdom_selector_compat.ts` installs.
 */
const selectorMayMatch = (selector: string, scope: ScopeIndex): boolean => {
  if (NEVER_MATCHING.test(selector)) return false;
  const structural = stripSelectorArguments(selector).replace(PSEUDO_ELEMENT, '');
  if (structural.includes('\\')) return true; // escaped class names: don't second-guess

  let hasToken = false;
  TOKEN.lastIndex = 0;
  for (let match = TOKEN.exec(structural); match; match = TOKEN.exec(structural)) {
    hasToken = true;
    const isId = structural[match.index] === '#';
    if (!(isId ? scope.ids : scope.classes).has(match[1])) return false;
  }
  if (hasToken) return true;

  const testable = selector.replace(PSEUDO_ELEMENT, '').trim();
  if (!testable || /^(?:\*|html|body|:root|:host)$/i.test(testable)) return true;
  try {
    return scope.root.matches(testable) || scope.root.querySelector(testable) !== null;
  } catch {
    return false;
  }
};

/** At-rules with no use in a static, per-panel render. */
const DROPPED_AT_RULES = new Set([
  'font-face',
  'keyframes',
  '-webkit-keyframes',
  '-moz-keyframes',
  'import',
  'charset',
  'namespace',
  'page',
  'property',
  'counter-style',
  'font-feature-values',
  'viewport',
]);

const lowerNodes = (nodes: CssNode[], scope: ScopeIndex): CssNode[] => {
  const out: CssNode[] = [];
  for (const node of nodes) {
    if (node.type === 'atrule') {
      if (DROPPED_AT_RULES.has(node.name) || !node.rules) continue;
      if (node.name === 'media' && /\bprint\b/i.test(node.params)) continue;
      const rules = lowerNodes(node.rules, scope);
      if (rules.length > 0) out.push({ ...node, rules });
      continue;
    }
    const selectors = splitSelectorList(node.selector).filter((s) => selectorMayMatch(s, scope));
    if (selectors.length === 0) continue;
    const declarations = lowerDeclarations(node.declarations);
    if (declarations.length === 0) continue;
    out.push({ type: 'rule', selector: selectors.join(','), declarations } as CssRule);
  }
  return out;
};

const serializeNodes = (nodes: CssNode[]): string =>
  nodes
    .map((node) =>
      node.type === 'rule'
        ? `${node.selector}{${serializeDeclarations(node.declarations)}}`
        : `@${node.name} ${node.params}{${serializeNodes(node.rules ?? [])}}`
    )
    .join('\n');

/**
 * The browser's own user-agent rules for what a page's stylesheets assume but never state.
 * Prepended, so any page rule overrides it.
 */
export const USER_AGENT_CSS = '[hidden]{display:none}\n';

export interface LoweredCss {
  css: string;
  stats: { rulesIn: number; rulesOut: number; bytesIn: number; bytesOut: number };
}

const countRules = (nodes: CssNode[]): number =>
  nodes.reduce((n, node) => n + (node.type === 'rule' ? 1 : countRules(node.rules ?? [])), 0);

/** Parses each stylesheet once; reuse the result across every panel of one report. */
export const parseStylesheets = (sheets: string[]): CssNode[][] => sheets.map(parseCss);

/**
 * Lowers parsed stylesheets for one panel: prunes rules that cannot match `scope`'s markup
 * and fixes declarations for Takumi (see the module doc). Sheet order, and so the cascade's
 * source-order tiebreak, is preserved.
 */
export const lowerStylesheets = (
  parsedSheets: CssNode[][],
  scope: ScopeIndex,
  bytesIn = 0
): LoweredCss => {
  const lowered = parsedSheets.map((nodes) => lowerNodes(nodes, scope));
  const css = USER_AGENT_CSS + lowered.map(serializeNodes).join('\n');
  return {
    css,
    stats: {
      rulesIn: parsedSheets.reduce((n, nodes) => n + countRules(nodes), 0),
      rulesOut: lowered.reduce((n, nodes) => n + countRules(nodes), 0),
      bytesIn,
      bytesOut: css.length,
    },
  };
};
