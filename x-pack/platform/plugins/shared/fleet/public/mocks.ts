/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiTheme } from '@kbn/kibana-react-plugin/common';
import type { RecursivePartial } from '@elastic/eui/src/components/common';

import { createStartMock } from './mock';

export const getMockTheme = (partialTheme: RecursivePartial<EuiTheme>): EuiTheme =>
  partialTheme as EuiTheme;

export const fleetMock = {
  createStartMock,
};
