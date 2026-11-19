/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act } from '@testing-library/react';
import { TestProviders } from './mock/test_providers';
import {
  hasRequiredCustomFieldsWithoutDefault,
  useShowLegacyCustomFields,
} from './use_show_old_custom_fields';
import { LOCAL_STORAGE_KEYS } from '../../common/constants';

describe('hasRequiredCustomFieldsWithoutDefault', () => {
  it('returns false when there are no required fields without defaults', () => {
    expect(hasRequiredCustomFieldsWithoutDefault([])).toBe(false);
    expect(
      hasRequiredCustomFieldsWithoutDefault([
        { required: false },
        { required: true, defaultValue: 'x' },
        { required: true, defaultValue: 0 },
        { required: true, defaultValue: false },
      ])
    ).toBe(false);
  });

  it('returns true when a required field has no default', () => {
    expect(
      hasRequiredCustomFieldsWithoutDefault([
        { required: true },
        { required: true, defaultValue: null },
      ])
    ).toBe(true);
  });
});

describe('useShowLegacyCustomFields', () => {
  const lsKey = `securitySolution.${LOCAL_STORAGE_KEYS.showLegacyCustomFields}`;

  beforeEach(() => {
    localStorage.clear();
  });

  it('defaults to false', () => {
    const { result } = renderHook(() => useShowLegacyCustomFields(), {
      wrapper: TestProviders,
    });

    expect(result.current.showLegacyCustomFields).toBe(false);
    expect(result.current.canDisableSwitch).toBe(true);
  });

  it('persists when toggled on', () => {
    const { result } = renderHook(() => useShowLegacyCustomFields(), {
      wrapper: TestProviders,
    });

    act(() => {
      result.current.setShowLegacyCustomFields(true);
    });

    expect(result.current.showLegacyCustomFields).toBe(true);
    expect(localStorage.getItem(lsKey)).toBe('true');
  });

  it('reads an existing local storage value', () => {
    localStorage.setItem(lsKey, 'true');

    const { result } = renderHook(() => useShowLegacyCustomFields(), {
      wrapper: TestProviders,
    });

    expect(result.current.showLegacyCustomFields).toBe(true);
  });

  it('forces the switch on when required fields lack defaults', () => {
    const { result } = renderHook(
      () => useShowLegacyCustomFields([{ required: true, defaultValue: null }]),
      { wrapper: TestProviders }
    );

    expect(result.current.showLegacyCustomFields).toBe(true);
    expect(result.current.canDisableSwitch).toBe(false);

    act(() => {
      result.current.setShowLegacyCustomFields(false);
    });

    expect(result.current.showLegacyCustomFields).toBe(true);
    expect(result.current.canDisableSwitch).toBe(false);
  });
});
