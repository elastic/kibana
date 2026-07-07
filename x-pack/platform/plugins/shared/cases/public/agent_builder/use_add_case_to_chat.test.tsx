/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { basicCase } from '../containers/mock';
import { useCasesConfig, useKibana } from '../common/lib/kibana';
import { CASE_ATTACHMENT_TYPE } from '../../common/types/agent_builder/attachment_schemas';
import { SUMMARIZE_CASE_PROMPT } from './translations';
import { useAddCaseToChat } from './use_add_case_to_chat';
import { useAgentBuilderAvailability } from './use_agent_builder_availability';

jest.mock('../common/lib/kibana');
jest.mock('./use_agent_builder_availability');

const useCasesConfigMock = useCasesConfig as jest.Mock;
const useKibanaMock = useKibana as jest.Mock;
const useAgentBuilderAvailabilityMock = useAgentBuilderAvailability as jest.Mock;

describe('useAddCaseToChat', () => {
  const openChat = jest.fn();
  const getUrlForApp = jest.fn().mockReturnValue('/app/security/cases/basic-case-id');

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
    const { result } = renderHook(() => useAddCaseToChat(basicCase));

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
    const { result } = renderHook(() => useAddCaseToChat(basicCase));

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
    const { result } = renderHook(() => useAddCaseToChat(basicCase));

    result.current.addToChat();

    expect(result.current.isAddToChatAvailable).toBe(false);
    expect(openChat).not.toHaveBeenCalled();
  });

  it('is unavailable when Agent Builder availability checks fail', () => {
    useAgentBuilderAvailabilityMock.mockReturnValue({ isAgentBuilderAvailable: false });
    const { result } = renderHook(() => useAddCaseToChat(basicCase));

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
    const { result } = renderHook(() => useAddCaseToChat(basicCase));

    result.current.addToChat();

    expect(result.current.isAddToChatAvailable).toBe(false);
    expect(openChat).not.toHaveBeenCalled();
  });
});
