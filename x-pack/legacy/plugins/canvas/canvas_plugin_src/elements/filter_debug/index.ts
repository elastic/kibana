/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ElementFactory } from '../../../types';

export const filterDebug: ElementFactory = () => ({
  name: 'filterDebug',
  displayName: 'Debug filter',
  help: 'Shows the underlying global filters in a workpad',
  icon: 'bug',
  expression: `filters
| render as=debug`,
});
