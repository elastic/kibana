/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import type { ActionPolicyResponse } from '@kbn/alerting-v2-schemas';
import { ActionPolicyActionsCell } from './action_policy_actions_cell';

const createPolicy = (overrides: Partial<ActionPolicyResponse> = {}): ActionPolicyResponse => ({
  id: 'policy-1',
  version: 'v1',
  name: 'Policy One',
  description: 'Policy description',
  enabled: true,
  destinations: [{ type: 'workflow', id: 'workflow-1' }],
  matcher: null,
  groupBy: null,
  tags: null,
  groupingMode: null,
  throttle: { strategy: undefined, interval: null },
  snoozedUntil: null,
  auth: { owner: 'elastic', createdByUser: false },
  createdBy: 'elastic_uid',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedBy: 'elastic_uid',
  updatedAt: '2026-01-02T00:00:00.000Z',
  ...overrides,
});

const renderCell = (canWrite: boolean) =>
  render(
    <I18nProvider>
      <ActionPolicyActionsCell
        policy={createPolicy()}
        canWrite={canWrite}
        onViewDetails={jest.fn()}
        onEdit={jest.fn()}
        onClone={jest.fn()}
        onDelete={jest.fn()}
        onSnooze={jest.fn()}
        onCancelSnooze={jest.fn()}
        onUpdateApiKey={jest.fn()}
      />
    </I18nProvider>
  );

describe('ActionPolicyActionsCell', () => {
  describe('when the user has write privilege', () => {
    it('renders the view details, edit, and more actions affordances', () => {
      renderCell(true);

      expect(screen.getByTestId('actionPolicyViewDetailsButton')).toBeInTheDocument();
      expect(screen.getByLabelText('Edit this action policy')).toBeInTheDocument();
      expect(screen.getByLabelText('More actions')).toBeInTheDocument();
    });
  });

  describe('when the user only has read privilege', () => {
    it('renders only the view details affordance', () => {
      renderCell(false);

      expect(screen.getByTestId('actionPolicyViewDetailsButton')).toBeInTheDocument();
      expect(screen.queryByLabelText('Edit this action policy')).not.toBeInTheDocument();
      expect(screen.queryByLabelText('More actions')).not.toBeInTheDocument();
    });
  });
});
