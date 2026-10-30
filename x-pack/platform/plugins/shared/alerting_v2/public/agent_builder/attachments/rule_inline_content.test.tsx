/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, render, waitFor } from '@testing-library/react';
import { RULE_KIND_LABELS } from '@kbn/alerting-v2-constants';
import { RULE_ATTACHMENT_TYPE } from '@kbn/alerting-v2-schemas';
import { RuleInlineContent } from './rule_inline_content';
import { runAttachmentSave, syncAttachmentOrigin } from './attachment_persistence';

const mockGetRule = jest.fn();
const mockRulesApiService = { getRule: (...args: unknown[]) => mockGetRule(...args) };

jest.mock('@kbn/core-di-browser', () => ({
  useService: () => mockRulesApiService,
}));

jest.mock('../../services/rules_api', () => ({
  RulesApi: Symbol('RulesApi'),
}));

const createAttachment = (
  overrides: {
    id?: string;
    origin?: string;
    enabled?: boolean;
    updatedAt?: string;
    versionData?: {
      version: number;
      versionCount: number;
      createdAt: string;
      originSyncedAt?: string;
    };
  } = {}
) => ({
  id: overrides.id ?? 'att-1',
  type: RULE_ATTACHMENT_TYPE,
  versions: [],
  current_version: 1,
  origin: overrides.origin,
  versionData: overrides.versionData,
  data: {
    kind: 'signal' as const,
    metadata: { name: 'My Rule', tags: ['tag1', 'tag2'], description: 'A test rule' },
    schedule: { every: '5m' },
    time_field: '@timestamp',
    query: { base: 'FROM logs-*' },
    enabled: overrides.enabled,
    updated_at: overrides.updatedAt,
  } as any,
});

