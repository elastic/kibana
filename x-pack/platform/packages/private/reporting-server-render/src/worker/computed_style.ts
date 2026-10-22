/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CssDeclaration, CssNode } from '../lowering/css_parser';
import { parseCss, parseInlineStyle, splitSelectorList } from '../lowering/css_parser';
import {
  LOGICAL_PAIRS,
  LOGICAL_TO_PHYSICAL,
  NEVER_MATCHING,
  splitValueTokens,
  stripSelectorArguments,
} from '../lowering/takumi_css';
import { getRecordedRules } from './collect_page_css';

/**
 * A `getComputedStyle` backed by the page's real stylesheets: cascade (importance,
 * specificity, source order), inheritance, `var()`, and the unit resolution (`rem`/`em` to
 * px, unitless `line-height` to px) code actually reads. jsdom's own implementation only
 * implements `visibility`, and this package used to return inline styles alone, which left
 * `EuiDataGrid`'s line-count row heights as `NaN` (it reads `lineHeight` and `paddingTop`
 * off the cell): react-window's row loop stops at `NaN`, so a grid rendered two rows.
 *
 * Rules are indexed incrementally as Emotion inserts them (a page inserts thousands), by the
 * rightmost compound's id/class/tag, and candidates are confirmed with `element.matches`
 * (the `css-select`-backed engine that works under the packaged code-generation flag).
 */

interface RuleEntry {
  declarations: CssDeclaration[];
  order: number;
}

interface IndexedSelector {
  selector: string;
  specificity: number;
  rule: RuleEntry;
}

const INHERITED = new Set([
  'color',
  'font-family',
  'font-size',
  'font-style',
  'font-weight',
  'font-variant',
  'font-kerning',
  'line-height',
  'letter-spacing',
  'word-spacing',
  'text-align',
  'text-transform',
  'text-indent',
  'white-space',
  'word-break',
  'overflow-wrap',
  'direction',
  'visibility',
  'cursor',
  'list-style',
]);

const BOX_SHORTHANDS: Record<string, [string, string, string, string]> = {
  padding: ['padding-top', 'padding-right', 'padding-bottom', 'padding-left'],
  margin: ['margin-top', 'margin-right', 'margin-bottom', 'margin-left'],
  inset: ['top', 'right', 'bottom', 'left'],
  'border-width': [
    'border-top-width',
    'border-right-width',
    'border-bottom-width',
    'border-left-width',
  ],
};

const FONT_SIZE_KEYWORDS: Record<string, number> = {
  'xx-small': 9,
  'x-small': 10,
  small: 13,
  medium: 16,
  large: 18,
  'x-large': 24,
  'xx-large': 32,
};

const ROOT_FONT_SIZE_PX = 16;

