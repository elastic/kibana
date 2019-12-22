/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Dataset } from '../../../common/types';
import { getDatasetAssetBaseName } from './index';

test('getBaseName', () => {
  const dataset: Dataset = {
    name: 'bar',
    packageName: 'foo',
    type: 'logs',
  } as Dataset;
  const name = getDatasetAssetBaseName(dataset);
  expect(name).toStrictEqual('logs-default-foo-bar');
});
