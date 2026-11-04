/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css, type SerializedStyles } from '@emotion/react';

const TYPE_FIELD_BASIS = 200;
const FIELD_MIN_WIDTH = 200;
const DEFAULT_INSET = '0px';

/**
 * Width needed by `fieldCount` fields and the gutters between them. `inset` is extra width to
 * require, so a row that renders in a wider container than another (for example without the
 * padding the field mapping editor puts around its form) switches layouts at the same viewport
 * width.
 */
const getCombinedMinWidth = (fieldCount: number, gutter: string, inset: string): string =>
  `calc(${fieldCount * FIELD_MIN_WIDTH}px + ${gutter} * ${fieldCount - 1} + ${inset})`;

/**
 * Styles for the flex group holding a row of fields: it is the size container that the field type
 * and remaining fields styles query.
 */
export const fieldRowContainerStyles = css({ containerType: 'inline-size' });

/**
 * Flex item styles for the field type: it keeps its width, so on narrow screens it sits alone on the
 * first row. Once the remaining fields stack into a single column it spans the full width.
 */
export const getTypeFieldItemStyles = (
  remainingFieldCount: number,
  gutter: string,
  inset: string = DEFAULT_INSET
): SerializedStyles =>
  css({
    flex: `0 1 ${TYPE_FIELD_BASIS}px`,
    [`@container (width < ${getCombinedMinWidth(remainingFieldCount, gutter, inset)})`]: {
      flexGrow: 1,
    },
  });

/**
 * Flex item styles for the group of every field except the field type. The group's basis covers all
 * of its fields plus the gutters between them, so it shares a row with the field type only when
 * they all fit, and otherwise wraps onto the next row.
 */
export const getRemainingFieldsGroupItemStyles = (
  fieldCount: number,
  gutter: string,
  inset: string = DEFAULT_INSET
): SerializedStyles => css({ flex: `1 1 ${getCombinedMinWidth(fieldCount, gutter, inset)}` });

/**
 * Grid styles for the remaining fields: equal columns while they all fit on one line, otherwise one
 * field per line (never a partially filled line).
 */
export const getRemainingFieldsGridStyles = (
  fieldCount: number,
  gutter: string,
  inset: string = DEFAULT_INSET
): SerializedStyles =>
  css({
    display: 'grid',
    alignItems: 'start',
    gap: gutter,
    gridTemplateColumns: `repeat(${fieldCount}, minmax(0, 1fr))`,
    [`@container (width < ${getCombinedMinWidth(fieldCount, gutter, inset)})`]: {
      gridTemplateColumns: 'minmax(0, 1fr)',
    },
  });
