/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { NAME_MAX_CHARS } from './constants';

/** Caps a string at `maxChars`, ending it with `…` when cut. */
export const capLength = (text: string, maxChars: number): string =>
  text.length > maxChars ? `${text.slice(0, maxChars - 1)}…` : text;

/** Collapses whitespace, trims and caps a string at `maxChars` (default {@link NAME_MAX_CHARS}). */
export const normalizeText = (
  text: string | null | undefined,
  maxChars: number = NAME_MAX_CHARS
): string => capLength((text ?? '').replace(/\s+/g, ' ').trim(), maxChars);

const labelledByText = (el: Element): string => {
  const ids = el.getAttribute('aria-labelledby')?.split(/\s+/).filter(Boolean) ?? [];
  return ids.map((id) => el.ownerDocument.getElementById(id)?.textContent ?? '').join(' ');
};

const labelText = (el: Element): string => {
  const labels = (el as HTMLInputElement).labels;
  if (!labels || labels.length === 0) {
    return '';
  }
  return Array.from(labels)
    .map((label) => label.textContent ?? '')
    .join(' ');
};

const svgTitleText = (el: Element): string =>
  el.tagName.toLowerCase() === 'svg'
    ? Array.from(el.children).find((child) => child.tagName.toLowerCase() === 'title')
        ?.textContent ?? ''
    : '';

const BUTTON_INPUT_TYPES = new Set(['submit', 'button', 'reset']);

const buttonInputValue = (el: Element): string =>
  el instanceof HTMLInputElement && BUTTON_INPUT_TYPES.has(el.type) ? el.value : '';

/**
 * Computes a simplified accessible name: `aria-label`, `aria-labelledby`, associated `<label>`,
 * `placeholder`, `title`, `alt`, the value of button-like inputs, then (unless `fromContent` is false) the text content.
 * Whitespace is collapsed and the result is capped at {@link NAME_MAX_CHARS}.
 */
export const accessibleName = (
  el: Element,
  { fromContent = true }: { fromContent?: boolean } = {}
): string => {
  const candidates: Array<() => string | null | undefined> = [
    () => el.getAttribute('aria-label'),
    () => labelledByText(el),
    () => labelText(el),
    () => svgTitleText(el),
    () => el.getAttribute('placeholder'),
    () => el.getAttribute('title'),
    () => el.getAttribute('alt'),
    () => buttonInputValue(el),
    () => (fromContent ? el.textContent : ''),
  ];
  for (const candidate of candidates) {
    const name = normalizeText(candidate());
    if (name) {
      return name;
    }
  }
  return '';
};
