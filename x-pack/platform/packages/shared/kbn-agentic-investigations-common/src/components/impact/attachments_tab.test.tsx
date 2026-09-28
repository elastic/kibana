/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, screen } from '@testing-library/react';
import { renderWithKibanaRenderContext } from '@kbn/test-jest-helpers';
import type { VersionedAttachment } from '@kbn/agent-builder-common/attachments';
import { AttachmentsTab } from './attachments_tab';

const impact = (entities: unknown[]): VersionedAttachment => ({
  id: 'impact-1',
  type: 'investigation_impact',
  current_version: 1,
  versions: [
    {
      version: 1,
      data: { entities },
      created_at: '2026-09-01T10:00:00.000Z',
      content_hash: 'impact',
    },
  ],
});

const entityAttachment: VersionedAttachment = {
  id: 'entity-1',
  type: 'security.entity',
  current_version: 1,
  versions: [
    {
      version: 1,
      data: { identifier: 'host-9' },
      created_at: '2026-09-01T10:00:00.000Z',
      content_hash: 'entity',
    },
  ],
};

describe('AttachmentsTab', () => {
  it('shows an empty state and no Impact group when nothing qualifies', () => {
    renderWithKibanaRenderContext(<AttachmentsTab attachments={[entityAttachment]} />);

    expect(
      screen.getByText('Hosts and users this investigation hits will show up here.')
    ).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Impact' })).not.toBeInTheDocument();
    expect(screen.queryByText('host-9')).not.toBeInTheDocument();
  });

  it('renders one row per entity, linking only entity-store rows', () => {
    const onOpenImpactEntity = jest.fn();
    renderWithKibanaRenderContext(
      <AttachmentsTab
        onOpenImpactEntity={onOpenImpactEntity}
        attachments={[
          impact([
            { id: 'host-1', name: 'web-01', type: 'host' },
            { id: 'user-1' },
            {
              id: 'payments',
              name: 'payments',
              type: 'service',
              featureId: 'feat-1',
              streamName: 'logs',
            },
          ]),
        ]}
      />
    );

    expect(screen.getByRole('heading', { name: 'Impact' })).toBeInTheDocument();
    expect(screen.getByText('web-01')).toBeInTheDocument();
    expect(screen.getByText('host')).toBeInTheDocument();
    expect(screen.getByText('user-1')).toBeInTheDocument();
    expect(screen.getByText('payments')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Open host web-01' }));
    expect(onOpenImpactEntity).toHaveBeenCalledWith({
      id: 'host-1',
      name: 'web-01',
      type: 'host',
    });

    fireEvent.click(screen.getByRole('button', { name: 'Open user-1' }));
    expect(onOpenImpactEntity).toHaveBeenCalledWith({ id: 'user-1' });

    expect(screen.queryByRole('button', { name: /payments/ })).not.toBeInTheDocument();
  });

  it('does not link an entity-store row when no handler was provided', () => {
    renderWithKibanaRenderContext(
      <AttachmentsTab attachments={[impact([{ id: 'host-1', name: 'web-01', type: 'host' }])]} />
    );

    expect(screen.getByText('web-01')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /web-01/ })).not.toBeInTheDocument();
  });
});
