/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { VISUALIZATION_COLORS } from '@elastic/eui';
import { Space } from '../../common/model/space';
import { MAX_SPACE_INITIALS } from '../../common';

// code point for lowercase "a"
const FALLBACK_CODE_POINT = 97;

/**
 * Determines the color for the provided space.
 * If a color is present on the Space itself, then that is used.
 * Otherwise, a color is provided from EUI's Visualization Colors based on the space name.
 *
 * @param {Space} space
 */
export function getSpaceColor(space: Partial<Space> = {}) {
  const { color, name = '' } = space;

  if (color) {
    return color;
  }

  const firstCodePoint = name.codePointAt(0) || FALLBACK_CODE_POINT;

  return VISUALIZATION_COLORS[firstCodePoint % VISUALIZATION_COLORS.length];
}

/**
 * Determines the initials for the provided space.
 * If initials are present on the Space itself, then that is used.
 * Otherwise, the initials are calculated based off the words in the space name, with a max length of 2 characters.
 *
 * @param {Space} space
 */
export function getSpaceInitials(space: Partial<Space> = {}) {
  const { initials, name = '' } = space;

  if (initials) {
    return initials;
  }

  const words = name.split(' ');

  const numInitials = Math.min(MAX_SPACE_INITIALS, words.length);

  words.splice(numInitials, words.length);

  return words.map(word => word.substring(0, 1)).join('');
}

/**
 * Determines the avatar image for the provided space.
 *
 * @param {Space} space
 */
export function getSpaceImageUrl(space: Partial<Space> = {}) {
  const { imageUrl } = space;

  if (imageUrl) {
    return imageUrl;
  }

  return '';
}
