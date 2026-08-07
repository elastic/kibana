/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Shared helper for reading computed colors off the DOM (metric / datatable). */
export const normalizeComputedColor = (color: string | undefined): string | undefined => {
  if (!color) {
    return undefined;
  }

  const rgbMatch = color.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);
  if (rgbMatch) {
    return `rgba(${rgbMatch[1]}, ${rgbMatch[2]}, ${rgbMatch[3]}, 1)`;
  }

  return color;
};

/** Shared helper for reading inline `style` attributes (metric / datatable). */
export const parseInlineStyle = (styleString: string): Record<string, string> => {
  return styleString.split(';').reduce<Record<string, string>>((memo, cssLine) => {
    const [prop, value] = cssLine.split(':');
    if (prop && value) {
      memo[prop.trim()] = value.trim();
    }
    return memo;
  }, {});
};
