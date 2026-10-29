/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ESQL_CONTROL } from '@kbn/controls-constants';
import type { ESQLControlVariable } from '@kbn/esql-types';
import { getESQLControlVariablesFromState } from '@kbn/esql-utils';

/** The ES|QL variables published by the ES|QL controls among a dashboard's saved controls. */
export const getEsqlVariables = (
  controls: ReadonlyArray<Record<string, unknown>>
): ESQLControlVariable[] =>
  getESQLControlVariablesFromState(
    controls.flatMap((control) => (control.type === ESQL_CONTROL ? [control.config] : []))
  );
