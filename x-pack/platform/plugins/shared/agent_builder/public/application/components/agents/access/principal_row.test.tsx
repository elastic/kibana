/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import '@testing-library/jest-dom';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import {
  AgentAccessControlMode,
  AgentAccessControlRole,
  type AgentAccessControlEntry,
} from '@kbn/agent-builder-common';
import { PrincipalRow } from './principal_row';

const renderRow = (entry: AgentAccessControlEntry) =>
  render(
    <IntlProvider locale="en">
      <PrincipalRow
        entry={entry}
        accessControlMode={AgentAccessControlMode.Private}
        onChangeRole={jest.fn()}
        onRemove={jest.fn()}
      />
    </IntlProvider>
  );

describe('PrincipalRow role selector', () => {
  it('is enabled for an id-backed entry', () => {
    renderRow({ type: 'user', id: 'u_alice', role: AgentAccessControlRole.User });

    expect(screen.getByRole('button', { name: 'Access level' })).toBeEnabled();
  });

  it('is disabled for a legacy name-only entry, which the server refuses to re-role', () => {
    renderRow({ type: 'user', name: 'alice', role: AgentAccessControlRole.User });

    expect(screen.getByRole('button', { name: 'Access level' })).toBeDisabled();
  });
});
