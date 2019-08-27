/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// Units
export const unit = 16;

export const units = {
  unit,
  eighth: unit / 8,
  quarter: unit / 4,
  half: unit / 2,
  minus: unit * 0.75,
  plus: unit * 1.5,
  double: unit * 2,
  triple: unit * 3,
  quadruple: unit * 4
};

export function px(value: number): string {
  return `${value}px`;
}

export function pct(value: number): string {
  return `${value}%`;
}

// Styling
export const borderRadius = '4px';

// Fonts
export const fontFamily = '"Open Sans", Helvetica, Arial, sans-serif';
export const fontFamilyCode =
  '"SFMono-Regular", Consolas, "Liberation Mono", Menlo, Courier, monospace';

// Font sizes
export const fontSize = '14px';

export const fontSizes = {
  tiny: '10px',
  small: '12px',
  large: '16px',
  xlarge: '20px',
  xxlarge: '30px'
};

export function truncate(width: string) {
  return `
      max-width: ${width};
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    `;
}
