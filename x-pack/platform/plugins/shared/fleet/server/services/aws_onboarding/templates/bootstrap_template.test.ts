/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import fs from 'fs';
import path from 'path';

import { BOOTSTRAP_TEMPLATE_YAML } from './bootstrap_template';

it('ships the same template as the YAML file next to it', () => {
  const yaml = fs.readFileSync(
    path.join(__dirname, 'kibana_managed_onboarding_bootstrap.yml'),
    'utf8'
  );
  expect(BOOTSTRAP_TEMPLATE_YAML).toBe(yaml);
});
