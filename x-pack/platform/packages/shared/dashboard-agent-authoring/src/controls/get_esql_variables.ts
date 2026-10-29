/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ESQL_CONTROL } from '@kbn/controls-constants';
import type { ESQLControlVariable } from '@kbn/esql-types';
import { getESQLControlVariablesFromState } from '@kbn/esql-utils';

/**
 * The ES|QL variables a dashboard's saved controls publish, so a panel whose query refers to
 * `?name` can be run by a tool that edits the dashboard and has only the saved state to read the
 * values from. Each ES|QL variable control becomes one variable; other controls are skipped.
 *
 * The saved controls are not validated here: an entry with no `config`, or one that is not shaped
 * like an ES|QL control, is skipped by the conversion (`getESQLControlVariablesFromState`).
 */
export const getEsqlVariables = (
  controls: ReadonlyArray<Record<string, unknown>>
): ESQLControlVariable[] =>
  getESQLControlVariablesFromState(
    controls.flatMap((control) => (control.type === ESQL_CONTROL ? [control.config] : []))
  );
