/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, useState, useEffect } from 'react';

// @ts-ignore
import { ExpressionInput } from '../../../../components/expression_input/expression_input';

import { getFunctionDefinitions } from '../lib/functions';
import { useExpressions, useExpressionsActions } from '../hooks/use_expressions';

export const Editor: FC = () => {
  const functionDefinitions = getFunctionDefinitions();
  const { expression: storeValue } = useExpressions();
  const { setExpression } = useExpressionsActions();
  const [value, setValue] = useState(storeValue);

  const onChange = (newValue?: string) => setValue(newValue || '');

  useEffect(() => {
    setExpression(value);
  }, [value]);

  useEffect(() => {
    setValue(storeValue);
  }, [storeValue]);

  return <ExpressionInput isCompact {...{ functionDefinitions, value, onChange }} />;
};
