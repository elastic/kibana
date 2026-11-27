/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MAX_SPACE_INITIALS, MAX_SPACE_INITIALS_CODE_UNITS } from '../constants';

const graphemeSegmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' });

/**
 * Splits a string into graphemes (user-perceived characters), so an emoji with a skin tone counts as one.
 */
export const getGraphemes = (value: string): string[] =>
  Array.from(graphemeSegmenter.segment(value), ({ segment }) => segment);

/**
 * Checks that space avatar initials are at most {@link MAX_SPACE_INITIALS} graphemes.
 */
export const isValidSpaceInitials = (initials: string): boolean =>
  initials.length <= MAX_SPACE_INITIALS_CODE_UNITS &&
  getGraphemes(initials).length <= MAX_SPACE_INITIALS;
