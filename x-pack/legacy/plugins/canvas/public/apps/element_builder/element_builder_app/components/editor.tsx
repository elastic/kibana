/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC } from 'react';

// @ts-ignore
import { ExpressionInput } from '../../../../components/expression_input/expression_input';

import { getFunctionDefinitions } from '../lib/functions';
import { useExpressions, useExpressionsActions } from '../hooks/use_expressions';

export const Editor: FC = () => {
  const functionDefinitions = getFunctionDefinitions();
  const { expression: value } = useExpressions();
  const { setExpression } = useExpressionsActions();

  const onChange = (changedValue?: string) => {
    console.log('new value', changedValue);
    if (changedValue && changedValue !== value) {
      console.log('setting!', changedValue, value);
      setExpression(changedValue);
    }
  };

  return <ExpressionInput isCompact {...{ functionDefinitions, value, onChange }} />;
};
