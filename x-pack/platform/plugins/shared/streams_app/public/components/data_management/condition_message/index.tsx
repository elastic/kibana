/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  Condition,
  isAlwaysCondition,
  isAndCondition,
  isBinaryFilterCondition,
  isFilterCondition,
  isNeverCondition,
} from '@kbn/streams-schema';
import React from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

export function ConditionMessage({ condition }: { condition: Condition }) {
  if (isAlwaysCondition(condition) || isNeverCondition(condition)) {
    return '';
  }

  if (isFilterCondition(condition)) {
    if (isBinaryFilterCondition(condition)) {
      return i18n.translate('xpack.streams.filterDisplay.binary', {
        defaultMessage: '{field} {operator} {value}',
        values: {
          field: condition.field,
          operator: condition.operator,
          value: condition.value,
        },
      });
    } else {
      return i18n.translate('xpack.streams.filterDisplay.unary', {
        defaultMessage: '{field} {operator}',
        values: {
          field: condition.field,
          operator: condition.operator,
        },
      });
    }
  } else if (isAndCondition(condition)) {
    if (condition.and.length === 0) {
      return '';
    }

    if (condition.and.length === 1) {
      return <ConditionMessage condition={condition.and[0]} />;
    }
    return (
      <FormattedMessage
        id="xpack.streams.andDisplay.andLabel"
        defaultMessage="{left} and {right}"
        values={{
          left: <ConditionMessage condition={condition.and[0]} />,
          right: (
            <ConditionMessage
              condition={{
                ...condition,
                and: condition.and.slice(1),
              }}
            />
          ),
        }}
      />
    );
  }
  if (condition.or.length === 0) {
    return '';
  }

  if (condition.or.length === 1) {
    return <ConditionMessage condition={condition.or[0]} />;
  }
  return (
    <FormattedMessage
      id="xpack.streams.orDisplay.orLabel"
      defaultMessage="{left} or {right}"
      values={{
        left: <ConditionMessage condition={condition.or[0]} />,
        right: <ConditionMessage condition={condition.or[1]} />,
      }}
    />
  );
}
