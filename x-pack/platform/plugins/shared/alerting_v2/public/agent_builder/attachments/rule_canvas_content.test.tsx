/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, render, waitFor } from '@testing-library/react';
import { RULE_ATTACHMENT_TYPE } from '@kbn/alerting-v2-schemas';
import { OBSERVABILITY_ALERTING_HOST } from '../../../common/locators';
import { RuleCanvasContent } from './rule_canvas_content';

const mockUpsertRule = jest.fn().mockImplementation(async (id: string) => ({ id }));
const mockCreateRule = jest.fn().mockResolvedValue({ id: 'generated-rule-id' });
const mockGetRule = jest.fn();
const mockRulesNavigateSync = jest.fn();
const mockAddSuccess = jest.fn();
const mockUseQueryClient = jest.requireActual('@kbn/react-query').useQueryClient;
const mockUseAlertingLocators = jest.requireActual(
  '../../application/locator_context'
).useAlertingLocators;
const mockBindLocatorsToHost = jest.fn((locators: unknown, host: unknown) => ({ locators, host }));
let capturedSummaryRule: Record<string, unknown> = {};

jest.mock('../../application/bind_locators_to_host', () => ({
  bindLocatorsToHost: (...args: [unknown, unknown]) => mockBindLocatorsToHost(...args),
  getAlertingV2Locators: () => ({
    rulesLocators: { navigateSync: (...args: unknown[]) => mockRulesNavigateSync(...args) },
  }),
}));

const mockNotificationsService = { toasts: { addSuccess: mockAddSuccess } };
const mockRulesApiService = {
  upsertRule: (...args: unknown[]) => mockUpsertRule(...args),
  createRule: (...args: unknown[]) => mockCreateRule(...args),
  getRule: (...args: unknown[]) => mockGetRule(...args),
};

jest.mock('@kbn/core-di-browser', () => ({
  CoreStart: (key: string) => key,
  useService: (token: unknown) =>
    token === 'notifications' ? mockNotificationsService : mockRulesApiService,
}));

jest.mock('../../components/rule/rule_summary', () => ({
  RuleSummaryBody: ({
    rule,
    children,
  }: {
    rule: Record<string, unknown>;
    children: React.ReactNode;
  }) => {
    capturedSummaryRule = rule;
    return <div data-test-subj="mockRuleSummaryBody">{children}</div>;
  },
  RuleSummaryAboutSection: () => <div data-test-subj="mockAboutSection" />,
  RuleSummaryInvestigationSection: () => <div data-test-subj="mockInvestigationSection" />,
  RuleSummaryArtifactsSection: () => {
    const queryClient = mockUseQueryClient();
    const locators = mockUseAlertingLocators();
    return (
      <div
        data-test-subj="mockArtifactsSection"
        data-has-query-client={Boolean(queryClient)}
        data-has-locators={Boolean(locators)}
      />
    );
  },
}));

jest.mock('../../components/rule/rule_summary/rule_summary_query_preview_section', () => ({
  RuleSummaryQueryPreviewSection: () => <div data-test-subj="mockQueryPreviewSection" />,
}));

jest.mock('../../services/rules_api', () => ({
  RulesApi: Symbol('RulesApi'),
}));

const createAttachment = (
  overrides: {
    id?: string;
    origin?: string;
    enabled?: boolean;
    dataId?: string;
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
    metadata: { name: 'My Rule', tags: ['tag1'], description: 'A test rule' },
    schedule: { every: '5m' },
    time_field: '@timestamp',
    query: { base: 'FROM logs-*' },
    enabled: overrides.enabled,
    updated_at: overrides.updatedAt,
    ...(overrides.dataId ? { id: overrides.dataId } : {}),
  } as any,
});

