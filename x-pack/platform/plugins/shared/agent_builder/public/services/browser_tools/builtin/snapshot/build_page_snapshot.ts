/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { accessibleName, capLength, normalizeText } from './accessible_name';
import {
  CHAT_SURFACE_SELECTOR,
  SNAPSHOT_MAX_CHARS,
  TEXT_MAX_CHARS,
  VALUE_MAX_CHARS,
} from './constants';
import type { RefStore } from './ref_store';
import { implicitRole, isInteractiveRole, isNameFromContentRole } from './roles';

export interface SnapshotApp {
  id: string;
  title: string;
}

const TRUNCATION_NOTICE = '… (truncated)';
const SKIPPED_TAGS = new Set(['script', 'style', 'template', 'noscript']);
/** Form controls whose content is rendered through `value` (and option lines for selects), not by walking. */
const LEAF_CONTROL_TAGS = new Set(['input', 'textarea', 'select']);
const VALUELESS_INPUT_TYPES = new Set([
  'password',
  'checkbox',
  'radio',
  'submit',
  'button',
  'reset',
  'image',
  'file',
  'hidden',
]);

/** Double-quotes a string, escaping quotes, backslashes and control characters. */
const quote = (text: string): string => JSON.stringify(text);

const isHidden = (el: Element): boolean => {
  if (
    SKIPPED_TAGS.has(el.tagName.toLowerCase()) ||
    el.getAttribute('aria-hidden') === 'true' ||
    el.hasAttribute('hidden') ||
    el.matches(CHAT_SURFACE_SELECTOR)
  ) {
    return true;
  }
  const { checkVisibility } = el as Element & { checkVisibility?: () => boolean };
  if (typeof checkVisibility === 'function' && !checkVisibility.call(el)) {
    return true;
  }
  const { width, height } = el.getBoundingClientRect();
  return width === 0 && height === 0 && el.childElementCount === 0;
};

const roleOf = (el: Element): string | undefined => {
  const explicit = el.getAttribute('role')?.trim().split(/\s+/)[0];
  if (explicit === 'presentation' || explicit === 'none') {
    return undefined;
  }
  if (explicit) {
    return explicit;
  }
  if (el.tagName.toLowerCase() === 'svg') {
    return accessibleName(el, { fromContent: false }) ? 'img' : undefined;
  }
  return implicitRole(el);
};

const isSensitive = (el: Element): boolean => {
  const autocomplete = el.getAttribute('autocomplete')?.toLowerCase() ?? '';
  return autocomplete.startsWith('cc-') || autocomplete.includes('password');
};

const rawValueOf = (el: Element): string | undefined => {
  if (el instanceof HTMLInputElement) {
    return VALUELESS_INPUT_TYPES.has(el.type) ? undefined : el.value;
  }
  if (el instanceof HTMLTextAreaElement) {
    return el.value;
  }
  if (el instanceof HTMLSelectElement) {
    // The option labels are what the model sees and what fill_form takes.
    return Array.from(el.selectedOptions)
      .map((option) => normalizeText(option.text))
      .join(', ');
  }
  return undefined;
};

const valueOf = (el: Element): string | undefined => {
  const value = rawValueOf(el);
  return value === undefined || isSensitive(el) ? undefined : capLength(value, VALUE_MAX_CHARS);
};

const optionLines = (select: HTMLSelectElement): string[] =>
  Array.from(select.options).map(
    (option) =>
      `- option ${quote(normalizeText(option.text))}${option.selected ? ' [selected]' : ''}`
  );

const headingLevel = (el: Element, role: string): number | undefined => {
  if (role !== 'heading') {
    return undefined;
  }
  const match = /^h([1-6])$/.exec(el.tagName.toLowerCase());
  const level = match ? Number(match[1]) : Number(el.getAttribute('aria-level'));
  return level > 0 ? level : undefined;
};

const isChecked = (el: Element): boolean =>
  (el instanceof HTMLInputElement &&
    (el.type === 'checkbox' || el.type === 'radio') &&
    el.checked) ||
  el.getAttribute('aria-checked') === 'true';

const isDisabled = (el: Element): boolean =>
  el.matches(':disabled') || el.getAttribute('aria-disabled') === 'true';

