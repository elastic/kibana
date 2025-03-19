/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// eslint-disable-next-line @kbn/imports/no_boundary_crossing
import { describe, apiTest, tags, failsMki } from '@kbn/scout-api-tests';
// see details: Just forcing a skip to demonstrate
describe.skipIf(failsMki(true))(`@maps some suite failing mki ${tags.DEPLOYMENT_AGNOSTIC}`, () => {
  apiTest(`Some conditionally skipped test`, ({ expect }) => {
    expect('this test will be skipped').toBeTruthy();
  });
});
