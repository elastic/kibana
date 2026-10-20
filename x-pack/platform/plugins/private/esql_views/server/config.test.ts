/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { config } from './config';

describe('ES|QL Views config', () => {
  it('exposes only the management UI setting to the browser', () => {
    expect(config.exposeToBrowser).toEqual({
      managementUi: true,
    });
  });

  it('disables the management UI by default', () => {
    expect(config.schema.validate({})).toEqual({
      managementUi: { enabled: false },
    });
  });

  it('allows the management UI to be enabled', () => {
    expect(
      config.schema.validate({
        managementUi: { enabled: true },
      })
    ).toEqual({
      managementUi: { enabled: true },
    });
  });
});
