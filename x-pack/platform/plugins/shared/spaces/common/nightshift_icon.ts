/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Branding assets for the experimental Nightshift solution view.
 *
 * Nightshift is a prototype that currently reuses (a trimmed version of) the
 * Observability navigation tree. Its icon is a moon + sparkles drawn in the
 * AI Agent button's saturated blue → purple gradient (`#1750BA → #6B3C9F`),
 * on a transparent background. Callers in `common` (data URLs, embeddable
 * SVG strings) and `public` (React components) share this single asset.
 */

/** Start color of the Nightshift gradient (blue). Matches AI Agent button. */
export const NIGHTSHIFT_GRADIENT_START = '#1750BA';
/** End color of the Nightshift gradient (purple). Matches AI Agent button. */
export const NIGHTSHIFT_GRADIENT_END = '#6B3C9F';

/**
 * Lighter gradient variant used when the icon sits on a dark-mode background
 * (e.g. the highlighted Nightshift home button in the side nav). Matches the
 * AI Agent button's `textPrimary`/`textAssistance` tokens in dark mode.
 */
export const NIGHTSHIFT_GRADIENT_START_ON_DARK = '#61A2FF';
export const NIGHTSHIFT_GRADIENT_END_ON_DARK = '#C5A5FA';

const GRADIENT_ID = 'nightshiftMoonGradient';

/**
 * Builds an SVG markup string that renders the Nightshift icon: a crescent
 * moon with two sparkles, filled with the Nightshift gradient, on a
 * transparent background.
 *
 * @param size The width/height of the SVG (square). Defaults to 16.
 * @param startColor Optional gradient start color override.
 * @param endColor Optional gradient end color override.
 * @param solidColor If provided, skips the gradient and renders the moon
 *   with this single solid fill (e.g. `'#FFFFFF'` for the selected state).
 *   Overrides `startColor` / `endColor` when set.
 */
