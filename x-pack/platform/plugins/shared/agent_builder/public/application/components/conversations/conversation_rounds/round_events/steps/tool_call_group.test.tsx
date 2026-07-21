/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiProvider } from '@elastic/eui';
import { I18nProvider } from '@kbn/i18n-react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createToolCallStep } from '@kbn/agent-builder-common/chat/conversation';
import type { ToolResult } from '@kbn/agent-builder-common/tools/tool_result';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import { ToolCallGroup } from './tool_call_group';

const renderWithProviders = (ui: React.ReactElement) =>
  render(
    <I18nProvider>
      <EuiProvider>{ui}</EuiProvider>
    </I18nProvider>
  );

const otherResult = (id: string): ToolResult => ({
  tool_result_id: id,
  type: ToolResultType.other,
  data: {},
});

const toolStep = (id: string, toolId: string, results: ToolResult[] = []) =>
  createToolCallStep({ tool_call_id: id, tool_id: toolId, params: {}, results });

describe('ToolCallGroup', () => {
  it('shows "N tools ran." once every step in the group has a result', () => {
    renderWithProviders(
      <ToolCallGroup
        steps={[
          toolStep('c1', 'search', [otherResult('r1')]),
          toolStep('c2', 'read', [otherResult('r2')]),
          toolStep('c3', 'write', [otherResult('r3')]),
        ]}
      />
    );
    expect(screen.getByText('3 tools ran.')).toBeInTheDocument();
  });

  it('shows "N tools running…" while at least one step is still in progress', () => {
    renderWithProviders(
      <ToolCallGroup
        steps={[toolStep('c1', 'search', [otherResult('r1')]), toolStep('c2', 'read')]}
      />
    );
    expect(screen.getByText('2 tools running…')).toBeInTheDocument();
  });

  it('expands to show each individual step, which opens its own flyout on click', async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <ToolCallGroup
        steps={[
          toolStep('c1', 'search', [otherResult('r1')]),
          toolStep('c2', 'read', [otherResult('r2')]),
        ]}
      />
    );
    await user.click(screen.getByText('2 tools ran.'));
    const childStatuses = screen
      .getAllByRole('status')
      .filter((el) => el.textContent !== '2 tools ran.');
    expect(childStatuses.map((el) => el.querySelector('.euiBadge')?.textContent)).toEqual([
      'tool: search',
      'tool: read',
    ]);
    expect(childStatuses.every((el) => el.textContent?.includes('ran.'))).toBe(true);

    await user.click(screen.getAllByRole('button')[1]);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });
});
