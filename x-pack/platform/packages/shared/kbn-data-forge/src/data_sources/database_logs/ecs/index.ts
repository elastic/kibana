/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import template from '../template.json';
import type { IndexTemplateDef } from '../../../types';

export const indexTemplate: IndexTemplateDef = {
  name: 'logs-database_logs@template',
  template,
  components: [],
};
