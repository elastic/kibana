/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { coreMock } from '@kbn/core/public/mocks';
import { useService } from '@kbn/core-di-browser';
import { UNIFIED_RULE_CREATION_FEATURE_FLAG } from '../../common/feature_flags';
import { useUnifiedRuleCreationEnabled } from './use_unified_rule_creation_enabled';

jest.mock('@kbn/core-di-browser');

const mockUseService = useService as jest.MockedFunction<typeof useService>;

describe('useUnifiedRuleCreationEnabled', () => {
  const { featureFlags } = coreMock.createStart();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseService.mockReturnValue(featureFlags);
  });

  it('reads the flag with false as fallback', () => {
    renderHook(() => useUnifiedRuleCreationEnabled());

    expect(featureFlags.useBooleanValue).toHaveBeenCalledWith(
      UNIFIED_RULE_CREATION_FEATURE_FLAG,
      false
    );
  });

  it.each([true, false])('returns %s when the flag resolves to it', (value) => {
    jest.mocked(featureFlags.useBooleanValue).mockReturnValue(value);

    const { result } = renderHook(() => useUnifiedRuleCreationEnabled());

    expect(result.current).toBe(value);
  });
});
