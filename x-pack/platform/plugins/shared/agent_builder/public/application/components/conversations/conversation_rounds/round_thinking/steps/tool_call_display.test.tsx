/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { ToolOrigin } from '@kbn/agent-builder-common/tools';
import type { ToolCallStep } from '@kbn/agent-builder-common/chat/conversation';
import { ToolCallDisplay } from './tool_call_display';

jest.mock('../../../../../hooks/use_navigation', () => ({
  useNavigation: () => ({
    createAgentBuilderUrl: (path: string) => `https://kibana.local${path}`,
  }),
}));

jest.mock('./thinking_item_layout', () => ({
  ThinkingItemLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

const renderWithIntl = (step: ToolCallStep) =>
  render(
    <IntlProvider locale="en">
      <ToolCallDisplay step={step} />
    </IntlProvider>
  );

const createStep = (overrides: Partial<ToolCallStep> = {}): ToolCallStep =>
  ({
    type: 'tool_call',
    tool_call_id: 'call-1',
    tool_id: 'registry.tool',
    params: {},
    results: [],
    ...overrides,
  } as ToolCallStep);

describe('ToolCallDisplay', () => {
  it('renders a link for registry tools', () => {
    renderWithIntl(createStep({ tool_origin: ToolOrigin.registry }));

    const link = screen.getByRole('link', { name: /view tool details registry\.tool/i });
    expect(link).toHaveAttribute('href', 'https://kibana.local/manage/tools/registry.tool');
  });

  it('renders plain code text for inline tools', () => {
    renderWithIntl(
      createStep({
        tool_id: 'inline.tool',
        tool_origin: ToolOrigin.inline,
      })
    );

    expect(screen.getByText('inline.tool')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /inline\.tool/i })).not.toBeInTheDocument();
  });

  it('renders plain text for internal tools', () => {
    renderWithIntl(
      createStep({
        tool_id: 'attachments.read',
        tool_origin: ToolOrigin.internal,
      })
    );

    expect(screen.getByText('attachments.read')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /attachments\.read/i })).not.toBeInTheDocument();
  });

  it('renders a link when tool_origin is missing (legacy fallback)', () => {
    renderWithIntl(
      createStep({
        tool_id: 'some.custom.tool',
        tool_origin: undefined,
      })
    );

    const link = screen.getByRole('link', { name: /view tool details some\.custom\.tool/i });
    expect(link).toHaveAttribute('href', 'https://kibana.local/manage/tools/some.custom.tool');
  });
});
