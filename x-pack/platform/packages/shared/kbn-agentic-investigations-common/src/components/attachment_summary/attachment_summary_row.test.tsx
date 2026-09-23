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

  it('shows the attachment kind, not its raw type id, in a tooltip on the icon', async () => {
    renderRow({ getLabel: () => '3 alerts' });

    await userEvent.hover(screen.getByTestId('attachmentSummaryRowIcon'));

    expect(await screen.findByRole('tooltip')).toHaveTextContent('Alert');
  });
});
