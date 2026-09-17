/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const pythonRound = (value: number, digits = 3): number => {
  if (!Number.isFinite(value)) return value;
  // Python rounds the exact binary float, not a float first multiplied by 10 ** digits.
  const binary = new DataView(new ArrayBuffer(8));
  binary.setFloat64(0, value);
  const bits = binary.getBigUint64(0);
  const exponentBits = Number((bits / 2n ** 52n) % 2048n);
  const significand = (bits % 2n ** 52n) + (exponentBits ? 2n ** 52n : 0n);
  const exponent = (exponentBits || 1) - 1023 - 52;
  const numerator = significand * 10n ** BigInt(digits) * 2n ** BigInt(Math.max(0, exponent));
  const denominator = 2n ** BigInt(Math.max(0, -exponent));
  const quotient = numerator / denominator;
  const remainder = (numerator % denominator) * 2n;
  const increment = remainder > denominator || (remainder === denominator && quotient % 2n === 1n);
  const rounded = Number(quotient + (increment ? 1n : 0n)) / 10 ** digits;
  return bits / 2n ** 63n ? -rounded : rounded;
};
export const pythonFormat = (value: number, digits: number): string =>
  pythonRound(value, digits).toFixed(digits);
export const pythonBool = (value: boolean): string => (value ? 'True' : 'False');

/** Formats a Python string repr, including quote choice and nonprintable characters. */
export const pythonRepr = (value: string): string => {
  const quote = value.includes("'") && !value.includes('"') ? '"' : "'";
  const escaped = Array.from(value, (character) => {
    if (character === quote || character === '\\') return `\\${character}`;
    if (character === '\n') return '\\n';
    if (character === '\r') return '\\r';
    if (character === '\t') return '\\t';
    if (/[^\p{C}\p{Z}]/u.test(character) || character === ' ') return character;
    const code = character.codePointAt(0) ?? 0;
    if (code <= 0xff) return `\\x${code.toString(16).padStart(2, '0')}`;
    if (code <= 0xffff) return `\\u${code.toString(16).padStart(4, '0')}`;
    return `\\U${code.toString(16).padStart(8, '0')}`;
  }).join('');
  return `${quote}${escaped}${quote}`;
};

export const pythonList = (values: readonly string[]): string =>
  `[${values.map(pythonRepr).join(', ')}]`;
export const pythonSlice = (value: string, end: number): string =>
  Array.from(value).slice(0, end).join('');
