/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AttachmentSummaryGroup } from './attachment_summary_group';

const makeRow = (label: string) => <li key={label}>{label}</li>;
const makeRows = (count: number) => Array.from({ length: count }, (_, i) => makeRow(`row-${i}`));

describe('AttachmentSummaryGroup', () => {
  it('shows the title and row count in the header', () => {
    render(<AttachmentSummaryGroup title="Alerts" rows={makeRows(3)} />);

    expect(screen.getByTestId('attachmentSummaryGroupHeader')).toHaveTextContent(/Alerts.*3/);
  });

  it('uses a custom count when provided', () => {
    render(<AttachmentSummaryGroup title="Alerts" rows={makeRows(3)} count={10} />);

    expect(screen.getByTestId('attachmentSummaryGroupHeader')).toHaveTextContent(/Alerts.*10/);
  });

  it('renders all rows when at or below the collapse limit', () => {
    render(<AttachmentSummaryGroup title="Alerts" rows={makeRows(4)} />);

    expect(screen.getAllByRole('listitem')).toHaveLength(4);
    expect(screen.queryByTestId('attachmentSummaryGroupToggle')).not.toBeInTheDocument();
  });

  it('collapses to 4 rows and shows the toggle when there are 5 rows', () => {
    render(<AttachmentSummaryGroup title="Alerts" rows={makeRows(5)} />);

    expect(screen.getAllByRole('listitem')).toHaveLength(4);
    expect(screen.getByTestId('attachmentSummaryGroupToggle')).toHaveTextContent('+ Show more (1)');
  });

  it('expands and collapses again', async () => {
    render(<AttachmentSummaryGroup title="Alerts" rows={makeRows(6)} />);
    const toggle = screen.getByTestId('attachmentSummaryGroupToggle');

    await userEvent.click(toggle);

    expect(screen.getAllByRole('listitem')).toHaveLength(6);
    expect(toggle).toHaveTextContent('Show less');
    expect(toggle).toHaveAttribute('aria-expanded', 'true');

    await userEvent.click(toggle);

    expect(screen.getAllByRole('listitem')).toHaveLength(4);
    expect(toggle).toHaveTextContent('+ Show more (2)');
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
  });

  it('toggle controls the list', () => {
    render(<AttachmentSummaryGroup title="Alerts" rows={makeRows(6)} />);

    const controlledId = screen
      .getByTestId('attachmentSummaryGroupToggle')
      .getAttribute('aria-controls');

    expect(screen.getByRole('list')).toHaveAttribute('id', controlledId);
  });

  it('renders nothing when rows is empty', () => {
    const { container } = render(<AttachmentSummaryGroup title="Alerts" rows={[]} />);

    expect(container).toBeEmptyDOMElement();
  });
});
