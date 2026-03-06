/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isBoolean, isNumber, isObject, isString } from 'lodash';
import moment from 'moment-timezone';
import React from 'react';
import styled from '@emotion/styled';
import { i18n } from '@kbn/i18n';

const TIMESTAMP_FORMAT = 'MMM D, YYYY @ HH:mm:ss.SSS';

const EmptyValue = styled.span`
  color: ${({ theme }) => theme.euiTheme.colors.textSubdued};
  text-align: left;
`;

export function FormattedKey({ k, value }: { k: string; value: unknown }): JSX.Element {
  if (value == null) {
    return <EmptyValue>{k}</EmptyValue>;
  }

  return <React.Fragment>{k}</React.Fragment>;
}

export function FormattedValue({ value, keyName }: { value: any; keyName: string }): JSX.Element {
  if (isObject(value)) {
    return <pre>{JSON.stringify(value, null, 4)}</pre>;
  } else if (isBoolean(value) || isNumber(value)) {
    return <React.Fragment>{String(value)}</React.Fragment>;
  } else if (keyName === '@timestamp' && isString(value) && moment(value).isValid()) {
    return <React.Fragment>{moment(value).utc().format(TIMESTAMP_FORMAT)}</React.Fragment>;
  } else if (isString(value) && moment(value).isValid()) {
    return <React.Fragment>{moment(value).format(TIMESTAMP_FORMAT)}</React.Fragment>;
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
