/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, renderHook } from '@testing-library/react';
import { useCasesConfig, useKibana } from '../common/lib/kibana';
import { OBSERVABLE_ATTACHMENT_TYPE } from '../../common/types/agent_builder/attachment_schemas';
import { useAddObservableToChat } from './use_add_observable_to_chat';
import { useAgentBuilderAvailability } from './use_agent_builder_availability';
import { OBSERVABLE_ATTACHMENT_PROMPT } from './translations';

jest.mock('../common/lib/kibana');
jest.mock('./use_agent_builder_availability');

const useCasesConfigMock = useCasesConfig as jest.Mock;
const useKibanaMock = useKibana as jest.Mock;
const useAgentBuilderAvailabilityMock = useAgentBuilderAvailability as jest.Mock;

const context = {
  observable: {
    id: 'observable-1',
    typeKey: 'observable-type-ipv4',
    value: '10.0.0.8',
    description: 'seen on the edge',
    createdAt: '2026-11-11T00:00:00.000Z',
    updatedAt: null,
    metadata: { triage: 'confirmed' },
  },
  caseData: { id: 'case-1', title: 'Phishing campaign', owner: 'securitySolution' },
  typeLabel: 'IPv4',
};

describe('useAddObservableToChat', () => {
  const openChat = jest.fn();
  const getUrlForApp = jest.fn().mockReturnValue('/app/security/cases/case-1');

  beforeEach(() => {
    jest.clearAllMocks();
    useCasesConfigMock.mockReturnValue({ chatEnabled: true });
    useAgentBuilderAvailabilityMock.mockReturnValue({ isAgentBuilderAvailable: true });
    useKibanaMock.mockReturnValue({
      services: { agentBuilder: { openChat }, application: { getUrlForApp } },
    });
  });

  it('opens a new conversation with the observable attached and a starter prompt', () => {
    const { result } = renderHook(() => useAddObservableToChat(context));

    expect(result.current.isAddToChatAvailable).toBe(true);
    act(() => result.current.addToChat());

    expect(openChat).toHaveBeenCalledWith({
      autoSendInitialMessage: false,
      newConversation: true,
      initialMessage: OBSERVABLE_ATTACHMENT_PROMPT,
      attachments: [
        {
          id: `${OBSERVABLE_ATTACHMENT_TYPE}:case-1:observable-1`,
          type: OBSERVABLE_ATTACHMENT_TYPE,
          data: {
            id: 'observable-1',
            type_key: 'observable-type-ipv4',
            type_label: 'IPv4',
            value: '10.0.0.8',
            description: 'seen on the edge',
            metadata: { triage: 'confirmed' },
            case_id: 'case-1',
            case_title: 'Phishing campaign',
            owner: 'securitySolution',
            url: '/app/security/cases/case-1',
          },
        },
      ],
    });
  });

  it('is not available when chat is disabled', () => {
    useCasesConfigMock.mockReturnValue({ chatEnabled: false });
    const { result } = renderHook(() => useAddObservableToChat(context));

    expect(result.current.isAddToChatAvailable).toBe(false);
    act(() => result.current.addToChat());
    expect(openChat).not.toHaveBeenCalled();
  });

  it('is not available without Agent Builder', () => {
    useAgentBuilderAvailabilityMock.mockReturnValue({ isAgentBuilderAvailable: false });
    const { result } = renderHook(() => useAddObservableToChat(context));

    expect(result.current.isAddToChatAvailable).toBe(false);
  });

  it('is not available when the Agent Builder plugin is missing', () => {
    useKibanaMock.mockReturnValue({ services: { application: { getUrlForApp } } });
    const { result } = renderHook(() => useAddObservableToChat(context));

    expect(result.current.isAddToChatAvailable).toBe(false);
  });
});