const specificityOf = (selector: string): number => {
  const withoutWhere = selector.replace(/:where\([^)]*\)/g, '');
  const noStrings = withoutWhere.replace(/"[^"]*"|'[^']*'/g, '');
  const ids = (noStrings.match(/#[\w-]+/g) ?? []).length;
  const pseudoElements = (noStrings.match(/::[\w-]+/g) ?? []).length;
  const classes =
    (noStrings.match(/\.[\w-]+/g) ?? []).length +
    (noStrings.match(/\[[^\]]*\]/g) ?? []).length +
    ((noStrings.replace(/::[\w-]+/g, '').match(/:[\w-]+/g) ?? []).length -
      (noStrings.match(/:(?:not|is|where|has)\b/g) ?? []).length);
  const tags = (noStrings.match(/(?:^|[\s>+~(,])[a-zA-Z][\w-]*/g) ?? []).length + pseudoElements;
  return ids * 10000 + Math.max(0, classes) * 100 + tags;
};

/** The id/class/tag key of a selector's rightmost compound, for the candidate index. */
const indexKey = (selector: string): { kind: 'id' | 'class' | 'tag' | 'any'; name: string } => {
  const structural = stripSelectorArguments(selector);
  const segments = structural.trim().split(/[\s>+~]+/);
  const last = segments[segments.length - 1] ?? '';
  const id = last.match(/#([\w-]+)/);
  if (id) return { kind: 'id', name: id[1] };
  const cls = last.match(/\.([\w-]+)/);
  if (cls) return { kind: 'class', name: cls[1] };
  const tag = last.match(/^([a-zA-Z][\w-]*)/);
  if (tag) return { kind: 'tag', name: tag[1].toLowerCase() };
  return { kind: 'any', name: '' };
};

const expandDeclaration = (declaration: CssDeclaration): CssDeclaration[] => {
  const { prop, value, important } = declaration;
  const box = BOX_SHORTHANDS[prop];
  if (box) {
    const [a, b = a, c = a, d = b] = splitValueTokens(value);
    return [a, b, c, d].map((v, i) => ({ prop: box[i], value: v, important }));
  }
  const pair = LOGICAL_PAIRS[prop];
  if (pair) {
    const [a, b = a] = splitValueTokens(value);
    return [
      { prop: pair[0], value: a, important },
      { prop: pair[1], value: b, important },
    ];
  }
  return [{ prop: LOGICAL_TO_PHYSICAL[prop] ?? prop, value, important }];
};

class RuleIndex {
  private byId = new Map<string, IndexedSelector[]>();
  private byClass = new Map<string, IndexedSelector[]>();
  private byTag = new Map<string, IndexedSelector[]>();
  private any: IndexedSelector[] = [];
  private order = 0;
  public generation = 0;

  public clear() {
    this.byId.clear();
    this.byClass.clear();
    this.byTag.clear();
    this.any = [];
    this.order = 0;
    this.generation++;
  }

  public addNodes(nodes: CssNode[]) {
    for (const node of nodes) {
      if (node.type === 'atrule') {
        if (!node.rules || /^(font-face|keyframes|-webkit-keyframes|page)$/.test(node.name))
          continue;
        if (node.name === 'media' && /\bprint\b/i.test(node.params)) continue;
        this.addNodes(node.rules);
        continue;
      }
      const declarations = node.declarations.flatMap(expandDeclaration);
      if (declarations.length === 0) continue;
      const rule: RuleEntry = { declarations, order: this.order++ };
      for (const selector of splitSelectorList(node.selector)) {
        // Never-matching states, and pseudo-element rules (which describe `::before`, not the element).
        if (
          NEVER_MATCHING.test(selector) ||
          /::/.test(selector) ||
          /:(?:before|after|first-line|first-letter)\b/.test(selector)
        ) {
          continue;
        }
        const entry = { selector, specificity: specificityOf(selector), rule };
        const key = indexKey(selector);
        const map =
          key.kind === 'id' ? this.byId : key.kind === 'class' ? this.byClass : this.byTag;
        if (key.kind === 'any') this.any.push(entry);
        else {
          const list = map.get(key.name);
          if (list) list.push(entry);
          else map.set(key.name, [entry]);
        }
      }
    }
    this.generation++;
  }

  public candidates(element: Element): IndexedSelector[] {
    const out: IndexedSelector[] = [...this.any];
    if (element.id) out.push(...(this.byId.get(element.id) ?? []));
    const className = element.getAttribute('class');
    if (className) {
      for (const name of className.split(/\s+/)) {
        if (name) out.push(...(this.byClass.get(name) ?? []));
      }
    }
    out.push(...(this.byTag.get(element.localName) ?? []));
    return out;
  }
}

interface CascadedValue {
  value: string;
  important: boolean;
  specificity: number;
  order: number;
}

export interface ComputedStyleEnvironment {
  window: {
    document: Document;
    CSSStyleDeclaration: new () => CSSStyleDeclaration;
  };
  getFetchedStylesheet: (url: string) => string | undefined;
}

export const createComputedStyleProvider = (env: ComputedStyleEnvironment) => {
  const { document } = env.window;
  const index = new RuleIndex();
  const styleState = new Map<Element, { textLength: number; ruleCount: number }>();
  const linkState = new Set<string>();
  const memo = new WeakMap<Element, { generation: number; style: CSSStyleDeclaration }>();
  const cascadeMemo = new WeakMap<
    Element,
    { generation: number; map: Map<string, CascadedValue> }
  >();

  const addCss = (css: string) => {
    if (css) index.addNodes(parseCss(css));
  };

  const sync = () => {
    const styles = Array.from(document.getElementsByTagName('style'));
    const links = Array.from(document.getElementsByTagName('link'));
    let rebuild = false;
    for (const style of styles) {
      const known = styleState.get(style);
      const recorded = getRecordedRules((style as HTMLStyleElement).sheet as object);
      const textLength = (style.textContent ?? '').length;
      if (known && (textLength !== known.textLength || recorded.length < known.ruleCount)) {
        rebuild = true;
        break;
      }
    }
    if (!rebuild) {
      for (const url of linkState) {
        if (!links.some((l) => (l as HTMLLinkElement).href === url)) {
          rebuild = true;
          break;
        }
      }
    }
    if (rebuild) {
      index.clear();
      styleState.clear();
      linkState.clear();
    }
    for (const element of Array.from(document.getElementsByTagName('*'))) {
      // Document order across `<style>` and `<link>` is the cascade's source order.
      const tag = element.localName;
      if (tag === 'style') {
        const recorded = getRecordedRules((element as HTMLStyleElement).sheet as object);
        const known = styleState.get(element);
        const text = element.textContent ?? '';
        if (!known) {
          addCss(text);
          addCss(recorded.join('\n'));
          styleState.set(element, { textLength: text.length, ruleCount: recorded.length });
        } else if (recorded.length > known.ruleCount) {
          addCss(recorded.slice(known.ruleCount).join('\n'));
          known.ruleCount = recorded.length;
        }
      } else if (
        tag === 'link' &&
        (element.getAttribute('rel') ?? '').toLowerCase() === 'stylesheet'
      ) {
        const href = (element as HTMLLinkElement).href;
        const css = env.getFetchedStylesheet(href);
        if (css && !linkState.has(href)) {
          linkState.add(href);
          addCss(css);
        }
      }
    }
  };

  /** Cheap staleness check: avoids walking the document on every call. */
  let lastSignature = '';
  const signature = () =>
    `${document.getElementsByTagName('style').length}:${
      document.getElementsByTagName('link').length
    }:${Array.from(document.getElementsByTagName('style')).reduce(
      (n, s) => n + getRecordedRules((s as HTMLStyleElement).sheet as object).length,
      0
    )}`;
  const ensureSynced = () => {
    const current = signature();
    if (current !== lastSignature) {
      lastSignature = current;
      sync();
    }
  };

  const cascade = (element: Element): Map<string, CascadedValue> => {
    const cached = cascadeMemo.get(element);
    if (cached && cached.generation === index.generation) return cached.map;
    const map = new Map<string, CascadedValue>();
    const apply = (declaration: CssDeclaration, specificity: number, order: number) => {
      const existing = map.get(declaration.prop);
      const wins =
        !existing ||
        (declaration.important && !existing.important) ||
        (declaration.important === existing.important &&
          (specificity > existing.specificity ||
            (specificity === existing.specificity && order >= existing.order)));
      if (wins) {
        map.set(declaration.prop, {
          value: declaration.value,
          important: declaration.important,
          specificity,
          order,
        });
      }
    };
    for (const { selector, specificity, rule } of index.candidates(element)) {
      let matches = false;
      try {
        matches = element.matches(selector);
      } catch {
        matches = false;
      }
      if (!matches) continue;
      for (const declaration of rule.declarations) apply(declaration, specificity, rule.order);
    }
    const inline = (element.getAttribute('style') ?? '').trim();
    if (inline) {
      for (const declaration of parseInlineStyle(inline).flatMap(expandDeclaration)) {
        apply(declaration, 1_000_000, Number.MAX_SAFE_INTEGER);
      }
    }
    cascadeMemo.set(element, { generation: index.generation, map });
    return map;
  };

  /** Raw value of a (possibly inherited) property: the cascaded text, or the parent's, resolving `var()`. */
  const rawValue = (element: Element, prop: string): string | undefined => {
    const own = cascade(element).get(prop)?.value;
    const inherits = INHERITED.has(prop) || prop.startsWith('--');
    if (own !== undefined && !/^(inherit|unset)$/i.test(own)) {
      if (/^initial$/i.test(own)) return undefined;
      return own;
    }
    if (own !== undefined || inherits) {
      const parent = element.parentElement;
      return parent ? rawValue(parent, prop) : undefined;
    }
    return undefined;
  };

  const resolveVars = (element: Element, value: string, depth = 0): string => {
    if (depth > 8 || !value.includes('var(')) return value;
    return value.replace(
      /var\(\s*(--[\w-]+)\s*(?:,\s*((?:[^()]|\([^()]*\))*))?\)/g,
      (_match, name: string, fallback?: string) => {
        const resolved = rawValue(element, name);
        const replacement = resolved !== undefined ? resolved : fallback ?? '';
        return resolveVars(element, replacement.trim(), depth + 1);
      }
    );
  };

  const fontSizePx = (element: Element): number => {
    // Only the element's own declaration: an inherited `font-size` is the parent's *computed*
    // size, never its raw text (a `0.875rem` on `html` must not be re-resolved on a child).
    const own = cascade(element).get('font-size')?.value;
    const parent = element.parentElement;
    const parentSize = parent ? fontSizePx(parent) : ROOT_FONT_SIZE_PX;
    const raw = own !== undefined && !/^(inherit|unset|initial)$/i.test(own) ? own : undefined;
    if (raw === undefined) return parentSize;
    const value = resolveVars(element, raw).trim().toLowerCase();
    if (value in FONT_SIZE_KEYWORDS) return FONT_SIZE_KEYWORDS[value];
    if (value === 'smaller') return parentSize / 1.2;
    if (value === 'larger') return parentSize * 1.2;
    const match = value.match(/^(-?[\d.]+)(px|rem|em|%|pt)?$/);
    if (!match) return parentSize;
    const n = parseFloat(match[1]);
    switch (match[2]) {
      case 'rem':
        // On the root itself, `rem` is relative to the initial 16px, not to its own result.
        return n * (element === document.documentElement ? ROOT_FONT_SIZE_PX : rootFontSizePx());
      case 'em':
        return n * parentSize;
      case '%':
        return (n / 100) * parentSize;
      case 'pt':
        return (n * 4) / 3;
      default:
        return n;
    }
  };

  const rootFontSizePx = (): number =>
    document.documentElement ? fontSizePx(document.documentElement) : ROOT_FONT_SIZE_PX;

  const LENGTH = /^(-?[\d.]+)(px|rem|em|pt)$/;
  const toPx = (element: Element, value: string): string => {
    const match = value.trim().match(LENGTH);
    if (!match) return value;
    const n = parseFloat(match[1]);
    const px =
      match[2] === 'rem'
        ? n * rootFontSizePx()
        : match[2] === 'em'
        ? n * fontSizePx(element)
        : match[2] === 'pt'
        ? (n * 4) / 3
        : n;
    return `${Math.round(px * 1000) / 1000}px`;
  };

  const LENGTH_PROPS =
    /^(?:padding|margin)-(?:top|right|bottom|left)$|^border-(?:top|right|bottom|left)-width$|^(?:top|right|bottom|left|width|height|min-width|min-height|max-width|max-height|letter-spacing|word-spacing|text-indent|gap|row-gap|column-gap)$/;

  const computeProperty = (element: Element, prop: string): string | undefined => {
    if (prop === 'font-size') return `${Math.round(fontSizePx(element) * 1000) / 1000}px`;
    const raw = rawValue(element, prop);
    if (raw === undefined) return undefined;
    const value = resolveVars(element, raw).trim();
    if (prop === 'line-height') {
      if (/^normal$/i.test(value)) return 'normal';
      const fs = fontSizePx(element);
      const number = value.match(/^-?[\d.]+$/);
      if (number) return `${Math.round(fs * parseFloat(value) * 1000) / 1000}px`;
      const percent = value.match(/^(-?[\d.]+)%$/);
      if (percent) return `${Math.round(((fs * parseFloat(percent[1])) / 100) * 1000) / 1000}px`;
      return toPx(element, value);
    }
    if (LENGTH_PROPS.test(prop)) return toPx(element, value);
    return value;
  };

  const getComputedStyle = (element: Element): CSSStyleDeclaration => {
    try {
      ensureSynced();
      const cached = memo.get(element);
      if (cached && cached.generation === index.generation) return cached.style;

      const style = new env.window.CSSStyleDeclaration();
      const props = new Set<string>(INHERITED);
      props.add('display');
      for (const prop of cascade(element).keys()) props.add(prop);
      for (const prop of props) {
        const value = computeProperty(element, prop);
        if (value !== undefined && value !== '') {
          try {
            style.setProperty(prop, value);
          } catch {
            // cssstyle rejects values it can't parse; a missing property reads as ''.
          }
        }
      }
      memo.set(element, { generation: index.generation, style });
      return style;
    } catch (error) {
      if (process.env.REPORTING_SERVER_RENDER_DEBUG_STYLE) throw error;
      return (element as HTMLElement).style;
    }
  };

  return getComputedStyle;
};
