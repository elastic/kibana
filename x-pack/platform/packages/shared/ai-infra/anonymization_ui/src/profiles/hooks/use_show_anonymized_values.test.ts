/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, renderHook } from '@testing-library/react';
import { useShowAnonymizedValues } from './use_show_anonymized_values';

describe('useShowAnonymizedValues', () => {
  it('toggles representation mode', () => {
    const { result } = renderHook(() => useShowAnonymizedValues(false));
    expect(result.current.showAnonymizedValues).toBe(false);

    act(() => {
      result.current.toggle();
    });
    expect(result.current.showAnonymizedValues).toBe(true);
  });
});