const renderCanvas = (
  overrides: {
    id?: string;
    origin?: string;
    enabled?: boolean;
    dataId?: string;
    updatedAt?: string;
    versionData?: {
      version: number;
      versionCount: number;
      createdAt: string;
      originSyncedAt?: string;
    };
  } = {},
  callbackOverrides: Record<string, jest.Mock> = {}
) => {
  const attachment = createAttachment(overrides);
  const registerActionButtons = jest.fn();
  const updateOrigin = jest.fn().mockResolvedValue(undefined);
  const closeCanvas = jest.fn();

  const result = render(
    <RuleCanvasContent
      attachment={attachment}
      isSidebar={false}
      registerActionButtons={callbackOverrides.registerActionButtons ?? registerActionButtons}
      updateOrigin={callbackOverrides.updateOrigin ?? updateOrigin}
      closeCanvas={closeCanvas}
    />
  );

  return {
    ...result,
    registerActionButtons: callbackOverrides.registerActionButtons ?? registerActionButtons,
    updateOrigin: callbackOverrides.updateOrigin ?? updateOrigin,
    attachment,
  };
};

const getLastRegisteredButtons = (registerActionButtons: jest.Mock) => {
  const { calls } = registerActionButtons.mock;
  return calls[calls.length - 1][0] as Array<{
    label: string;
    disabled?: boolean;
    disabledReason?: string;
    handler: () => unknown;
  }>;
};

