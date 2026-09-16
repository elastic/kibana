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
  group_by: null,
  tags: null,
  grouping_mode: null,
  throttle: { strategy: undefined, interval: null },
  snoozed_until: null,
  auth: { owner: 'elastic', created_by_user: false },
  created_by: 'elastic_uid',
  created_at: '2026-01-01T00:00:00.000Z',
  updated_by: 'elastic_uid',
  updated_at: '2026-01-02T00:00:00.000Z',
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
        onUpdateApiKey={jest.fn()}
      />
    </I18nProvider>
  );

describe('ActionPolicyActionsCell', () => {
  describe('when the user has write privilege', () => {
    it('renders the edit and more actions affordances', () => {
      renderCell(true);

      expect(screen.getByLabelText('Edit this action policy')).toBeInTheDocument();
      expect(screen.getByLabelText('More actions')).toBeInTheDocument();
    });

    it('does not render a standalone view details button (the name link covers it)', () => {
      renderCell(true);

      expect(screen.queryByTestId('actionPolicyViewDetailsButton')).not.toBeInTheDocument();
    });
  });

  describe('when the user only has read privilege', () => {
    it('renders no write affordances', () => {
      renderCell(false);

      expect(screen.queryByTestId('actionPolicyViewDetailsButton')).not.toBeInTheDocument();
      expect(screen.queryByLabelText('Edit this action policy')).not.toBeInTheDocument();
      expect(screen.queryByLabelText('More actions')).not.toBeInTheDocument();
    });
  });
});
