/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { once } from 'lodash';
import { getRawPatternMap } from '../grok/parse_patterns';
import { PATTERN_OVERRIDES } from './pattern_precedence';

export type GrokRegexMap = Record<
  string,
  {
    complete: RegExp;
    partial: RegExp;
  }
>;

export const buildGrokRegexMap = once(function buildRegexMap(): GrokRegexMap {
  const rawMap = {
    ...getRawPatternMap(),
    ...PATTERN_OVERRIDES,
  };

  const compiled: GrokRegexMap = {};
  Object.keys(rawMap).forEach((key) => {
    const raw = rawMap[key];
    // convert atomic (not supported in JS) to non‑capturing
    const sanitized = raw.replace(/\(\?>/g, '(?:');
    compiled[key] = {
      complete: new RegExp(`^${sanitized}$`),
      partial: new RegExp(sanitized),
    };
  });

  return compiled;
});
