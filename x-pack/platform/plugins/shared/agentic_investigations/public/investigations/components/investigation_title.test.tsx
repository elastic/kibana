/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { EuiProvider } from '@elastic/eui';
import { I18nProvider } from '@kbn/i18n-react';
import { DEFAULT_CONVERSATION_TITLE } from '@kbn/agent-builder-common';
import { useInvestigation } from '../hooks/use_investigation';
import { InvestigationTitle } from './investigation_title';

jest.mock('../hooks/use_investigation');
const mockUseInvestigation = useInvestigation as jest.Mock;

const renderTitle = (title: string) =>
  render(
    <EuiProvider>
      <I18nProvider>
        <InvestigationTitle conversationId="conv-1" title={title} />
      </I18nProvider>
    </EuiProvider>
  );

const alertSubject = {
  type: 'alert',
  id: 'alert-1',
  snapshot: { rule_name: 'Checkout latency' },
  created_at: '2026-07-28T14:00:00.000Z',
};

describe('InvestigationTitle', () => {
  it("shows the conversation's title once Agent Builder generated it", () => {
    mockUseInvestigation.mockReturnValue({
      data: { title: DEFAULT_CONVERSATION_TITLE, title_pending: true, subjects: [alertSubject] },
    });

    renderTitle('Checkout latency spike after deploy');

    expect(screen.getByTestId('investigationFlyoutTitle')).toHaveTextContent(
      'Checkout latency spike after deploy'
    );
  });

  it('names an untitled investigation after its first subject', () => {
    mockUseInvestigation.mockReturnValue({
      data: { title: DEFAULT_CONVERSATION_TITLE, title_pending: true, subjects: [alertSubject] },
    });

    renderTitle(DEFAULT_CONVERSATION_TITLE);

    expect(screen.getByTestId('investigationFlyoutTitle')).toHaveTextContent('Checkout latency');
  });

  it('takes a title generated since the conversation was read from the investigation', () => {
    mockUseInvestigation.mockReturnValue({
      data: { title: 'Checkout latency spike', title_pending: false, subjects: [alertSubject] },
    });

    renderTitle(DEFAULT_CONVERSATION_TITLE);

    expect(screen.getByTestId('investigationFlyoutTitle')).toHaveTextContent(
      'Checkout latency spike'
    );
  });

  it('shows a generic title before the investigation is read', () => {
    mockUseInvestigation.mockReturnValue({ data: undefined });

    renderTitle(DEFAULT_CONVERSATION_TITLE);

    expect(screen.getByTestId('investigationFlyoutTitle')).toHaveTextContent('New investigation');
  });
});