describe('RuleInlineContent', () => {
  beforeEach(() => {
    mockGetRule.mockReset();
    mockGetRule.mockResolvedValue({ updated_at: '2026-04-10T00:00:00.000Z' });
  });

  it('does not render the rule name in the body', () => {
    const { queryByText } = render(
      <RuleInlineContent attachment={createAttachment()} isSidebar={false} />
    );
    expect(queryByText('My Rule')).toBeNull();
  });

  it('renders the outcome badge for the rule kind', () => {
    const { getByText } = render(
      <RuleInlineContent attachment={createAttachment()} isSidebar={false} />
    );
    expect(getByText('Outcome')).toBeDefined();
    expect(getByText(RULE_KIND_LABELS.signal)).toBeDefined();
  });

  it('shows draft status when no origin', () => {
    const { getByText } = render(
      <RuleInlineContent attachment={createAttachment()} isSidebar={false} />
    );
    expect(getByText('Draft')).toBeDefined();
  });

  it('shows enabled status when origin is set and enabled is undefined (server default)', () => {
    const { getByText } = render(
      <RuleInlineContent attachment={createAttachment({ origin: 'rule-123' })} isSidebar={false} />
    );
    expect(getByText('Enabled')).toBeDefined();
  });

  it('shows enabled status when origin is set and enabled is true', () => {
    const { getByText } = render(
      <RuleInlineContent
        attachment={createAttachment({ origin: 'rule-123', enabled: true })}
        isSidebar={false}
      />
    );
    expect(getByText('Enabled')).toBeDefined();
  });

  it('shows disabled status when origin is set and enabled is false', () => {
    const { getByText } = render(
      <RuleInlineContent
        attachment={createAttachment({ origin: 'rule-123', enabled: false })}
        isSidebar={false}
      />
    );
    expect(getByText('Disabled')).toBeDefined();
  });

  it('shows the schedule interval', () => {
    const { getByText } = render(
      <RuleInlineContent attachment={createAttachment()} isSidebar={false} />
    );
    expect(getByText('Every 5 min')).toBeDefined();
  });

  it('shows the description', () => {
    const { getByText } = render(
      <RuleInlineContent attachment={createAttachment()} isSidebar={false} />
    );
    expect(getByText('A test rule')).toBeDefined();
  });

  it('renders tags', () => {
    const { getByText } = render(
      <RuleInlineContent attachment={createAttachment()} isSidebar={false} />
    );
    expect(getByText('tag1')).toBeDefined();
    expect(getByText('tag2')).toBeDefined();
  });

  it('does not render tags section when tags are empty', () => {
    const attachment = createAttachment();
    attachment.data.metadata.tags = [];
    const { queryByText } = render(<RuleInlineContent attachment={attachment} isSidebar={false} />);
    expect(queryByText('tag1')).toBeNull();
  });

  it('does not render description when absent', () => {
    const attachment = createAttachment();
    attachment.data.metadata.description = undefined;
    const { queryByText } = render(<RuleInlineContent attachment={attachment} isSidebar={false} />);
    expect(queryByText('A test rule')).toBeNull();
  });

  it('does not render schedule when absent', () => {
    const attachment = createAttachment();
    attachment.data.schedule = undefined;
    const { queryByText } = render(<RuleInlineContent attachment={attachment} isSidebar={false} />);
    expect(queryByText('Every 5 min')).toBeNull();
  });

  it('shows unsaved changes when this version is newer than the last sync', () => {
    const { getByTestId } = render(
      <RuleInlineContent
        attachment={createAttachment({
          origin: 'rule-123',
          versionData: {
            version: 2,
            versionCount: 2,
            createdAt: '2026-04-02T00:00:00.000Z',
            originSyncedAt: '2026-04-01T00:00:00.000Z',
          },
        })}
        isSidebar={false}
      />
    );
    expect(getByTestId('attachmentPersistenceUnsavedChanges')).toHaveTextContent('Unsaved changes');
    expect(getByTestId('ruleInlineStatus')).toHaveTextContent('Enabled');
  });

  it('shows that the attachment is not in sync with the saved rule', async () => {
    mockGetRule.mockResolvedValue({ updated_at: '2026-05-01T00:00:00.000Z' });
    const { findByTestId } = render(
      <RuleInlineContent
        attachment={createAttachment({
          origin: 'rule-123',
          updatedAt: '2026-04-01T00:00:00.000Z',
          versionData: {
            version: 1,
            versionCount: 1,
            createdAt: '2026-04-01T00:00:00.000Z',
            originSyncedAt: '2026-04-01T00:00:00.000Z',
          },
        })}
        isSidebar={false}
      />
    );
    expect(await findByTestId('attachmentPersistenceOutOfSync')).toHaveTextContent('Not in sync');
  });

  it('shows Saving... while a save is in progress', async () => {
    let finishSave: () => void = () => {};
    const { findByTestId, queryByTestId } = render(
      <RuleInlineContent attachment={createAttachment()} isSidebar={false} />
    );
    const pending = runAttachmentSave(
      'att-1',
      () =>
        new Promise<void>((resolve) => {
          finishSave = resolve;
        })
    );

    expect(await findByTestId('attachmentPersistenceSaving')).toHaveTextContent('Saving...');
    finishSave();
    await pending;
    await waitFor(() => {
      expect(queryByTestId('attachmentPersistenceSaving')).toBeNull();
    });
  });

  it('shows all changes saved when the latest version matches the last sync', async () => {
    const { findByTestId, queryByTestId } = render(
      <RuleInlineContent
        attachment={createAttachment({
          origin: 'rule-123',
          updatedAt: '2026-04-10T00:00:00.000Z',
          versionData: {
            version: 1,
            versionCount: 1,
            createdAt: '2026-04-10T00:00:00.000Z',
            originSyncedAt: '2026-04-10T00:00:00.000Z',
          },
        })}
        isSidebar={false}
      />
    );

    expect(await findByTestId('attachmentPersistenceSaved')).toHaveTextContent('All changes saved');
    expect(queryByTestId('attachmentPersistenceUnsavedChanges')).toBeNull();
  });

  it('shows no sync indication for an older version', () => {
    const { queryByTestId } = render(
      <RuleInlineContent
        attachment={createAttachment({
          origin: 'rule-123',
          updatedAt: '2026-04-01T00:00:00.000Z',
          versionData: {
            version: 1,
            versionCount: 2,
            createdAt: '2026-04-02T00:00:00.000Z',
            originSyncedAt: '2026-04-01T00:00:00.000Z',
          },
        })}
        isSidebar={false}
      />
    );

    expect(queryByTestId('attachmentPersistenceUnsavedChanges')).toBeNull();
    expect(queryByTestId('attachmentPersistenceSaved')).toBeNull();
    expect(mockGetRule).not.toHaveBeenCalled();
  });

  it('flips from unsaved changes to saved when the canvas records a save', async () => {
    const { getByTestId, findByTestId, queryByTestId } = render(
      <RuleInlineContent
        attachment={createAttachment({
          id: 'att-inline-saved-from-canvas',
          origin: 'rule-123',
          versionData: {
            version: 2,
            versionCount: 2,
            createdAt: '2026-04-02T00:00:00.000Z',
            originSyncedAt: '2026-04-01T00:00:00.000Z',
          },
        })}
        isSidebar={false}
      />
    );
    expect(getByTestId('attachmentPersistenceUnsavedChanges')).toBeDefined();

    await act(async () => {
      await syncAttachmentOrigin(
        'att-inline-saved-from-canvas',
        'rule-123',
        jest.fn().mockResolvedValue({
          success: true,
          attachment: { origin_snapshot_at: '2026-04-03T00:00:00.000Z' },
        })
      );
    });

    expect(await findByTestId('attachmentPersistenceSaved')).toHaveTextContent('All changes saved');
    expect(queryByTestId('attachmentPersistenceUnsavedChanges')).toBeNull();
  });

  it('falls back to the raw interval when its unit is not supported by formatDuration', () => {
    const attachment = createAttachment();
    attachment.data.schedule = { every: '250ms' };
    const { getByText } = render(<RuleInlineContent attachment={attachment} isSidebar={false} />);
    expect(getByText('Every 250ms')).toBeDefined();
  });
});
