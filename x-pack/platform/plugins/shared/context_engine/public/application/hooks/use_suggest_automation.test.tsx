/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock } from '@kbn/core/public/mocks';
import { I18nProvider } from '@kbn/i18n-react';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { act, renderHook } from '@testing-library/react';
import React from 'react';
import type { GetAiIndexResponse } from '../../../common/http_api/ai_indices';
import type { SuggestAutomationProvider } from '../../types';
import type { ContextEngineServices } from './use_kibana';
import { useSuggestAutomation } from './use_suggest_automation';

const aiIndex: GetAiIndexResponse = {
  id: 'my-ai-index',
  description: 'Support tickets',
  managed: false,
  dest: { type: 'data_stream', value: 'ai-index-ds-my-ai-index' },
  automations: [{ type: 'workflow', value: 'wf-existing' }],
  sources: [{ type: 'esql', value: 'FROM tickets' }],
  date_created: '2026-01-01T00:00:00.000Z',
  date_modified: '2026-01-01T00:00:00.000Z',
};

const renderSuggestHook = ({
  aiIndex: index = aiIndex,
  isManaged = false,
  canSuggest = true,
  hasProvider = true,
  onSaved = jest.fn(),
}: {
  aiIndex?: GetAiIndexResponse;
  isManaged?: boolean;
  canSuggest?: boolean;
  hasProvider?: boolean;
  onSaved?: jest.Mock;
} = {}) => {
  const canSuggestMock = jest.fn().mockReturnValue(canSuggest);
  const suggestAutomationMock = jest.fn();
  let automationSavedCallback: (() => void) | undefined;
  const subscribeToAutomationSavedMock = jest.fn((_aiIndexId: string, callback: () => void) => {
    automationSavedCallback = callback;
    return jest.fn();
  });

  const provider: SuggestAutomationProvider = {
    canSuggest: canSuggestMock,
    suggestAutomation: suggestAutomationMock,
    subscribeToAutomationSaved: subscribeToAutomationSavedMock,
  };

  const services = {
    ...coreMock.createStart(),
    share: {} as ContextEngineServices['share'],
    triggersActionsUi: {} as ContextEngineServices['triggersActionsUi'],
    getAgentBuilderIntegration: hasProvider ? () => ({ suggestAutomation: provider }) : undefined,
  } as unknown as ContextEngineServices;

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <I18nProvider>
      <KibanaContextProvider services={services}>{children}</KibanaContextProvider>
    </I18nProvider>
  );

  const view = renderHook(() => useSuggestAutomation({ aiIndex: index, isManaged, onSaved }), {
    wrapper,
  });

  return {
    ...view,
    canSuggestMock,
    suggestAutomationMock,
    subscribeToAutomationSavedMock,
    triggerAutomationSaved: () => automationSavedCallback?.(),
    onSaved,
  };
};

describe('useSuggestAutomation', () => {
  it('returns canSuggest false when no provider is registered', () => {
    const { result } = renderSuggestHook({ hasProvider: false });

    expect(result.current.canSuggest).toBe(false);
  });

  it('delegates canSuggest to the provider', () => {
    const { result, canSuggestMock } = renderSuggestHook();

    expect(canSuggestMock).toHaveBeenCalledWith({ aiIndex, isManaged: false });
    expect(result.current.canSuggest).toBe(true);
  });

  it('returns canSuggest false when the provider rejects the request', () => {
    const { result } = renderSuggestHook({ canSuggest: false });

    expect(result.current.canSuggest).toBe(false);
  });

  it('delegates suggestAutomation to the provider', () => {
    const { result, suggestAutomationMock } = renderSuggestHook();

    result.current.suggestAutomation();

    expect(suggestAutomationMock).toHaveBeenCalledWith({
      aiIndex,
      onSaved: expect.any(Function),
    });
  });

  it('does not call suggestAutomation when canSuggest is false', () => {
    const { result, suggestAutomationMock } = renderSuggestHook({ canSuggest: false });

    result.current.suggestAutomation();

    expect(suggestAutomationMock).not.toHaveBeenCalled();
  });

  it('subscribes to automation saved events via the provider', () => {
    const { subscribeToAutomationSavedMock, triggerAutomationSaved, onSaved } = renderSuggestHook();

    expect(subscribeToAutomationSavedMock).toHaveBeenCalledWith(
      'my-ai-index',
      expect.any(Function)
    );

    act(() => {
      triggerAutomationSaved();
    });

    expect(onSaved).toHaveBeenCalledTimes(1);
  });

  it('does not subscribe when canSuggest is false', () => {
    const { subscribeToAutomationSavedMock } = renderSuggestHook({ canSuggest: false });

    expect(subscribeToAutomationSavedMock).not.toHaveBeenCalled();
  });
});
