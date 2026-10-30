/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, waitFor } from '@testing-library/react';
import { Container } from 'inversify';
import { ACTION_POLICY_ATTACHMENT_TYPE, RULE_ATTACHMENT_TYPE } from '@kbn/alerting-v2-schemas';
import { ActionPoliciesApi } from '../../services/action_policies_api';
import { RulesApi } from '../../services/rules_api';
import { createActionPolicyAttachmentDefinition } from './action_policy_attachment_definition';
import { createRuleAttachmentDefinition } from './rule_attachment_definition';

// The agent builder renders `renderInlineContent` outside the alerting_v2 DI tree, so the
// definitions must provide the container themselves. `@kbn/core-di-browser` is deliberately not
// mocked here: the other suites mock `useService`, which hides a missing provider.
jest.mock('../../services/rules_api', () => ({
  RulesApi: Symbol('RulesApi'),
}));

jest.mock('../../services/action_policies_api', () => ({
  ActionPoliciesApi: Symbol('ActionPoliciesApi'),
}));

const syncedAt = '2026-04-01T00:00:00.000Z';
const versionData = {
  version: 1,
  versionCount: 1,
  createdAt: syncedAt,
  originSyncedAt: syncedAt,
};

describe('inline attachment content without an ambient DI container', () => {
  const getRule = jest.fn();
  const getActionPolicy = jest.fn();
  const container = new Container();
  container.bind(RulesApi).toConstantValue({ getRule } as unknown as RulesApi);
  container.bind(ActionPoliciesApi).toConstantValue({
    getActionPolicy,
  } as unknown as ActionPoliciesApi);

  beforeEach(() => {
    jest.clearAllMocks();
    getRule.mockResolvedValue({ updated_at: '2026-05-01T00:00:00.000Z' });
    getActionPolicy.mockResolvedValue({ updated_at: '2026-05-01T00:00:00.000Z' });
  });

  it('renders a rule draft', () => {
    const definition = createRuleAttachmentDefinition({ container });
    const attachment = {
      id: 'att-rule',
      type: RULE_ATTACHMENT_TYPE,
      versions: [],
      current_version: 1,
      origin: undefined,
      data: {
        kind: 'signal' as const,
        metadata: { name: 'My Rule' },
        schedule: { every: '5m' },
        time_field: '@timestamp',
        query: { base: 'FROM logs-*' },
      } as any,
    };

    const { getByTestId } = render(
      <>{definition.renderInlineContent!({ attachment, isSidebar: false })}</>
    );

    expect(getByTestId('ruleInlineStatus')).toHaveTextContent('Draft');
  });

  it('flags a saved rule that changed after the last sync', async () => {
    const definition = createRuleAttachmentDefinition({ container });
    const attachment = {
      id: 'att-rule',
      type: RULE_ATTACHMENT_TYPE,
      versions: [],
      current_version: 1,
      origin: 'rule-123',
      versionData,
      data: {
        kind: 'signal' as const,
        metadata: { name: 'My Rule' },
        schedule: { every: '5m' },
        time_field: '@timestamp',
        query: { base: 'FROM logs-*' },
        updated_at: syncedAt,
      } as any,
    };

    const { findByTestId } = render(
      <>{definition.renderInlineContent!({ attachment, isSidebar: false })}</>
    );

    expect(await findByTestId('attachmentPersistenceOutOfSync')).toHaveTextContent(
      'The saved rule has changed'
    );
    expect(getRule).toHaveBeenCalledWith('rule-123', expect.any(AbortSignal));
  });

  it('renders an action policy draft', () => {
    const definition = createActionPolicyAttachmentDefinition({ container });
    const attachment = {
      id: 'att-policy',
      type: ACTION_POLICY_ATTACHMENT_TYPE,
      versions: [],
      current_version: 1,
      origin: undefined,
      data: { name: 'My Policy', destinations: [{ type: 'workflow' as const, id: 'wf-1' }] } as any,
    };

    const { getByTestId } = render(
      <>{definition.renderInlineContent!({ attachment, isSidebar: false })}</>
    );

    expect(getByTestId('actionPolicyInlineStatus')).toHaveTextContent('Draft');
  });

  it('flags a saved action policy that changed after the last sync', async () => {
    const definition = createActionPolicyAttachmentDefinition({ container });
    const attachment = {
      id: 'att-policy',
      type: ACTION_POLICY_ATTACHMENT_TYPE,
      versions: [],
      current_version: 1,
      origin: 'policy-123',
      versionData,
      data: {
        name: 'My Policy',
        destinations: [{ type: 'workflow' as const, id: 'wf-1' }],
        updated_at: syncedAt,
      } as any,
    };

    const { findByTestId } = render(
      <>{definition.renderInlineContent!({ attachment, isSidebar: false })}</>
    );

    expect(await findByTestId('attachmentPersistenceOutOfSync')).toHaveTextContent(
      'The saved policy has changed'
    );
    await waitFor(() => {
      expect(getActionPolicy).toHaveBeenCalledWith('policy-123', expect.any(AbortSignal));
    });
  });
});
