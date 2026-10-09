/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css, type SerializedStyles } from '@emotion/react';

export const TYPE_FIELD_BASIS = 200;
export const NAME_FIELD_BASIS = 240;
export const PATH_FIELD_BASIS = 260;
export const FORMAT_FIELD_BASIS = 260;

// Fixed-size fields keep their basis width while sharing a row (the much larger grow weight of
// text fields absorbs the free space), yet still fill the row when wrapped onto a line alone.
const FIXED_FIELD_GROW = 1;
const TEXT_FIELD_GROW = 10000;

/** Flex item styles for a fixed-width field that fills its row only when alone on it. */
export const getFixedFieldItemStyles = (basis: number): SerializedStyles =>
  css({ flex: `${FIXED_FIELD_GROW} 1 ${basis}px` });

/** Flex item styles for a text field that absorbs the free space of the row it shares. */
export const getTextFieldItemStyles = (basis: number): SerializedStyles =>
  css({ flex: `${TEXT_FIELD_GROW} 1 ${basis}px` });

const getCombinedBasis = (fieldBases: readonly number[], gutter: string): string =>
  `calc(${fieldBases.map((basis) => `${basis}px`).join(' + ')} + ${gutter} * ${
    fieldBases.length - 1
  })`;

/**
 * Flex item styles for a group of fields that wraps as a unit: its basis covers every field plus
 * the gutters between them, so groups only share a row when all of their fields fit.
 */
export const getFieldGroupItemStyles = (
  fieldBases: readonly number[],
  gutter: string
): SerializedStyles => css({ flex: `1 1 ${getCombinedBasis(fieldBases, gutter)}` });

/** Styles for a flex group whose children query its width via `@container`. */
export const fieldRowContainerStyles = css({ containerType: 'inline-size' });

/**
 * Flex item styles for a fixed-width field that keeps its width even when wrapped onto a row alone,
 * and only fills the row once the container is too narrow for the given sibling group to fit.
 */
export const getFixedUntilNarrowFieldItemStyles = (
  basis: number,
  siblingGroupBases: readonly number[],
  gutter: string
): SerializedStyles =>
  css({
    flex: `0 1 ${basis}px`,
    [`@container (width < ${getCombinedBasis(siblingGroupBases, gutter)})`]: {
      flexGrow: 1,
    },
  });
