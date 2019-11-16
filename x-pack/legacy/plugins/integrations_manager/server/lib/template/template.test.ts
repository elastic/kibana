/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getTemplate } from './template';

test('get template', () => {
  const pattern = 'logs-nginx-access-abcd-*';
  const template = getTemplate(pattern);
  expect(template.index_patterns).toStrictEqual([pattern]);
});
