/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Branding assets for the experimental Daybreak solution view.
 *
 * Daybreak is to Security what Nightshift is to Observability: a prototype
 * solution view that currently reuses (a trimmed version of) the Security
 * navigation tree. Its icon is a sun + sparkles drawn in the same saturated
 * blue → purple gradient Nightshift uses (`#1750BA → #6B3C9F`) so the two
 * surfaces share a coherent "AI shift" brand.
 */

import {
  NIGHTSHIFT_GRADIENT_END,
  NIGHTSHIFT_GRADIENT_END_ON_DARK,
  NIGHTSHIFT_GRADIENT_START,
  NIGHTSHIFT_GRADIENT_START_ON_DARK,
} from './nightshift_icon';

export const DAYBREAK_GRADIENT_START = NIGHTSHIFT_GRADIENT_START;
export const DAYBREAK_GRADIENT_END = NIGHTSHIFT_GRADIENT_END;
export const DAYBREAK_GRADIENT_START_ON_DARK = NIGHTSHIFT_GRADIENT_START_ON_DARK;
export const DAYBREAK_GRADIENT_END_ON_DARK = NIGHTSHIFT_GRADIENT_END_ON_DARK;

const GRADIENT_ID = 'daybreakSunGradient';

export const DAYBREAK_ICON_VIEWBOX = '0 0 16 16';

/**
 * Sun body — circle centred at (8, 8), radius ~3.
 */
const DAYBREAK_ICON_SUN_BODY_PATH =
  'M11 8 A3 3 0 1 1 5 8 A3 3 0 1 1 11 8 Z';

/**
 * Eight short rays radiating from the centre. Each ray is a 1px-thick
 * rounded rectangle drawn from r=4.5 → r=6 along its axis.
 */
const DAYBREAK_ICON_RAYS_PATH = [
  // top
  'M7.5 1.25 H8.5 V2.75 H7.5 Z',
  // top-right
  'M11.6 3.55 L12.45 4.4 L11.4 5.45 L10.55 4.6 Z',
  // right
  'M13.25 7.5 V8.5 H14.75 V7.5 Z',
  // bottom-right
  'M11.4 10.55 L12.45 11.6 L11.6 12.45 L10.55 11.4 Z',
  // bottom
  'M7.5 13.25 H8.5 V14.75 H7.5 Z',
  // bottom-left
  'M3.55 11.6 L4.6 10.55 L5.45 11.4 L4.4 12.45 Z',
  // left
  'M1.25 7.5 H2.75 V8.5 H1.25 Z',
  // top-left
  'M3.55 4.4 L4.4 3.55 L5.45 4.6 L4.6 5.45 Z',
].join(' ');

export const DAYBREAK_ICON_SUN_PATH = `${DAYBREAK_ICON_SUN_BODY_PATH} ${DAYBREAK_ICON_RAYS_PATH}`;

/** Plus-shaped sparkle (upper right of the sun). */
export const DAYBREAK_ICON_STAR_PATH =
  'M14.9996 4C14.9996 4.13261 14.947 4.25979 14.8532 4.35355C14.7594 4.44732 14.6322 4.5 14.4996 4.5H13.9996V5C13.9996 5.13261 13.947 5.25979 13.8532 5.35355C13.7594 5.44732 13.6322 5.5 13.4996 5.5C13.367 5.5 13.2399 5.44732 13.1461 5.35355C13.0523 5.25979 12.9996 5.13261 12.9996 5V4.5H12.4996C12.367 4.5 12.2399 4.44732 12.1461 4.35355C12.0523 4.25979 11.9996 4.13261 11.9996 4C11.9996 3.86739 12.0523 3.74021 12.1461 3.64645C12.2399 3.55268 12.367 3.5 12.4996 3.5H12.9996V3C12.9996 2.86739 13.0523 2.74021 13.1461 2.64645C13.2399 2.55268 13.367 2.5 13.4996 2.5C13.6322 2.5 13.7594 2.55268 13.8532 2.64645C13.947 2.74021 13.9996 2.86739 13.9996 3V3.5H14.4996C14.6322 3.5 14.7594 3.55268 14.8532 3.64645C14.947 3.74021 14.9996 3.86739 14.9996 4Z';

export interface DaybreakNavIconSvgOptions {
  size?: number;
  startColor?: string;
  endColor?: string;
  /** When set, all paths are filled with this solid colour and the gradient is ignored. */
  solidColor?: string;
  gradientId?: string;
}

/**
 * Return an inline SVG string for the Daybreak nav icon. Mirrors the
 * shape of `getNightshiftNavIconSvg` so the two icons swap into the same
 * call sites with no other changes.
 */
export function getDaybreakNavIconSvg(options: DaybreakNavIconSvgOptions = {}): string {
  const {
    size = 16,
    startColor = DAYBREAK_GRADIENT_START,
    endColor = DAYBREAK_GRADIENT_END,
    solidColor,
    gradientId = GRADIENT_ID,
  } = options;

  const fillAttr = solidColor ? `fill="${solidColor}"` : `fill="url(#${gradientId})"`;

  const gradientDef = solidColor
    ? ''
    : `<defs><linearGradient id="${gradientId}" x1="0" y1="0" x2="16" y2="16" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="${startColor}"/><stop offset="1" stop-color="${endColor}"/></linearGradient></defs>`;

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="${DAYBREAK_ICON_VIEWBOX}" class="daybreak-nav-icon" aria-hidden="true">`,
    gradientDef,
    `<path d="${DAYBREAK_ICON_SUN_PATH}" ${fillAttr}/>`,
    `<path d="${DAYBREAK_ICON_STAR_PATH}" ${fillAttr}/>`,
    `</svg>`,
  ].join('');
}

/**
 * Return a `data:image/svg+xml` URL for the Daybreak nav icon. Useful for
 * places that take an `IconType` URL (EUI side nav, the management UI's
 * solution dropdown, etc.).
 */
export function getDaybreakIconDataUrl(options: DaybreakNavIconSvgOptions = {}): string {
  const svg = getDaybreakNavIconSvg(options);
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
