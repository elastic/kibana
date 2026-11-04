/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { renderWithKibanaRenderContext } from '@kbn/test-jest-helpers';
import type { Conversation } from '@kbn/agent-builder-common';
import type { VersionedAttachment } from '@kbn/agent-builder-common/attachments';
import {
  clearImpactDetailsRenderer,
  registerImpactDetailsRenderer,
} from '../components/impact/impact_details_renderer';
import { createFlyoutGroupedAttachmentsRegistry } from '../components/grouped_attachments';
import { EscalationOverviewSlot, HeaderSlot } from './slots';

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

  it('hands every copied impact to the renderer at once, under one heading', () => {
    const renderer = jest.fn(() => <div>Merged impact</div>);
    registerImpactDetailsRenderer(renderer);

    renderSlot({
      attachments: [
        impactAttachment,
        { ...impactAttachment, id: 'investigation-2:impact-1' },
        { ...impactAttachment, id: 'investigation-3:impact-1' },
      ],
    });

    expect(renderer).toHaveBeenCalledTimes(1);
    expect(renderer).toHaveBeenCalledWith([{}, {}, {}]);
    expect(screen.getAllByRole('heading', { name: 'Impact' })).toHaveLength(1);
    expect(screen.getByText('Merged impact')).toBeInTheDocument();
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

describe('HeaderSlot', () => {
  const investigation = (metadata: Record<string, unknown>) =>
    ({
      id: 'investigation-1',
      agent_id: 'agent-1',
      title: 'Checkout errors',
      template_id: 'investigation',
      created_at: '2026-09-01T10:00:00.000Z',
      metadata,
    } as unknown as Conversation);

  it('renders the severity picker for an investigation with a severity', () => {
    const renderSeverity = jest.fn(() => <div>Severity picker</div>);
    renderWithKibanaRenderContext(
      <HeaderSlot
        conversation={investigation({ status: 'open', severity: 'high' })}
        renderSeverity={renderSeverity}
      />
    );

    expect(screen.getByText('Severity picker')).toBeInTheDocument();
    expect(renderSeverity).toHaveBeenCalledWith(
      expect.objectContaining({ conversationId: 'investigation-1', severity: 'high' })
    );
  });

  it('leaves the severity out for an investigation without one', () => {
    const renderSeverity = jest.fn(() => <div>Severity picker</div>);
    renderWithKibanaRenderContext(
      <HeaderSlot
        conversation={investigation({ status: 'open' })}
        renderSeverity={renderSeverity}
      />
    );

    expect(renderSeverity).not.toHaveBeenCalled();
    expect(screen.queryByText('Severity')).not.toBeInTheDocument();
  });
});