const formatNode = (el: Element, role: string, name: string, ref: string | undefined): string => {
  let line = `- ${role}`;
  if (name) {
    line += ` ${quote(name)}`;
  }
  if (ref) {
    line += ` [ref=${ref}]`;
  }
  const value = valueOf(el);
  if (value !== undefined) {
    line += ` value=${quote(value)}`;
  }
  const testSubj = el.getAttribute('data-test-subj');
  if (testSubj) {
    line += ` test-subj=${quote(testSubj)}`;
  }
  const level = headingLevel(el, role);
  if (level) {
    line += ` [level=${level}]`;
  }
  if (isChecked(el)) {
    line += ' [checked]';
  }
  const expanded = el.getAttribute('aria-expanded');
  if (expanded === 'true') {
    line += ' [expanded]';
  } else if (expanded === 'false') {
    line += ' [collapsed]';
  }
  if (isDisabled(el)) {
    line += ' [disabled]';
  }
  if (el.getAttribute('aria-selected') === 'true') {
    line += ' [selected]';
  }
  return line;
};

const walkTree = (root: Element, refStore: RefStore): string[] => {
  const generation = refStore.beginGeneration();
  const lines: string[] = [];
  const indent = (depth: number) => '  '.repeat(depth);

  // `inNamedContent`: an ancestor took its name from its text content, so that text is not repeated.
  const walkChildren = (parent: Element, depth: number, inNamedContent: boolean) => {
    for (const child of Array.from(parent.childNodes)) {
      if (child.nodeType === Node.TEXT_NODE) {
        const text = normalizeText(child.textContent, TEXT_MAX_CHARS);
        if (text && !inNamedContent) {
          lines.push(`${indent(depth)}- text ${quote(text)}`);
        }
      } else if (child instanceof Element) {
        walkElement(child, depth, inNamedContent);
      }
    }
  };

  const walkElement = (el: Element, depth: number, inNamedContent: boolean) => {
    if (isHidden(el)) {
      return;
    }
    const role = roleOf(el);
    const isSvg = el.tagName.toLowerCase() === 'svg';
    if (isSvg && !role) {
      return;
    }
    const explicitName = accessibleName(el, { fromContent: false });
    const contentName =
      !explicitName && role !== undefined && isNameFromContentRole(role) ? accessibleName(el) : '';
    const name = explicitName || contentName;
    if (!role && !name) {
      walkChildren(el, depth, inNamedContent);
      return;
    }
    const ref = role && isInteractiveRole(role) ? refStore.assign(generation, el) : undefined;
    lines.push(indent(depth) + formatNode(el, role ?? 'generic', name, ref));
    if (el instanceof HTMLSelectElement) {
      lines.push(...optionLines(el).map((line) => indent(depth + 1) + line));
    } else if (!isSvg && !LEAF_CONTROL_TAGS.has(el.tagName.toLowerCase())) {
      walkChildren(el, depth + 1, inNamedContent || contentName !== '');
    }
  };

  walkChildren(root, 0, false);
  return lines;
};

/**
 * Renders a compact, text-only view of the page under `root`: one line per meaningful node,
 * with refs on interactive elements, followed by the list of navigable apps.
 */
export const buildPageSnapshot = ({
  root,
  refStore,
  currentAppId,
  apps,
  maxChars = SNAPSHOT_MAX_CHARS,
}: {
  root: Element;
  refStore: RefStore;
  currentAppId?: string;
  apps: SnapshotApp[];
  maxChars?: number;
}): string => {
  const header = `current app: ${currentAppId ?? 'unknown'}`;
  const footer = ['', 'apps:', ...apps.map(({ id, title }) => `- ${id} ${quote(title)}`)].join(
    '\n'
  );
  const tree = walkTree(root, refStore);

  // Every line is joined with a newline: header + tree lines + footer.
  let budget = maxChars - header.length - footer.length - 1;
  const kept: string[] = [];
  for (let i = 0; i < tree.length; i++) {
    const cost = tree[i].length + 1;
    // Unless this is the last line, keep room for the truncation notice.
    const reserve = i < tree.length - 1 ? TRUNCATION_NOTICE.length + 1 : 0;
    if (cost + reserve > budget) {
      kept.push(TRUNCATION_NOTICE);
      break;
    }
    kept.push(tree[i]);
    budget -= cost;
  }
  return [header, ...kept, footer].join('\n');
};
