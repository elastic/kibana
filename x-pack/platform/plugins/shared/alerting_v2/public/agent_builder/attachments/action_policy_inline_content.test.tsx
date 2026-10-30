/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { ACTION_POLICY_ATTACHMENT_TYPE } from '@kbn/alerting-v2-schemas';
import { POLICY_SCOPE_SUMMARIES } from '../../components/action_policy/details_flyout/policy_scope_summary';
import { ActionPolicyInlineContent } from './action_policy_inline_content';
import { runAttachmentSave } from './attachment_persistence';

const mockGetActionPolicy = jest.fn();
const mockActionPoliciesApiService = {
  getActionPolicy: (...args: unknown[]) => mockGetActionPolicy(...args),
};

jest.mock('@kbn/core-di-browser', () => ({
  useService: () => mockActionPoliciesApiService,
}));

jest.mock('../../services/action_policies_api', () => ({
  ActionPoliciesApi: Symbol('ActionPoliciesApi'),
}));

const createAttachment = (
  overrides: {
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
  id: 'att-1',
  type: ACTION_POLICY_ATTACHMENT_TYPE,
  versions: [],
  current_version: 1,
  origin: overrides.origin,
  versionData: overrides.versionData,
  data: {
    name: 'My Policy',
    description: 'A test policy',
    destinations: [{ type: 'workflow' as const, id: 'wf-1' }],
    matcher: { tags: ['production', 'sre'], expression: 'alert_status: "active"' },
    grouping: { mode: 'per_alert' as const },
    throttle: { strategy: 'on_status_change' as const },
    enabled: overrides.enabled,
    updated_at: overrides.updatedAt,
  } as any,
});

describe('ActionPolicyInlineContent', () => {
  beforeEach(() => {
    mockGetActionPolicy.mockReset();
    mockGetActionPolicy.mockResolvedValue({ updated_at: '2026-04-10T00:00:00.000Z' });
  });

  it('shows draft status when no origin', () => {
    render(<ActionPolicyInlineContent attachment={createAttachment()} isSidebar={false} />);
    expect(screen.getByText('Draft')).toBeDefined();
  });

  it('shows enabled status when origin is set and enabled is undefined', () => {
    render(
      <ActionPolicyInlineContent
        attachment={createAttachment({ origin: 'policy-123' })}
        isSidebar={false}
      />
    );
    expect(screen.getByText('Enabled')).toBeDefined();
  });

  it('shows disabled status when origin is set and enabled is false', () => {
    render(
      <ActionPolicyInlineContent
        attachment={createAttachment({ origin: 'policy-123', enabled: false })}
        isSidebar={false}
      />
    );
    expect(screen.getByText('Disabled')).toBeDefined();
  });

  it('renders the policy scope section', () => {
    render(<ActionPolicyInlineContent attachment={createAttachment()} isSidebar={false} />);
    expect(screen.getByText('Policy scope')).toBeDefined();
    expect(screen.getByText(POLICY_SCOPE_SUMMARIES.tagsAndExpression)).toBeDefined();
  });

  it('renders the info bar with dispatch mode, frequency and destination count', () => {
    render(<ActionPolicyInlineContent attachment={createAttachment()} isSidebar={false} />);
    expect(screen.getByTestId('actionPolicyInlineDispatchPer')).toHaveTextContent('Alert');
    expect(screen.getByTestId('actionPolicyInlineFrequency')).toHaveTextContent('On status change');
    expect(screen.getByTestId('actionPolicyInlineDestination')).toHaveTextContent('1 workflow');
  });

  it('pluralizes the destination count', () => {
    const attachment = createAttachment();
    attachment.data.destinations = [
      { type: 'workflow', id: 'wf-1' },
      { type: 'workflow', id: 'wf-2' },
    ];
    render(<ActionPolicyInlineContent attachment={attachment} isSidebar={false} />);
    expect(screen.getByTestId('actionPolicyInlineDestination')).toHaveTextContent('2 workflows');
  });

  describe('sync indication', () => {
    it('shows no notice for a draft', () => {
      render(<ActionPolicyInlineContent attachment={createAttachment()} isSidebar={false} />);
      expect(screen.queryByTestId('attachmentPersistenceUnsavedChanges')).toBeNull();
      expect(screen.queryByTestId('attachmentPersistenceOutOfSync')).toBeNull();
      expect(screen.queryByTestId('attachmentPersistenceSaved')).toBeNull();
      expect(mockGetActionPolicy).not.toHaveBeenCalled();
    });

    it('shows all changes saved for a policy that still matches the save', async () => {
      render(
        <ActionPolicyInlineContent
          attachment={createAttachment({
            origin: 'policy-123',
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

      await waitFor(() => {
        expect(mockGetActionPolicy).toHaveBeenCalledWith('policy-123', expect.any(AbortSignal));
      });
      expect(screen.queryByTestId('attachmentPersistenceOutOfSync')).toBeNull();
      expect(screen.queryByTestId('attachmentPersistenceUnsavedChanges')).toBeNull();
      expect(screen.getByTestId('attachmentPersistenceSaved')).toHaveTextContent(
        'All changes saved'
      );
    });

    it('shows no sync indication for an older version', () => {
      render(
        <ActionPolicyInlineContent
          attachment={createAttachment({
            origin: 'policy-123',
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

      expect(screen.queryByTestId('attachmentPersistenceUnsavedChanges')).toBeNull();
      expect(screen.queryByTestId('attachmentPersistenceSaved')).toBeNull();
      expect(mockGetActionPolicy).not.toHaveBeenCalled();
    });

    it('shows unsaved changes when this version is newer than the last sync', () => {
      render(
        <ActionPolicyInlineContent
          attachment={createAttachment({
            origin: 'policy-123',
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

      expect(screen.getByTestId('attachmentPersistenceUnsavedChanges')).toHaveTextContent(
        'Unsaved changes'
      );
      expect(screen.getByTestId('attachmentPersistenceUnsavedChanges')).toHaveTextContent(
        'Save the policy to keep these edits.'
      );
    });

    it('shows that the attachment is not in sync with the saved policy', async () => {
      mockGetActionPolicy.mockResolvedValue({ updated_at: '2026-05-01T00:00:00.000Z' });
      render(
        <ActionPolicyInlineContent
          attachment={createAttachment({
            origin: 'policy-123',
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

      expect(await screen.findByTestId('attachmentPersistenceOutOfSync')).toHaveTextContent(
        'The saved policy has changed since this attachment was last synced.'
      );
    });

    it('shows Saving... while a save is in progress', async () => {
      let finishSave: () => void = () => {};
      render(<ActionPolicyInlineContent attachment={createAttachment()} isSidebar={false} />);
      const pending = runAttachmentSave(
        'att-1',
        () =>
          new Promise<void>((resolve) => {
            finishSave = resolve;
          })
      );

      expect(await screen.findByTestId('attachmentPersistenceSaving')).toHaveTextContent(
        'Saving...'
      );
      finishSave();
      await pending;
      await waitFor(() => {
        expect(screen.queryByTestId('attachmentPersistenceSaving')).toBeNull();
      });
    });
  });
});
