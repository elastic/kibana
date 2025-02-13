/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FunctionComponent, useCallback, useEffect } from 'react';
import PropTypes from 'prop-types';
import { EuiSwitch, EuiSwitchEvent } from '@elastic/eui';
import { ExpressionAstExpression } from '@kbn/expressions-plugin/common';
import { set } from '@kbn/safer-lodash-set';
import { defaultExpression } from './default_expression';
import { getFieldPath, getFieldValue } from './utils';

export interface Props {
  onValueChange: (argValue: ExpressionAstExpression) => void;
  argValue: null | ExpressionAstExpression;
}

const SHOW_FIELD = 'show';

export const SimpleTemplate: FunctionComponent<Props> = ({ onValueChange, argValue }) => {
  const showValuePath = getFieldPath(SHOW_FIELD);

  useEffect(() => {
    if (!argValue) {
      onValueChange(defaultExpression());
    }
  }, [argValue, onValueChange]);

  const onToggle = useCallback(
    (event: EuiSwitchEvent) => {
      const oldArgValue = argValue ?? defaultExpression();
      const newArgValue = set(oldArgValue, showValuePath, event.target.checked);

      onValueChange(newArgValue);
    },
    [argValue, onValueChange, showValuePath]
  );

  const showLabels = getFieldValue(argValue, SHOW_FIELD, false) as boolean;

  return (
    <EuiSwitch compressed checked={showLabels} onChange={onToggle} showLabel={false} label="" />
  );
};

SimpleTemplate.propTypes = {
  onValueChange: PropTypes.func.isRequired,
  argValue: PropTypes.oneOfType([PropTypes.bool, PropTypes.object]).isRequired,
};

SimpleTemplate.displayName = 'PartitionLabelsSimpleArg';
