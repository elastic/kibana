/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const rem = 14;

export function px(value: number): string {
  return `${value}px`;
}

export function percent(value: number): string {
  return `${value}%`;
}

export function pxToRem(value: number): string {
  return `${value / rem}rem`;
}

export const colors = {
  textBlue: '#0079A5',
  borderGrey: '#D9D9D9',
  white: '#fff',
  textGrey: '#3F3F3F',
};

export const fontSizes = {
  small: '10px',
  normal: '1rem',
  large: '18px',
  xlarge: '2rem',
};

export const fontFamily = 'SFProText-Regular';
