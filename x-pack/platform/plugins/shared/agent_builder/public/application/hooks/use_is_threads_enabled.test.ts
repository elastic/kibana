/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { AGENT_BUILDER_THREADS_SETTING_ID } from '@kbn/management-settings-ids';
import { useIsThreadsEnabled } from './use_is_threads_enabled';

jest.mock('@kbn/kibana-react-plugin/public', () => ({
  useUiSetting: jest.fn(),
}));

const { useUiSetting } = jest.requireMock('@kbn/kibana-react-plugin/public');

describe('useIsThreadsEnabled', () => {
  beforeEach(() => jest.clearAllMocks());

  it('reads the agentBuilder:threads setting with an off default', () => {
    useUiSetting.mockReturnValue(true);

    const { result } = renderHook(() => useIsThreadsEnabled());

    expect(useUiSetting).toHaveBeenCalledWith(AGENT_BUILDER_THREADS_SETTING_ID, false);
    expect(result.current).toBe(true);
  });

  it('returns false when the setting is off', () => {
    useUiSetting.mockReturnValue(false);

    expect(renderHook(() => useIsThreadsEnabled()).result.current).toBe(false);
  });
});
