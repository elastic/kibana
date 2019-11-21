/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { metrics } from '../';

describe('Metrics', () => {
  it('should export metric objects that match a snapshot', () => {
    expect(metrics).toMatchSnapshot();
  });
});
