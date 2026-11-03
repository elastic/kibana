/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { BehaviorSubject, Subject } from 'rxjs';
import { act, renderHook } from '@testing-library/react';
import { ChatEventType, type ToolUiEvent } from '@kbn/agent-builder-common';
import { basicCase } from '../containers/mock';
import { useCasesConfig, useKibana } from '../common/lib/kibana';
import { CASE_ATTACHMENT_TYPE } from '../../common/types/agent_builder/attachment_schemas';
import {
  CASES_UPDATED_UI_EVENT,
  type CasesUpdatedUiEventData,
} from '../../common/types/agent_builder/ui_events';
import { TestProviders, createTestQueryClient } from '../common/mock';
import { casesQueriesKeys } from '../containers/constants';
import { SUMMARIZE_CASE_PROMPT } from './translations';
import { useAddCaseToChat } from './use_add_case_to_chat';
import { useAgentBuilderAvailability } from './use_agent_builder_availability';

jest.mock('../common/lib/kibana');
jest.mock('./use_agent_builder_availability');

const useCasesConfigMock = useCasesConfig as jest.Mock;
const useKibanaMock = useKibana as jest.Mock;
const useAgentBuilderAvailabilityMock = useAgentBuilderAvailability as jest.Mock;

type CasesUpdatedUiEvent = ToolUiEvent<typeof CASES_UPDATED_UI_EVENT, CasesUpdatedUiEventData>;

describe('useAddCaseToChat', () => {
  const openChat = jest.fn();
  const getUrlForApp = jest.fn().mockReturnValue('/app/security/cases/basic-case-id');

  const renderUseAddCaseToChat = (queryClient = createTestQueryClient()) =>
    renderHook(() => useAddCaseToChat(basicCase), {
      wrapper: (props) => <TestProviders {...props} queryClient={queryClient} />,
    });

  const createCasesUpdatedEvent = (caseIds: string[]): CasesUpdatedUiEvent => ({
    type: ChatEventType.toolUi,
    data: {
      tool_id: 'platform.core.cases.manage',
      tool_call_id: 'tool-call-1',
      custom_event: CASES_UPDATED_UI_EVENT,
      data: { caseIds },
    },
  });

  const mockAgentBuilderEvents = () => {
    const activeConversation$ = new BehaviorSubject<{ id?: string } | null>({
      id: 'conversation-1',
    });
    const chatEvents$ = new Subject<CasesUpdatedUiEvent>();
    const getChatEvents$ = jest.fn().mockReturnValue(chatEvents$);

    useKibanaMock.mockReturnValue({
      services: {
        agentBuilder: {
          openChat,
          events: {
            ui: { activeConversation$ },
            getChatEvents$,
          },
        },
        application: { getUrlForApp },
      },
    });

    return { activeConversation$, chatEvents$, getChatEvents$ };
  };

  beforeEach(() => {
    jest.clearAllMocks();
    useCasesConfigMock.mockReturnValue({ chatEnabled: true });
    useAgentBuilderAvailabilityMock.mockReturnValue({ isAgentBuilderAvailable: true });
    useKibanaMock.mockReturnValue({
      services: {
        agentBuilder: { openChat },
        application: { getUrlForApp },
      },
    });
  });

  it('opens Agent Builder chat with a case attachment', () => {
    const { result } = renderUseAddCaseToChat();

    result.current.addToChat();

    expect(openChat).toHaveBeenCalledWith({
      autoSendInitialMessage: false,
      newConversation: true,
      attachments: [
        {
          id: `${CASE_ATTACHMENT_TYPE}:${basicCase.id}`,
          type: CASE_ATTACHMENT_TYPE,
          data: expect.objectContaining({
            id: basicCase.id,
            incremental_id: null,
            title: basicCase.title,
            description: basicCase.description,
            status: basicCase.status,
            severity: basicCase.severity,
            totalAlerts: basicCase.totalAlerts,
            totalComment: basicCase.totalComment,
            url: '/app/security/cases/basic-case-id',
          }),
        },
      ],
    });
  });

  it('opens Agent Builder chat with a summarize prompt and case attachment', () => {
    const { result } = renderUseAddCaseToChat();

    result.current.summarizeCase();

    expect(openChat).toHaveBeenCalledWith(
      expect.objectContaining({
        initialMessage: SUMMARIZE_CASE_PROMPT,
        attachments: [
          expect.objectContaining({
            id: `${CASE_ATTACHMENT_TYPE}:${basicCase.id}`,
            type: CASE_ATTACHMENT_TYPE,
          }),
        ],
      })
    );
  });

  it('is unavailable when cases chat is disabled', () => {
    useCasesConfigMock.mockReturnValue({ chatEnabled: false });
    const { result } = renderUseAddCaseToChat();

    result.current.addToChat();

    expect(result.current.isAddToChatAvailable).toBe(false);
    expect(openChat).not.toHaveBeenCalled();
  });

  it('is unavailable when Agent Builder availability checks fail', () => {
    useAgentBuilderAvailabilityMock.mockReturnValue({ isAgentBuilderAvailable: false });
    const { result } = renderUseAddCaseToChat();

    result.current.addToChat();

    expect(result.current.isAddToChatAvailable).toBe(false);
    expect(openChat).not.toHaveBeenCalled();
  });

  it('is unavailable when Agent Builder is not available', () => {
    useKibanaMock.mockReturnValue({
      services: {
        application: { getUrlForApp },
      },
    });
    const { result } = renderUseAddCaseToChat();

    result.current.addToChat();

    expect(result.current.isAddToChatAvailable).toBe(false);
    expect(openChat).not.toHaveBeenCalled();
  });

  it('refreshes the current case view when an agent tool updates the case', () => {
    const queryClient = createTestQueryClient();
    const invalidateQueriesSpy = jest.spyOn(queryClient, 'invalidateQueries');
    const { chatEvents$, getChatEvents$ } = mockAgentBuilderEvents();

    renderUseAddCaseToChat(queryClient);

    expect(getChatEvents$).toHaveBeenCalledWith('conversation-1');

    act(() => {
      chatEvents$.next(createCasesUpdatedEvent([basicCase.id]));
    });

    expect(invalidateQueriesSpy).toHaveBeenCalledWith(casesQueriesKeys.case(basicCase.id));
    expect(invalidateQueriesSpy).toHaveBeenCalledWith(casesQueriesKeys.tags());
    expect(invalidateQueriesSpy).toHaveBeenCalledWith(casesQueriesKeys.categories());
  });

  it('does not refresh the case view when an agent tool updates other cases', () => {
    const queryClient = createTestQueryClient();
    const invalidateQueriesSpy = jest.spyOn(queryClient, 'invalidateQueries');
    const { chatEvents$ } = mockAgentBuilderEvents();

    renderUseAddCaseToChat(queryClient);

    act(() => {
      chatEvents$.next(createCasesUpdatedEvent(['unrelated-case-id']));
    });

    expect(invalidateQueriesSpy).not.toHaveBeenCalled();
  });

  it('unsubscribes from chat events on unmount', () => {
    const queryClient = createTestQueryClient();
    const invalidateQueriesSpy = jest.spyOn(queryClient, 'invalidateQueries');
    const { chatEvents$ } = mockAgentBuilderEvents();

    const { unmount } = renderUseAddCaseToChat(queryClient);
    unmount();

    act(() => {
      chatEvents$.next(createCasesUpdatedEvent([basicCase.id]));
    });

    expect(invalidateQueriesSpy).not.toHaveBeenCalled();
  });
});
