/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import type { Investigation } from '../../types';
import { OverviewTab } from './details_flyout_tab_contents';

const investigation = {
  id: 'investigation-1',
  template_id: 'investigation',
  title: 'Impossible travel',
  createdAt: '2026-09-01T10:00:00.000Z',
  updatedAt: '2026-09-01T10:00:00.000Z',
  watch_id: '',
  watch_execution_id: '',
  pendingProposalCount: 0,
  assignees: [],
  summary: 'A second sign-in replayed the same session cookie.',
  // Both fed the removed Impact table; neither should surface here any more.
  affectedSurface: 'cfo@corp',
  severity: 'high',
  events: [],
} satisfies Investigation;

const renderTab = ({
  investigationOverrides,
}: {
  investigationOverrides?: Partial<Investigation>;
} = {}) => render(<OverviewTab investigation={{ ...investigation, ...investigationOverrides }} />);

describe('OverviewTab', () => {
  it('no longer renders the Impact table', () => {
    renderTab();

    expect(screen.queryByText('Impact')).not.toBeInTheDocument();
    expect(screen.queryByText('Compromised')).not.toBeInTheDocument();
    expect(screen.queryByText('cfo@corp')).not.toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('renders the narrative when a summary is present', () => {
    renderTab();

    expect(screen.getByText("What's happened")).toBeInTheDocument();
    expect(screen.queryByText('Attachment summary')).not.toBeInTheDocument();
  });

  it('omits the narrative heading when there is no summary', () => {
    renderTab({ investigationOverrides: { summary: undefined } });

    expect(screen.queryByText("What's happened")).not.toBeInTheDocument();
    expect(screen.queryByText('Attachment summary')).not.toBeInTheDocument();
  });
});
