/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import theme from '@elastic/eui/dist/eui_theme_light.json';
import { isBoolean, isNumber, isObject } from 'lodash';
import React from 'react';
import styled from 'styled-components';
import { NOT_AVAILABLE_LABEL } from '../../../../common/i18n';

const EmptyValue = styled.span`
  color: ${theme.euiColorMediumShade};
  text-align: left;
`;

export function FormattedKey({
  k,
  value
}: {
  k: string;
  value: unknown;
}): JSX.Element {
  if (value == null) {
    return <EmptyValue>{k}</EmptyValue>;
  }

  return <React.Fragment>{k}</React.Fragment>;
}

export function FormattedValue({ value }: { value: any }): JSX.Element {
  if (isObject(value)) {
    return <pre>{JSON.stringify(value, null, 4)}</pre>;
  } else if (isBoolean(value) || isNumber(value)) {
    return <React.Fragment>{String(value)}</React.Fragment>;
  } else if (!value) {
    return <EmptyValue>{NOT_AVAILABLE_LABEL}</EmptyValue>;
  }

  return <React.Fragment>{value}</React.Fragment>;
}
