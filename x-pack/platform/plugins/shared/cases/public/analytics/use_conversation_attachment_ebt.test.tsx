/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import {
  CASE_VIEW_CONVERSATION_ATTACHMENT_OPENED_EVENT_TYPE,
  SECURITY_SOLUTION_OWNER,
} from '../../common/constants';
import { useKibana } from '../common/lib/kibana';
import { useCasesContext } from '../components/cases_context/use_cases_context';
import { useConversationAttachmentOpenedEBT } from './use_conversation_attachment_ebt';

jest.mock('../common/lib/kibana', () => ({
  useKibana: jest.fn(),
}));

jest.mock('../components/cases_context/use_cases_context', () => ({
  useCasesContext: jest.fn(),
}));

describe('useConversationAttachmentOpenedEBT', () => {
  const reportEvent = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useKibana as jest.Mock).mockReturnValue({ services: { analytics: { reportEvent } } });
    (useCasesContext as jest.Mock).mockReturnValue({ owner: [SECURITY_SOLUTION_OWNER] });
  });

  it('reports the owner and open target', () => {
    const { result } = renderHook(() => useConversationAttachmentOpenedEBT());

    result.current('full_page');

    expect(reportEvent).toHaveBeenCalledWith(CASE_VIEW_CONVERSATION_ATTACHMENT_OPENED_EVENT_TYPE, {
      owner: SECURITY_SOLUTION_OWNER,
      open_target: 'full_page',
    });
  });
});
