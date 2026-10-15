/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getImportedFailureStore } from './get_imported_failure_store';

describe('getImportedFailureStore', () => {
  it('keeps the failure store disabled', () => {
    expect(getImportedFailureStore({ disabled: {} })).toEqual({ disabled: {} });
  });

  it('copies an explicit retention', () => {
    expect(
      getImportedFailureStore({
        lifecycle: { enabled: { data_retention: '60d', is_default_retention: false } },
      })
    ).toEqual({ lifecycle: { enabled: { data_retention: '60d' } } });
  });

  it('copies a default-derived retention explicitly', () => {
    expect(
      getImportedFailureStore({
        lifecycle: { enabled: { data_retention: '30d', is_default_retention: true } },
      })
    ).toEqual({ lifecycle: { enabled: { data_retention: '30d' } } });
  });

  it('keeps an indefinite failure store lifecycle disabled', () => {
    expect(getImportedFailureStore({ lifecycle: { disabled: {} } })).toEqual({
      lifecycle: { disabled: {} },
    });
  });

  it('falls back to disabled when enabled without a resolvable retention', () => {
    expect(
      getImportedFailureStore({
        lifecycle: { enabled: { is_default_retention: true } },
      })
    ).toEqual({ lifecycle: { disabled: {} } });
  });
});