describe('RuleCanvasContent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCreateRule.mockResolvedValue({ id: 'generated-rule-id' });
    mockUpsertRule.mockImplementation(async (id: string) => ({ id }));
    mockGetRule.mockResolvedValue({ updated_at: '2026-04-10T00:00:00.000Z' });
    capturedSummaryRule = {};
  });

  describe('rendering', () => {
    it('renders the unpersisted summary with its required providers', () => {
      const { getByTestId, queryByTestId } = renderCanvas();

      expect(getByTestId('mockRuleSummaryBody')).toBeDefined();
      expect(getByTestId('mockAboutSection')).toBeDefined();
      expect(getByTestId('mockInvestigationSection')).toBeDefined();
      expect(getByTestId('mockQueryPreviewSection')).toBeDefined();
      expect(getByTestId('mockArtifactsSection')).toHaveAttribute('data-has-query-client', 'true');
      expect(getByTestId('mockArtifactsSection')).toHaveAttribute('data-has-locators', 'true');
      expect(getByTestId('ruleCanvasStatus')).toHaveTextContent('Draft');
      expect(queryByTestId('attachmentPersistenceUnsavedChanges')).toBeNull();
      expect(queryByTestId('attachmentPersistenceOutOfSync')).toBeNull();
      expect(mockBindLocatorsToHost).toHaveBeenCalledWith(
        expect.anything(),
        OBSERVABILITY_ALERTING_HOST
      );

      const sectionOrder = Array.from(getByTestId('mockRuleSummaryBody').children).map((section) =>
        section.getAttribute('data-test-subj')
      );
      expect(sectionOrder).toEqual([
        'mockAboutSection',
        'mockQueryPreviewSection',
        'mockInvestigationSection',
        'mockArtifactsSection',
      ]);
    });

    it('does not expose a proposed data id as a persisted summary id', () => {
      renderCanvas({ dataId: 'proposed-rule-id' });

      expect(capturedSummaryRule.id).toBeUndefined();
    });

    it('shows enabled status and all changes saved for a rule that still matches the save', async () => {
      const { getByTestId, queryByTestId, registerActionButtons } = renderCanvas({
        origin: 'rule-123',
        enabled: true,
        updatedAt: '2026-04-10T00:00:00.000Z',
        versionData: {
          version: 1,
          versionCount: 1,
          createdAt: '2026-04-10T00:00:00.000Z',
          originSyncedAt: '2026-04-10T00:00:00.000Z',
        },
      });

      await waitFor(() => {
        expect(mockGetRule).toHaveBeenCalledWith('rule-123', expect.any(AbortSignal));
      });
      expect(getByTestId('ruleCanvasStatus')).toHaveTextContent('Enabled');
      expect(queryByTestId('attachmentPersistenceOutOfSync')).toBeNull();
      expect(queryByTestId('attachmentPersistenceUnsavedChanges')).toBeNull();
      expect(getByTestId('attachmentPersistenceSaved')).toHaveTextContent('All changes saved');

      const update = getLastRegisteredButtons(registerActionButtons).find(
        (button) => button.label === 'Update Rule'
      );
      expect(update?.disabled).toBe(true);
      expect(update?.disabledReason).toBe('All changes saved');
    });

    it('shows all changes saved and blocks a second update once Update Rule succeeds', async () => {
      const updateOrigin = jest.fn().mockResolvedValue({
        success: true,
        attachment: { origin_snapshot_at: '2026-04-03T00:00:00.000Z' },
      });
      const { registerActionButtons, getByTestId, findByTestId, queryByTestId } = renderCanvas(
        {
          id: 'att-update-then-saved',
          origin: 'rule-123',
          versionData: {
            version: 2,
            versionCount: 2,
            createdAt: '2026-04-02T00:00:00.000Z',
            originSyncedAt: '2026-04-01T00:00:00.000Z',
          },
        },
        { updateOrigin }
      );
      expect(getByTestId('attachmentPersistenceUnsavedChanges')).toBeDefined();

      const update = getLastRegisteredButtons(registerActionButtons).find(
        (button) => button.label === 'Update Rule'
      )!;
      expect(update.disabled).toBe(false);
      await act(async () => {
        await update.handler();
      });

      expect(updateOrigin).toHaveBeenCalledWith('rule-123');
      expect(await findByTestId('attachmentPersistenceSaved')).toHaveTextContent(
        'All changes saved'
      );
      expect(queryByTestId('attachmentPersistenceUnsavedChanges')).toBeNull();
      const updateAfterSave = getLastRegisteredButtons(registerActionButtons).find(
        (button) => button.label === 'Update Rule'
      );
      expect(updateAfterSave?.disabled).toBe(true);
      expect(updateAfterSave?.disabledReason).toBe('All changes saved');
    });

    it('shows unsaved changes when this version is newer than the last sync', () => {
      const { getByTestId } = renderCanvas({
        origin: 'rule-123',
        versionData: {
          version: 2,
          versionCount: 2,
          createdAt: '2026-04-02T00:00:00.000Z',
          originSyncedAt: '2026-04-01T00:00:00.000Z',
        },
      });

      expect(getByTestId('attachmentPersistenceUnsavedChanges')).toHaveTextContent(
        'Unsaved changes'
      );
      expect(getByTestId('ruleCanvasStatus')).toHaveTextContent('Enabled');
    });

    it('shows that the attachment is not in sync and blocks update', async () => {
      mockGetRule.mockResolvedValue({ updated_at: '2026-05-01T00:00:00.000Z' });
      const { registerActionButtons, findByTestId } = renderCanvas({
        origin: 'rule-123',
        updatedAt: '2026-04-01T00:00:00.000Z',
        versionData: {
          version: 1,
          versionCount: 1,
          createdAt: '2026-04-01T00:00:00.000Z',
          originSyncedAt: '2026-04-01T00:00:00.000Z',
        },
      });

      expect(await findByTestId('attachmentPersistenceOutOfSync')).toHaveTextContent('Not in sync');
      await waitFor(() => {
        const update = getLastRegisteredButtons(registerActionButtons).find(
          (button) => button.label === 'Update Rule'
        );
        expect(update?.disabled).toBe(true);
      });
    });

    it('shows Saving... and disables create while the request is in flight', async () => {
      let finishSave: (rule: { id: string }) => void = () => {};
      mockCreateRule.mockImplementation(
        () =>
          new Promise((resolve) => {
            finishSave = resolve;
          })
      );
      const { registerActionButtons, findByTestId, queryByTestId } = renderCanvas();
      const createButton = getLastRegisteredButtons(registerActionButtons).find(
        (button) => button.label === 'Create rule'
      )!;
      const pending = createButton.handler();

      expect(await findByTestId('attachmentPersistenceSaving')).toHaveTextContent('Saving...');
      await waitFor(() => {
        const saving = getLastRegisteredButtons(registerActionButtons).find(
          (button) => button.label === 'Saving...'
        );
        expect(saving?.disabled).toBe(true);
      });

      finishSave({ id: 'generated-rule-id' });
      await pending;
      await waitFor(() => {
        expect(queryByTestId('attachmentPersistenceSaving')).toBeNull();
      });
    });

    it('keeps a persisted attachment summary read-only', () => {
      renderCanvas({ origin: 'persisted-rule-id', dataId: 'stale-data-id' });

      expect(capturedSummaryRule.id).toBeUndefined();
    });
  });

  describe('action buttons for proposed (unsaved) rules', () => {
    it('registers Create rule button', () => {
      const { registerActionButtons } = renderCanvas();
      const buttons = getLastRegisteredButtons(registerActionButtons);
      expect(buttons.find((b) => b.label === 'Create rule')).toBeDefined();
    });

    it('does not register Update Rule button', () => {
      const { registerActionButtons } = renderCanvas();
      const buttons = getLastRegisteredButtons(registerActionButtons);
      expect(buttons.find((b) => b.label === 'Update Rule')).toBeUndefined();
    });

    it('Create rule handler calls upsertRule and updateOrigin', async () => {
      const updateOrigin = jest.fn().mockResolvedValue(undefined);
      const { registerActionButtons } = renderCanvas(
        { dataId: 'pre-assigned-id' },
        { updateOrigin }
      );

      const buttons = getLastRegisteredButtons(registerActionButtons);
      const createButton = buttons.find((b) => b.label === 'Create rule')!;
      await createButton.handler();

      expect(mockUpsertRule).toHaveBeenCalledWith(
        'pre-assigned-id',
        expect.objectContaining({ kind: 'signal' })
      );
      expect(updateOrigin).toHaveBeenCalledWith('pre-assigned-id');
      expect(mockAddSuccess).toHaveBeenCalled();
    });

    it('creates a rule and stores its generated id when the proposal has no id', async () => {
      const updateOrigin = jest.fn().mockResolvedValue(undefined);
      const { registerActionButtons } = renderCanvas({}, { updateOrigin });

      const buttons = getLastRegisteredButtons(registerActionButtons);
      const createButton = buttons.find((button) => button.label === 'Create rule')!;
      await createButton.handler();

      expect(mockCreateRule).toHaveBeenCalledWith(expect.objectContaining({ kind: 'signal' }));
      expect(mockUpsertRule).not.toHaveBeenCalled();
      expect(updateOrigin).toHaveBeenCalledWith('generated-rule-id');
    });
  });

  describe('action buttons for persisted (saved) rules', () => {
    it('registers Update Rule button', () => {
      const { registerActionButtons } = renderCanvas({ origin: 'rule-123' });
      const buttons = getLastRegisteredButtons(registerActionButtons);
      expect(buttons.find((b) => b.label === 'Update Rule')).toBeDefined();
    });

    it('registers View in Rules button', () => {
      const { registerActionButtons } = renderCanvas({ origin: 'rule-123' });
      const buttons = getLastRegisteredButtons(registerActionButtons);
      expect(buttons.find((b) => b.label === 'View in Rules')).toBeDefined();
    });

    it('does not register Create rule button', () => {
      const { registerActionButtons } = renderCanvas({ origin: 'rule-123' });
      const buttons = getLastRegisteredButtons(registerActionButtons);
      expect(buttons.find((b) => b.label === 'Create rule')).toBeUndefined();
    });

    it('Update Rule handler calls upsertRule with the origin id and syncs the attachment', async () => {
      const { registerActionButtons, attachment, updateOrigin } = renderCanvas({
        origin: 'rule-123',
      });

      const buttons = getLastRegisteredButtons(registerActionButtons);
      const updateButton = buttons.find((b) => b.label === 'Update Rule')!;
      await updateButton.handler();

      expect(mockUpsertRule).toHaveBeenCalledWith(
        'rule-123',
        expect.objectContaining({ metadata: attachment.data.metadata })
      );
      expect(updateOrigin).toHaveBeenCalledWith('rule-123');
      expect(mockAddSuccess).toHaveBeenCalled();
    });

    it('View in Rules handler navigates with the observability host', () => {
      const { registerActionButtons } = renderCanvas({ origin: 'rule-123' });

      const buttons = getLastRegisteredButtons(registerActionButtons);
      const viewButton = buttons.find((b) => b.label === 'View in Rules')!;
      viewButton.handler();

      expect(mockRulesNavigateSync).toHaveBeenCalledWith({
        ruleId: 'rule-123',
        host: OBSERVABILITY_ALERTING_HOST.rules,
      });
    });
  });

  describe('mounted guard', () => {
    it('first registers empty buttons then real buttons', () => {
      const { registerActionButtons } = renderCanvas();
      const { calls } = registerActionButtons.mock;
      expect(calls[0][0]).toEqual([]);
      expect(calls[calls.length - 1][0].length).toBeGreaterThan(0);
    });
  });
});
