/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
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
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    total_observables: 0,
    ...overrides,
  },
});

const renderInline = (attachment: CaseAttachment) => {
  const application = applicationServiceMock.createStartContract();
  const Inline = createCaseInlineContent({ application });
  return render(<Inline attachment={attachment} isSidebar={false} />);
};

describe('CaseInlineContent', () => {
  const originalLocation = window.location;

  beforeEach(() => {
    // @ts-expect-error - We need to override window.location for testing
    delete window.location;
    // @ts-expect-error - We need to override window.location for testing
    window.location = { pathname: 'notCasePage' };
  });
  afterEach(() => {
    // @ts-expect-error - We need to override window.location for testing
    window.location = originalLocation;
  });

  it('renders title, counts, and description', () => {
    renderInline(buildAttachment());
    expect(screen.getByText('Threat Intel Filebeat Module Indicator Match')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument(); // alerts count
    expect(screen.getByText('5')).toBeInTheDocument(); // comments count
    expect(screen.getByText('12')).toBeInTheDocument(); // assignees count
  });

  it('renders the "Go to case" button when not on case page', () => {
    renderInline(buildAttachment());
    expect(screen.getByTestId('case-attachment-go-to-case')).toBeInTheDocument();
  });

  it('hides the "Go to case" button when on the case\'s page', () => {
    const attachment = buildAttachment();
    // @ts-expect-error - We need to override window.location for testing
    window.location = { pathname: `/cases/${attachment.id}` };
    renderInline(attachment);
    expect(screen.queryByTestId('case-attachment-go-to-case')).not.toBeInTheDocument();
  });

  it('shows the "Go to case" button when on another case\'s page', () => {
    const attachment = buildAttachment();
    // @ts-expect-error - We need to override window.location for testing
    window.location = { pathname: `/cases/someCaseid` };
    renderInline(attachment);
    expect(screen.getByTestId('case-attachment-go-to-case')).toBeInTheDocument();
  });

  it('renders the alerts and comments badges', () => {
    renderInline(buildAttachment());
    expect(screen.getByLabelText('View alerts')).toBeInTheDocument();
    expect(screen.getByLabelText('View comments')).toBeInTheDocument();
  });

  it('renders status label from the status configuration', () => {
    renderInline(buildAttachment());
    expect(screen.getByText('In progress')).toBeInTheDocument();
  });
});
