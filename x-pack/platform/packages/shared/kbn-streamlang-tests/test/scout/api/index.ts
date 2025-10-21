/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { mergeTests, apiTest } from '@kbn/scout';

import { esqlFixture } from './fixtures/esql_fixture';
import { testBedFixture } from './fixtures/test_bed_fixture';

export const streamlangApiTest = mergeTests(apiTest, esqlFixture, testBedFixture);
