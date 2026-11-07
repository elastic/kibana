/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen } from '@testing-library/react';

import type { AttachmentUIV2 } from '../../../../common/ui/types';
import { renderWithTestingProviders } from '../../../common/mock';
import { AttachmentAuthor } from './attachment_author';

const baseAttachment = {
  id: 'comment-1',
  type: 'comment',
  owner: 'securitySolution',
  data: { content: 'hello' },
  createdAt: '2026-10-01T00:00:00.000Z',
  createdBy: { username: 'elastic', fullName: 'Elastic User', email: null },
  pushedAt: null,
  pushedBy: null,
  updatedAt: null,
  updatedBy: null,
  version: 'v1',
} as unknown as AttachmentUIV2;

describe('AttachmentAuthor', () => {
  it('shows the Kibana user for a regular comment', () => {
    renderWithTestingProviders(<AttachmentAuthor attachment={baseAttachment} />);

    expect(screen.getByText('Elastic User')).toBeInTheDocument();
    expect(screen.queryByTestId('attachment-external-author')).not.toBeInTheDocument();
  });

  it('shows the external author via the connector for an imported comment', () => {
    renderWithTestingProviders(
      <AttachmentAuthor
        attachment={
          {
            ...baseAttachment,
            metadata: {
              externalSync: {
                externalId: '20001',
                connectorName: 'Jira',
                actor: { name: 'Jane Smith' },
              },
            },
          } as unknown as AttachmentUIV2
        }
      />
    );

    expect(screen.getByTestId('attachment-external-author')).toBeInTheDocument();
    expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    expect(screen.getByText('via Jira')).toBeInTheDocument();
    expect(screen.queryByText('Elastic User')).not.toBeInTheDocument();
  });

  it('falls back to the connector name when the external author is unknown', () => {
    renderWithTestingProviders(
      <AttachmentAuthor
        attachment={
          {
            ...baseAttachment,
            metadata: { externalSync: { externalId: '20001', connectorName: 'Jira' } },
          } as unknown as AttachmentUIV2
        }
      />
    );

    expect(screen.getByText('Jira')).toBeInTheDocument();
  });
});