export function getNightshiftIconSvg({
  size = 16,
  startColor = NIGHTSHIFT_GRADIENT_START,
  endColor = NIGHTSHIFT_GRADIENT_END,
  solidColor,
}: {
  size?: number;
  startColor?: string;
  endColor?: string;
  solidColor?: string;
} = {}): string {
  const fill = solidColor ?? `url(#${GRADIENT_ID})`;
  const gradientDef = solidColor
    ? ''
    : `<defs>
    <linearGradient id="${GRADIENT_ID}" x1="0.582498" y1="-0.452642" x2="13.3945" y2="11.0631" gradientUnits="userSpaceOnUse">
      <stop offset="0.168292" stop-color="${startColor}"/>
      <stop offset="0.83" stop-color="${endColor}"/>
    </linearGradient>
  </defs>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 16 16" fill="none">
  ${gradientDef}
  <path d="M14.9996 6C14.9996 6.13261 14.947 6.25979 14.8532 6.35355C14.7594 6.44732 14.6322 6.5 14.4996 6.5H13.4996V7.5C13.4996 7.63261 13.447 7.75979 13.3532 7.85355C13.2594 7.94732 13.1322 8 12.9996 8C12.867 8 12.7399 7.94732 12.6461 7.85355C12.5523 7.75979 12.4996 7.63261 12.4996 7.5V6.5H11.4996C11.367 6.5 11.2399 6.44732 11.1461 6.35355C11.0523 6.25979 10.9996 6.13261 10.9996 6C10.9996 5.86739 11.0523 5.74021 11.1461 5.64645C11.2399 5.55268 11.367 5.5 11.4996 5.5H12.4996V4.5C12.4996 4.36739 12.5523 4.24021 12.6461 4.14645C12.7399 4.05268 12.867 4 12.9996 4C13.1322 4 13.2594 4.05268 13.3532 4.14645C13.447 4.24021 13.4996 4.36739 13.4996 4.5V5.5H14.4996C14.6322 5.5 14.7594 5.55268 14.8532 5.64645C14.947 5.74021 14.9996 5.86739 14.9996 6ZM8.99964 3.5H9.49964V4C9.49964 4.13261 9.55232 4.25979 9.64609 4.35355C9.73985 4.44732 9.86703 4.5 9.99964 4.5C10.1322 4.5 10.2594 4.44732 10.3532 4.35355C10.447 4.25979 10.4996 4.13261 10.4996 4V3.5H10.9996C11.1322 3.5 11.2594 3.44732 11.3532 3.35355C11.447 3.25979 11.4996 3.13261 11.4996 3C11.4996 2.86739 11.447 2.74021 11.3532 2.64645C11.2594 2.55268 11.1322 2.5 10.9996 2.5H10.4996V2C10.4996 1.86739 10.447 1.74021 10.3532 1.64645C10.2594 1.55268 10.1322 1.5 9.99964 1.5C9.86703 1.5 9.73985 1.55268 9.64609 1.64645C9.55232 1.74021 9.49964 1.86739 9.49964 2V2.5H8.99964C8.86703 2.5 8.73985 2.55268 8.64609 2.64645C8.55232 2.74021 8.49964 2.86739 8.49964 3C8.49964 3.13261 8.55232 3.25979 8.64609 3.35355C8.73985 3.44732 8.86703 3.5 8.99964 3.5ZM13.5478 9.5625C13.606 9.63026 13.645 9.71238 13.6607 9.80031C13.6764 9.88824 13.6683 9.97877 13.6371 10.0625C13.2902 11.0087 12.7105 11.8522 11.9516 12.5153C11.1926 13.1784 10.2789 13.6396 9.29471 13.8564C8.31052 14.0732 7.28756 14.0386 6.32026 13.7558C5.35296 13.473 4.47247 12.9512 3.76006 12.2383C3.04765 11.5255 2.52626 10.6447 2.24401 9.67728C1.96177 8.70982 1.92776 7.68685 2.14513 6.70277C2.3625 5.7187 2.82424 4.80524 3.48775 4.04668C4.15125 3.28812 4.99513 2.70891 5.94152 2.3625C6.02481 2.33199 6.11473 2.3242 6.20203 2.33991C6.28934 2.35562 6.37089 2.39428 6.43833 2.45192C6.50576 2.50956 6.55665 2.5841 6.58576 2.66789C6.61488 2.75169 6.62118 2.84172 6.60402 2.92875C6.4288 3.81561 6.47471 4.73196 6.73768 5.59687C7.00065 6.46177 7.4726 7.24859 8.11183 7.88781C8.75105 8.52704 9.53787 8.99899 10.4028 9.26196C11.2677 9.52494 12.184 9.57084 13.0709 9.39563C13.158 9.37859 13.2481 9.38507 13.332 9.4144C13.4158 9.44373 13.4903 9.49485 13.5478 9.5625ZM12.3359 10.4925C12.224 10.4981 12.1115 10.5013 11.9996 10.5013C10.2761 10.4994 8.62364 9.81385 7.40502 8.59499C6.18639 7.37613 5.50113 5.72357 5.49964 4C5.49964 3.88813 5.49964 3.77562 5.50839 3.66375C4.84313 4.04657 4.27493 4.57741 3.84783 5.21514C3.42072 5.85287 3.14616 6.58037 3.04543 7.34127C2.9447 8.10218 3.0205 8.87606 3.26696 9.60295C3.51342 10.3299 3.92392 10.9903 4.46665 11.533C5.00939 12.0757 5.66979 12.4862 6.39669 12.7327C7.12358 12.9791 7.89746 13.0549 8.65837 12.9542C9.41927 12.8535 10.1468 12.5789 10.7845 12.1518C11.4222 11.7247 11.9531 11.1565 12.3359 10.4913V10.4925Z" fill="${fill}"/>
</svg>`;
}

/**
 * Returns the Nightshift icon as a `data:image/svg+xml;utf8,...` URL suitable
 * for passing to `EuiAvatar.imageUrl`, `EuiIcon.type`, `<img src>` etc.
 */
export function getNightshiftIconDataUrl(
  options?: Parameters<typeof getNightshiftIconSvg>[0]
): string {
  return `data:image/svg+xml;utf8,${encodeURIComponent(getNightshiftIconSvg(options))}`;
}
