/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { CONTEXT_ENGINE_ENABLED_SETTING_ID } from '@kbn/management-settings-ids';
import { useIsContextEngineEnabled } from './use_is_context_engine_enabled';

jest.mock('@kbn/kibana-react-plugin/public', () => ({
  useUiSetting: jest.fn(),
}));

const { useUiSetting } = jest.requireMock('@kbn/kibana-react-plugin/public');

describe('useIsContextEngineEnabled', () => {
  beforeEach(() => jest.clearAllMocks());

  // The explicit `false` default matters: the setting is registered by agent_builder_sml, and
  // `uiSettings.get` throws on an unknown key when no default is supplied.
  it('reads the space-aware contextEngine:enabled setting', () => {
    useUiSetting.mockReturnValue(true);

    const { result } = renderHook(() => useIsContextEngineEnabled());

    expect(useUiSetting).toHaveBeenCalledWith(CONTEXT_ENGINE_ENABLED_SETTING_ID, false);
    expect(result.current).toBe(true);
  });

  it('returns false when the setting is off', () => {
    useUiSetting.mockReturnValue(false);

    expect(renderHook(() => useIsContextEngineEnabled()).result.current).toBe(false);
  });
});
