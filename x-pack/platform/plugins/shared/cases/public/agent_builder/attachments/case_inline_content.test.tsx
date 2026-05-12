/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { applicationServiceMock } from '@kbn/core/public/mocks';
import { createCaseInlineContent, type CaseAttachment } from './case_inline_content';
import { CASE_ATTACHMENT_TYPE } from '../../../common/types/agent_builder/attachment_schemas';

const buildAttachment = (overrides: Partial<CaseAttachment['data']> = {}): CaseAttachment => ({
  id: 'abc',
  type: CASE_ATTACHMENT_TYPE,
  data: {
    id: 'abc',
    incremental_id: 125,
    title: 'Threat Intel Filebeat Module Indicator Match',
    description: 'low-severity alert "Yara Test Security Rule" fired',
    status: 'in-progress',
    severity: 'critical',
    totalAlerts: 3,
    totalComment: 5,
    tags: ['Phishing', 'User Alert', 'Review', 'Extra1', 'Extra2'],
    owner: 'securitySolution',
    assignees: Array.from({ length: 12 }, (_, i) => ({ uid: `u${i}` })),
    ...overrides,
  },
});

const renderInline = (attachment: CaseAttachment, application = applicationServiceMock.createStartContract()) => {
  const Inline = createCaseInlineContent({ application });
  return {
    application,
    ...render(<Inline attachment={attachment} isSidebar={false} />),
  };
};

describe('CaseInlineContent', () => {
  it('renders title, ID, severity, counts, and description', () => {
    renderInline(buildAttachment());
    expect(screen.getByText('Threat Intel Filebeat Module Indicator Match')).toBeInTheDocument();
    expect(screen.getByText('ID: 125')).toBeInTheDocument();
    expect(screen.getByTestId('case-attachment-severity-critical')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument(); // alerts count
    expect(screen.getByText('5')).toBeInTheDocument(); // comments count
    expect(screen.getByText('12')).toBeInTheDocument(); // assignees count
  });

  it('shows up to 3 tags with overflow badge', () => {
    renderInline(buildAttachment());
    expect(screen.getByText('Phishing')).toBeInTheDocument();
    expect(screen.getByText('User Alert')).toBeInTheDocument();
    expect(screen.getByText('Review')).toBeInTheDocument();
    expect(screen.queryByText('Extra1')).not.toBeInTheDocument();
    expect(screen.getByText('+2')).toBeInTheDocument();
  });

  it('navigates to the case when "Go to case" is clicked', async () => {
    const { application } = renderInline(buildAttachment());
    await userEvent.click(screen.getByTestId('case-attachment-go-to-case'));
    expect(application.navigateToApp).toHaveBeenCalledWith(
      'securitySolutionUI',
      expect.objectContaining({ path: expect.stringContaining('/cases/abc') })
    );
  });

  it('falls back to the id when incremental_id is missing', () => {
    renderInline(buildAttachment({ incremental_id: null }));
    expect(screen.getByText('ID: abc')).toBeInTheDocument();
  });
});
