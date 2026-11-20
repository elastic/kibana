/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FetchContext } from '@kbn/presentation-publishing';
import { ESQLVariableType, type ESQLControlVariable } from '@kbn/esql-types';
import type { StateValues } from './data_layer';

/**
 * The named parameters a query runs with: the panel's state, and the dashboard's ES|QL control
 * variables. A state key shadows a control variable of the same name.
 */
export const toEsqlVariables = (
  context: Pick<FetchContext, 'esqlVariables'>,
  state: StateValues
): ESQLControlVariable[] => {
  const stateVariables = Object.entries(state).map(
    ([key, value]): ESQLControlVariable => ({
      key,
      type: ESQLVariableType.VALUES,
      // ES|QL accepts a JSON boolean as a parameter; the dashboard variable type only lists
      // the kinds its controls can produce.
      value: value as ESQLControlVariable['value'],
    })
  );
  const dashboardVariables = (context.esqlVariables ?? []).filter(({ key }) => !(key in state));
  return [...dashboardVariables, ...stateVariables];
};
