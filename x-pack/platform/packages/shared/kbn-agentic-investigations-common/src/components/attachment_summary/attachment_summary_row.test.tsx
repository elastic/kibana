/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type {
  AttachmentServiceStartContract,
  AttachmentUIDefinition,
} from '@kbn/agent-builder-browser';
import type { VersionedAttachment } from '@kbn/agent-builder-common/attachments';
import { AttachmentSummaryRow } from './attachment_summary_row';

const attachment: VersionedAttachment = {
  id: 'attachment-1',
  type: 'security.alerts',
  description: 'A described attachment',
  versions: [{ version: 1, data: {}, created_at: '2026-09-01T10:00:00.000Z', content_hash: 'a' }],
  current_version: 1,
};

const renderRow = (
  uiDefinition: Partial<AttachmentUIDefinition> | undefined,
  overrides: Partial<VersionedAttachment> = {}
) => {
  const attachmentsService = {
    getAttachmentUiDefinition: () => uiDefinition,
  } as unknown as AttachmentServiceStartContract;

  return render(
    <AttachmentSummaryRow
      attachment={{ ...attachment, ...overrides }}
      typeName="Alert"
      attachmentsService={attachmentsService}
      hasTopBorder={false}
    />
  );
};

// EUI's test-env mocks EuiIcon as a span whose text is its aria-label, so the icon and the label
// both match a bare text query. Every label assertion goes through the label's own test subject.
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
  it('labels the row from the registered attachment type', () => {
    renderRow({ getLabel: () => '3 alerts', getIcon: () => 'bell' });

    expectLabel('3 alerts');
  });

  it('labels the row from the current version of the data', () => {
    renderRow(
      {
        getLabel: (renderAttachment) =>
          `${(renderAttachment.data as { count: number }).count} alerts`,
      },
      {
        versions: [
          {
            version: 1,
            data: { count: 2 },
            created_at: '2026-09-01T10:00:00.000Z',
            content_hash: 'a',
          },
          {
            version: 2,
            data: { count: 7 },
            created_at: '2026-09-01T12:00:00.000Z',
            content_hash: 'b',
          },
        ],
        current_version: 2,
      }
    );

    expectLabel('7 alerts');
  });

  it('falls back to the description when the type has not registered its UI yet', () => {
    renderRow(undefined);

    expectLabel('A described attachment');
  });

  it('falls back to the type when there is no description either', () => {
    renderRow(undefined, { description: undefined });

    expectLabel('security.alerts');
  });

  it('is not interactive, because the drill-down does not exist yet', () => {
    renderRow({ getLabel: () => '3 alerts' });

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('shows the full label in a tooltip once it is cut off', async () => {
    // jsdom lays nothing out, so the overflow that drives the tooltip has to be simulated.
    const restore = mockLabelOverflow({ scrollWidth: 500, clientWidth: 100 });
    try {
      renderRow({ getLabel: () => 'A label long enough that the row will cut it short' });

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
      renderRow({ getLabel: () => 'Short' });
      const labelElement = screen.getByTestId('attachmentSummaryRowLabel');

      await userEvent.hover(labelElement);

      expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
      expect(labelElement).not.toHaveAttribute('tabindex');
    } finally {
      restore();
    }
  });

  it('shows the attachment kind, not its raw type id, in a tooltip on the icon', async () => {
    renderRow({ getLabel: () => '3 alerts' });

    await userEvent.hover(screen.getByTestId('attachmentSummaryRowIcon'));

    expect(await screen.findByRole('tooltip')).toHaveTextContent('Alert');
  });
});
