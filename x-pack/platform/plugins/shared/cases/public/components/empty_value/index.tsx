/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get } from 'lodash/fp';
import React from 'react';
import type { UseEuiTheme } from '@elastic/eui';

import * as i18n from './translations';

const emptyWrapperCss = ({ euiTheme }: UseEuiTheme) => ({ color: euiTheme.colors.mediumShade });

export const getEmptyValue = () => '—';
export const getEmptyString = () => `(${i18n.EMPTY_STRING})`;

export const getEmptyCellValue = () => <span css={emptyWrapperCss}>{getEmptyValue()}</span>;
export const getEmptyStringTag = () => <span css={emptyWrapperCss}>{getEmptyString()}</span>;

export const getOrEmptyTag = (path: string, item: unknown): JSX.Element => {
  const text = get(path, item);
  return getOrEmptyTagFromValue(text);
};

export const getOrEmptyTagFromValue = (value: string | number | null | undefined): JSX.Element => {
  if (value == null) {
    return getEmptyCellValue();
  } else if (value === '') {
    return getEmptyStringTag();
  } else {
    return <>{value}</>;
  }
};
