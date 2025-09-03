/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { maskCapturingBrackets } from './mask_capturing_brackets';
import { maskQuotes } from './mask_quotes';
import { FIRST_PASS_PATTERNS } from '../constants';
import { GROK_REGEX_MAP } from '../constants';
import type { MaskedMessage } from '../types';

const FIRST_PASS_REGEXES = Object.fromEntries(
  FIRST_PASS_PATTERNS.map((pattern) => {
    const original = GROK_REGEX_MAP[pattern];
    const global = new RegExp(original.partial, 'g');
    return [pattern, global];
  })
);

/**
 * Processes a given message string to mask specific patterns (e.g., IP addresses, URIs,
 * delimited content like brackets or quotes) using predefined regex patterns.
 * Matches are replaced with placeholders, and the original values are stored in a `literals` array.
 *
 * @param message - The input string to be masked.
 * @returns An object containing the masked string and the array of original literals.
 */
export function maskFirstPassPatterns(message: string): MaskedMessage {
  const literals: string[] = [];
  let masked = message;

  // Create the replacement function once
  const createCaptureGroup = (pattern: string, match: string) => {
    literals.push(match);
    return `%{${pattern}:${literals.length - 1}}`;
  };

  // Process patterns in a single loop
  for (const pattern of FIRST_PASS_PATTERNS) {
    const regex = FIRST_PASS_REGEXES[pattern];
    masked = masked.replaceAll(regex, (match) => createCaptureGroup(pattern, match));
  }

  // doing this with regexes is terrible for performance, so we just use plain ole' looping
  masked = maskQuotes(masked, (match) => createCaptureGroup('CAPTUREGROUP', match));
  masked = maskCapturingBrackets(masked, (match) => createCaptureGroup('CAPTUREGROUP', match));

  return { literals, masked };
}

/**
 * Restores the original values in a masked string by replacing placeholders with their corresponding
 * values from the `literals` array.
 *
 * @param masked - The masked string containing placeholders.
 * @param literals - The array of original values to restore.
 * @returns The restored string with placeholders replaced by their original values.
 */
export function restoreMaskedPatterns(masked: string, literals: string[]): string {
  let out = masked;
  literals.forEach((val, idx) => {
    out = out.replace(new RegExp(`%\\{[A-Za-z0-9_]+\\:${idx}\\}`), val);
  });
  return out;
}
