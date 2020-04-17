/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ElementFactory } from '../../../types';

export const dropdownFilter: ElementFactory = () => ({
  name: 'dropdownFilter',
  displayName: 'Dropdown select',
  type: 'filter',
  help: 'A dropdown from which you can select values for an "exactly" filter',
  icon: 'filter',
  height: 50,
  expression: `demodata
| dropdownControl valueColumn=project filterColumn=project | render`,
  filter: '',
});
