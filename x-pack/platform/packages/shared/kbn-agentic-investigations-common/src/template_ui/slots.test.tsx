/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import type { Conversation } from '@kbn/agent-builder-common';
import type { VersionedAttachment } from '@kbn/agent-builder-common/attachments';
import {
  clearImpactDetailsRenderer,
  registerImpactDetailsRenderer,
} from '../components/impact/impact_details_renderer';
import { createFlyoutGroupedAttachmentsRegistry } from '../components/grouped_attachments';
import { EscalationOverviewSlot } from './slots';

const impactAttachment: VersionedAttachment = {
  id: 'investigation-1:impact-1',
  type: 'investigation_impact',
  hidden: true,
  versions: [{ version: 1, data: {}, created_at: '2026-09-01T10:00:00.000Z', content_hash: 'a' }],
  current_version: 1,
};

const buildConversation = (attachments?: VersionedAttachment[]) =>
  ({
    id: 'escalation-1',
    agent_id: 'agent-1',
    title: 'Escalation',
    metadata: { linked_investigations: ['investigation-1'] },
    attachments,
  } as unknown as Conversation);

const renderSlot = ({
  attachments,
  withLinkedInvestigations = true,
}: {
  attachments?: VersionedAttachment[];
  withLinkedInvestigations?: boolean;
} = {}) =>
  render(
    <EscalationOverviewSlot
      conversation={buildConversation(attachments)}
      groupedAttachments={createFlyoutGroupedAttachmentsRegistry()}
      renderLinkedInvestigations={
        withLinkedInvestigations ? () => <div>Linked investigations</div> : undefined
      }
      onOpenInvestigation={jest.fn()}
    />
  );

describe('EscalationOverviewSlot', () => {
  afterEach(() => {
    clearImpactDetailsRenderer();
  });

  it('renders the impact copied from the linked investigations below the linked list', () => {
    registerImpactDetailsRenderer(() => <div>Checkout failed for 30% of requests.</div>);

    renderSlot({ attachments: [impactAttachment] });

    expect(screen.getByText('Linked investigations')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Impact' })).toBeInTheDocument();
    expect(screen.getByText('Checkout failed for 30% of requests.')).toBeInTheDocument();
  });

  it('renders no impact section when no impact attachment was copied', () => {
    registerImpactDetailsRenderer(() => <div>Checkout failed for 30% of requests.</div>);

    renderSlot({ attachments: [] });

    expect(screen.getByText('Linked investigations')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Impact' })).not.toBeInTheDocument();
  });

  it('still renders impact when no linked investigations renderer is supplied', () => {
    registerImpactDetailsRenderer(() => <div>Checkout failed for 30% of requests.</div>);

    renderSlot({ attachments: [impactAttachment], withLinkedInvestigations: false });

    expect(screen.queryByText('Linked investigations')).not.toBeInTheDocument();
    expect(screen.getByText('Checkout failed for 30% of requests.')).toBeInTheDocument();
  });
});
