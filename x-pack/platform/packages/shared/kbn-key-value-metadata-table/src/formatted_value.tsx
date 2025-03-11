/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isBoolean, isNumber, isObject } from 'lodash';
import React from 'react';
import styled from '@emotion/styled';
import { i18n } from '@kbn/i18n';

const EmptyValue = styled.span`
  color: ${({ theme }) => theme.euiTheme.colors.mediumShade};
  text-align: left;
`;

export function FormattedKey({ k, value }: { k: string; value: unknown }): JSX.Element {
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
    return (
      <EmptyValue>
        {i18n.translate('keyValueMetadataTable.notAvailableLabel', {
          defaultMessage: 'N/A',
        })}
      </EmptyValue>
    );
  }

  return <React.Fragment>{value}</React.Fragment>;
}
