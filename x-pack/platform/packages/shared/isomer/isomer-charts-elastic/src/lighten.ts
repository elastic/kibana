/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const MAX_LIGHTNESS = 0.93;
const MAX_LIGHTNESS_SPACE = 0.2;

const toHsl = (hex: string): [number, number, number] => {
  const [r, g, b] = [1, 3, 5].map((at) => Number.parseInt(hex.slice(at, at + 2), 16) / 255) as [
    number,
    number,
    number
  ];
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) {
    return [0, 0, l];
  }
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h =
    max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h * 60, s, l];
};

const toHex = (h: number, s: number, l: number): string => {
  const a = s * Math.min(l, 1 - l);
  const channel = (n: number) => {
    const k = (n + h / 30) % 12;
    const value = l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
    return Math.round(value * 255)
      .toString(16)
      .padStart(2, '0');
  };
  return `#${channel(0)}${channel(8)}${channel(4)}`;
};

/** Kibana's `lightenColor`: deeper levels of a partition step toward a lighter shade of their top-level color. */
export const lightenColor = (color: string, step: number, totalSteps: number): string => {
  if (totalSteps === 1 || !/^#[0-9a-fA-F]{6}/.test(color)) {
    return color;
  }
  const [h, s, l] = toHsl(color);
  const space = Math.min(MAX_LIGHTNESS - l, MAX_LIGHTNESS_SPACE);
  return toHex(h, s, l + space * ((step - 1) / (totalSteps - 1)));
};
