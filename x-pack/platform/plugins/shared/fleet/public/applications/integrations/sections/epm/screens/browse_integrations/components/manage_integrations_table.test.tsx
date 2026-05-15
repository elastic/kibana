/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getStatusDisplay } from './manage_integrations_table';

describe('getStatusDisplay', () => {
  it('uses distinct labels for failed and cancelled integrations', () => {
    expect(getStatusDisplay('failed')).toEqual(
      expect.objectContaining({
        color: 'danger',
        iconType: 'cross',
        label: 'Failed',
      })
    );
    expect(getStatusDisplay('cancelled')).toEqual(
      expect.objectContaining({
        color: 'danger',
        iconType: 'cross',
        label: 'Cancelled',
      })
    );
  });
});
