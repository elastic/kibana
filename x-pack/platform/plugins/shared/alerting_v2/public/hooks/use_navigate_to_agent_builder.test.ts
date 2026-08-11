/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act } from '@testing-library/react';
import { useService, CoreStart } from '@kbn/core-di-browser';
import { useNavigateToAgentBuilder } from './use_navigate_to_agent_builder';
import {
  CREATE_WITH_AGENT_INITIAL_PROMPT,
  AGENT_BUILDER_NEW_CONVERSATION_PATH,
} from '../constants';

jest.mock('@kbn/core-di-browser');

const mockUseService = useService as jest.MockedFunction<typeof useService>;
const mockCoreStart = CoreStart as jest.MockedFunction<typeof CoreStart>;

describe('useNavigateToAgentBuilder', () => {
  const mockNavigateToApp = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    mockCoreStart.mockImplementation((key: string) => key as any);

    mockUseService.mockImplementation((service: unknown) => {
      if (service === 'application') {
        return { navigateToApp: mockNavigateToApp } as any;
      }
      return undefined as any;
    });
  });

  it('navigates to the agent builder app with the correct path and initial message', () => {
    const { result } = renderHook(() => useNavigateToAgentBuilder());

    act(() => {
      result.current();
    });

    expect(mockNavigateToApp).toHaveBeenCalledTimes(1);
    expect(mockNavigateToApp).toHaveBeenCalledWith('agent_builder', {
      path: AGENT_BUILDER_NEW_CONVERSATION_PATH,
      state: { initialMessage: CREATE_WITH_AGENT_INITIAL_PROMPT },
    });
  });

  it('returns a stable callback reference across renders', () => {
    const { result, rerender } = renderHook(() => useNavigateToAgentBuilder());

    const firstCallback = result.current;
    rerender();
    const secondCallback = result.current;

    expect(firstCallback).toBe(secondCallback);
  });
});
