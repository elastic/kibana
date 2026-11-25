/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { DEFAULT_CONVERSATION_TITLE } from '@kbn/agent-builder-common';
import { useInvestigation } from '../../../../investigations/hooks/use_investigation';
import { useInvestigationTitle } from './use_investigation_title';

jest.mock('../../../../investigations/hooks/use_investigation');
const mockUseInvestigation = useInvestigation as jest.Mock;

const renderTitle = (title: string) =>
  renderHook(() => useInvestigationTitle({ conversationId: 'conv-1', title })).result.current;

const alertSubject = {
  type: 'alert',
  id: 'alert-1',
  snapshot: { rule_name: 'Checkout latency' },
  created_at: '2026-07-28T14:00:00.000Z',
};

describe('useInvestigationTitle', () => {
  it("shows the conversation's title once Agent Builder generated it", () => {
    mockUseInvestigation.mockReturnValue({
      data: { title: DEFAULT_CONVERSATION_TITLE, title_pending: true, subjects: [alertSubject] },
    });

    expect(renderTitle('Checkout latency spike after deploy')).toBe(
      'Checkout latency spike after deploy'
    );
  });

  it('names an untitled investigation after its first subject', () => {
    mockUseInvestigation.mockReturnValue({
      data: { title: DEFAULT_CONVERSATION_TITLE, title_pending: true, subjects: [alertSubject] },
    });

    expect(renderTitle(DEFAULT_CONVERSATION_TITLE)).toBe('Checkout latency');
  });

  it('takes a title generated since the conversation was read from the investigation', () => {
    mockUseInvestigation.mockReturnValue({
      data: { title: 'Checkout latency spike', title_pending: false, subjects: [alertSubject] },
    });

    expect(renderTitle(DEFAULT_CONVERSATION_TITLE)).toBe('Checkout latency spike');
  });

  it('shows a generic title before the investigation is read', () => {
    mockUseInvestigation.mockReturnValue({ data: undefined });

    expect(renderTitle(DEFAULT_CONVERSATION_TITLE)).toBe('New investigation');
  });
});
