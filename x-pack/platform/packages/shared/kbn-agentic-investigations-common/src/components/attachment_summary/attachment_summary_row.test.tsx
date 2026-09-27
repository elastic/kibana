/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AttachmentSummaryRow } from './attachment_summary_row';

/** jsdom reports every width as 0; these are the two values the truncation check compares. */
const mockLabelOverflow = ({
  scrollWidth,
  clientWidth,
}: {
  scrollWidth: number;
  clientWidth: number;
}) => {
  const spies = [
    jest.spyOn(HTMLElement.prototype, 'scrollWidth', 'get').mockReturnValue(scrollWidth),
    jest.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(clientWidth),
  ];
  return () => spies.forEach((spy) => spy.mockRestore());
};

const expectLabel = (expected: string) =>
  expect(screen.getByTestId('attachmentSummaryRowLabel')).toHaveTextContent(expected);

describe('AttachmentSummaryRow', () => {
  it('stays read-only when onClick is absent', () => {
    render(<AttachmentSummaryRow label="3 alerts" typeName="Alert" />);

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  describe('with onClick', () => {
    const onClick = jest.fn();

    beforeEach(() => onClick.mockClear());

    it('names the row by its kind and label, since the kind is otherwise only visual', () => {
      render(<AttachmentSummaryRow label="3 alerts" typeName="Alert" onClick={onClick} />);

      expect(screen.getByRole('button', { name: 'Alert: 3 alerts' })).toBeInTheDocument();
    });

    it('shows the chevron, which marks the row as leading somewhere', () => {
      const { container } = render(
        <AttachmentSummaryRow label="3 alerts" typeName="Alert" onClick={onClick} />
      );

      expect(
        container.querySelector('[data-euiicon-type="chevronSingleRight"]')
      ).toBeInTheDocument();
    });

    it('calls onClick when clicked', async () => {
      render(<AttachmentSummaryRow label="3 alerts" typeName="Alert" onClick={onClick} />);

      await userEvent.click(screen.getByRole('button'));

      expect(onClick).toHaveBeenCalledTimes(1);
    });

    it('keeps the label out of the tab order, since the row itself is the tab stop', () => {
      const restore = mockLabelOverflow({ scrollWidth: 500, clientWidth: 100 });
      try {
        render(<AttachmentSummaryRow label="3 alerts" typeName="Alert" onClick={onClick} />);

        expect(screen.getByTestId('attachmentSummaryRowLabel')).not.toHaveAttribute('tabindex');
      } finally {
        restore();
      }
    });
  });

  it('renders children inside the list item for hidden side-effect nodes', () => {
    render(
      <AttachmentSummaryRow label="3 alerts" typeName="Alert">
        <div data-test-subj="side-effect" />
      </AttachmentSummaryRow>
    );

    const li = screen.getByRole('listitem');
    expect(li.querySelector('[data-test-subj="side-effect"]')).toBeInTheDocument();
  });

  it('shows the full label in a tooltip once it is cut off', async () => {
    const restore = mockLabelOverflow({ scrollWidth: 500, clientWidth: 100 });
    try {
      render(
        <AttachmentSummaryRow
          label="A label long enough that the row will cut it short"
          typeName="Alert"
        />
      );

      await userEvent.hover(screen.getByTestId('attachmentSummaryRowLabel'));

      expect(await screen.findByRole('tooltip')).toHaveTextContent(
        'A label long enough that the row will cut it short'
      );
    } finally {
      restore();
    }
  });

  it('leaves a label that already fits without a tooltip or a tab stop', async () => {
    const restore = mockLabelOverflow({ scrollWidth: 100, clientWidth: 100 });
    try {
      render(<AttachmentSummaryRow label="Short" typeName="Alert" />);
      const labelElement = screen.getByTestId('attachmentSummaryRowLabel');

      await userEvent.hover(labelElement);

      expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
      expect(labelElement).not.toHaveAttribute('tabindex');
    } finally {
      restore();
    }
  });

  it('shows the attachment kind in a tooltip on the icon', async () => {
    render(<AttachmentSummaryRow label="3 alerts" typeName="Alert" />);

    await userEvent.hover(screen.getByTestId('attachmentSummaryRowIcon'));

    expect(await screen.findByRole('tooltip')).toHaveTextContent('Alert');
  });
});
