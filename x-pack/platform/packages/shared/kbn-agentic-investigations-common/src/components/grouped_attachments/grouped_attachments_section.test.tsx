/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import type { VersionedAttachment } from '@kbn/agent-builder-common/attachments';
import { GroupedAttachmentsSection } from './grouped_attachments_section';
import { createFlyoutGroupedAttachmentsRegistry } from './registry';
import { FlyoutGroupedAttachments } from './types';
import type { FlyoutGroupedAttachmentRendererProps } from './types';

const createAttachment = (
  id: string,
  type: string,
  overrides: Partial<VersionedAttachment> = {}
): VersionedAttachment => ({
  id,
  type,
  current_version: 1,
  versions: [{ version: 1, data: {}, created_at: '2026-09-01T10:00:00.000Z', content_hash: id }],
  ...overrides,
});

const ListRenderer = ({ attachments }: FlyoutGroupedAttachmentRendererProps) => (
  <>
    {attachments.map(({ id }) => (
      <li key={id}>{id}</li>
    ))}
  </>
);

const createRegistry = () => {
  const registry = createFlyoutGroupedAttachmentsRegistry();
  registry.register(
    FlyoutGroupedAttachments.ALERTS,
    ['security.alert', 'security.alerts'],
    ListRenderer
  );
  registry.register(FlyoutGroupedAttachments.RULES, ['security.rule'], ListRenderer);
  return registry;
};

describe('GroupedAttachmentsSection', () => {
  it('renders groups in the order the flyout asks for, not the order they were registered', () => {
    render(
      <GroupedAttachmentsSection
        attachments={[
          createAttachment('alert-1', 'security.alert'),
          createAttachment('rule-1', 'security.rule'),
        ]}
        registry={createRegistry()}
        order={[FlyoutGroupedAttachments.RULES, FlyoutGroupedAttachments.ALERTS]}
      />
    );

    expect(screen.getAllByRole('listitem').map(({ textContent }) => textContent)).toEqual([
      'rule-1',
      'alert-1',
    ]);
  });

  it('hands each renderer only the attachments of its registered types', () => {
    render(
      <GroupedAttachmentsSection
        attachments={[
          createAttachment('alert-1', 'security.alert'),
          createAttachment('alerts-1', 'security.alerts'),
          createAttachment('rule-1', 'security.rule'),
          createAttachment('entity-1', 'security.entity'),
        ]}
        registry={createRegistry()}
        order={[FlyoutGroupedAttachments.ALERTS]}
      />
    );

    expect(screen.getAllByRole('listitem').map(({ textContent }) => textContent)).toEqual([
      'alert-1',
      'alerts-1',
    ]);
  });

  it('skips hidden and inactive attachments', () => {
    render(
      <GroupedAttachmentsSection
        attachments={[
          createAttachment('alert-1', 'security.alert'),
          createAttachment('alert-hidden', 'security.alert', { hidden: true }),
          createAttachment('alert-inactive', 'security.alert', { active: false }),
        ]}
        registry={createRegistry()}
        order={[FlyoutGroupedAttachments.ALERTS]}
      />
    );

    expect(screen.getAllByRole('listitem').map(({ textContent }) => textContent)).toEqual([
      'alert-1',
    ]);
  });

  it('renders nothing when no group has attachments', () => {
    const { container } = render(
      <GroupedAttachmentsSection
        attachments={[createAttachment('entity-1', 'security.entity')]}
        registry={createRegistry()}
        order={[FlyoutGroupedAttachments.ALERTS, FlyoutGroupedAttachments.ATTACKS]}
      />
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('leaves the card without children when every renderer renders nothing', () => {
    const registry = createFlyoutGroupedAttachmentsRegistry();
    registry.register(FlyoutGroupedAttachments.ALERTS, ['security.alert'], () => null);

    render(
      <GroupedAttachmentsSection
        attachments={[createAttachment('alert-1', 'security.alert')]}
        registry={registry}
        order={[FlyoutGroupedAttachments.ALERTS]}
      />
    );

    expect(screen.getByTestId('groupedAttachmentsSection')).toBeEmptyDOMElement();
  });

  it('keeps a failing group from taking down the others', () => {
    const consoleWarn = jest.spyOn(window.console, 'warn').mockImplementation(() => {});
    const consoleError = jest.spyOn(window.console, 'error').mockImplementation(() => {});
    const failingRegistry = createFlyoutGroupedAttachmentsRegistry();
    failingRegistry.register(FlyoutGroupedAttachments.ALERTS, ['security.alert'], () => {
      throw new Error('boom');
    });
    failingRegistry.register(FlyoutGroupedAttachments.RULES, ['security.rule'], ListRenderer);

    render(
      <GroupedAttachmentsSection
        attachments={[
          createAttachment('alert-1', 'security.alert'),
          createAttachment('rule-1', 'security.rule'),
        ]}
        registry={failingRegistry}
        order={[FlyoutGroupedAttachments.ALERTS, FlyoutGroupedAttachments.RULES]}
      />
    );

    expect(screen.getByText('rule-1')).toBeInTheDocument();
    consoleWarn.mockRestore();
    consoleError.mockRestore();
  });
});
