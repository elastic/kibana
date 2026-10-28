/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createRef } from 'react';
import { act, render, screen, fireEvent } from '@testing-library/react';
import { EuiProvider } from '@elastic/eui';
import type { AgentDefinition } from '@kbn/agent-builder-common';
import type { CommandMenuHandle } from '../../types';
import { CommandId } from '../../types';
import { Mentions } from './mentions';
import type { MentionCandidate } from './types';

const mockUseMentionCandidates = jest.fn();
jest.mock('./use_mention_candidates', () => ({
  useMentionCandidates: (query: string) => mockUseMentionCandidates(query),
}));

const agentCandidate: MentionCandidate = {
  kind: 'agent',
  id: 'agent-1',
  name: 'Elastic AI Agent',
  agent: { id: 'agent-1', name: 'Elastic AI Agent' } as AgentDefinition,
};
const julianCandidate: MentionCandidate = {
  kind: 'user',
  id: 'julian',
  name: 'Julian Rosado',
  profile: {
    uid: 'julian',
    enabled: true,
    user: { username: 'julian', full_name: 'Julian Rosado' },
    data: {},
  },
};
const pierreCandidate: MentionCandidate = {
  ...julianCandidate,
  id: 'pierre',
  name: 'Pierre Gayvallet',
  profile: {
    uid: 'pierre',
    enabled: true,
    user: { username: 'pierre', full_name: 'Pierre Gayvallet' },
    data: {},
  },
};

const renderMentions = (props: Partial<React.ComponentProps<typeof Mentions>> = {}) =>
  render(
    <EuiProvider>
      <Mentions query="" onSelect={jest.fn()} {...props} />
    </EuiProvider>
  );

describe('Mentions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseMentionCandidates.mockReturnValue({
      candidates: [agentCandidate, julianCandidate, pierreCandidate],
      isLoading: false,
    });
  });

  it('renders a row for each candidate, in order', () => {
    renderMentions();

    const rows = screen.getAllByRole('option');
    expect(rows.map((row) => row.textContent)).toEqual([
      expect.stringContaining('Elastic AI Agent'),
      expect.stringContaining('Julian Rosado'),
      expect.stringContaining('Pierre Gayvallet'),
    ]);
  });

  it('asks for candidates with the typed text', () => {
    renderMentions({ query: 'jul' });

    expect(mockUseMentionCandidates).toHaveBeenCalledWith('jul');
  });

  it('selects a user with its id and kind', () => {
    const onSelect = jest.fn();
    renderMentions({ onSelect });

    fireEvent.click(screen.getByText('Julian Rosado'));

    expect(onSelect).toHaveBeenCalledWith({
      commandId: CommandId.Mention,
      label: 'Julian Rosado',
      id: 'julian',
      metadata: { kind: 'user' },
    });
  });

  it('selects the agent with its id and kind', () => {
    const onSelect = jest.fn();
    renderMentions({ onSelect });

    fireEvent.click(screen.getByText('Elastic AI Agent'));

    expect(onSelect).toHaveBeenCalledWith({
      commandId: CommandId.Mention,
      label: 'Elastic AI Agent',
      id: 'agent-1',
      metadata: { kind: 'agent' },
    });
  });

  describe('keyboard', () => {
    it('selects the highlighted row on Enter, and moves with the arrow keys', () => {
      const onSelect = jest.fn();
      const ref = createRef<CommandMenuHandle>();
      renderMentions({ onSelect, ref });

      const arrowDown = { key: 'ArrowDown' } as React.KeyboardEvent;
      const enter = { key: 'Enter' } as React.KeyboardEvent;
      expect(ref.current?.isKeyDownEventHandled(enter)).toBe(true);

      act(() => {
        ref.current?.handleKeyDown(arrowDown);
      });
      act(() => {
        ref.current?.handleKeyDown(enter);
      });

      expect(onSelect).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'julian', metadata: { kind: 'user' } })
      );
    });
  });

  it('shows the Enter hint on the highlighted row only', () => {
    const { container } = renderMentions();

    expect(container.querySelectorAll('[data-euiicon-type="returnKey"]')).toHaveLength(1);
  });

  describe('reporting content presence via onContentChange', () => {
    it('reports content when there are candidates', () => {
      const onContentChange = jest.fn();
      renderMentions({ query: 'jul', onContentChange });

      expect(onContentChange).toHaveBeenCalledWith(true, 'jul');
    });

    it('reports no content when nobody matches', () => {
      mockUseMentionCandidates.mockReturnValue({ candidates: [], isLoading: false });
      const onContentChange = jest.fn();
      renderMentions({ query: 'Julian Ro', onContentChange });

      expect(onContentChange).toHaveBeenCalledWith(false, 'Julian Ro');
    });

    it('reports content while people are loading, and shows a spinner', () => {
      mockUseMentionCandidates.mockReturnValue({ candidates: [], isLoading: true });
      const onContentChange = jest.fn();
      renderMentions({ query: 'Julian Ro', onContentChange });

      expect(onContentChange).toHaveBeenCalledWith(true, 'Julian Ro');
      expect(screen.getByTestId('mentionsMenu-loading')).toBeInTheDocument();
    });

    it('keeps the found people on screen while more are loading', () => {
      mockUseMentionCandidates.mockReturnValue({ candidates: [julianCandidate], isLoading: true });
      renderMentions();

      expect(screen.getByText('Julian Rosado')).toBeInTheDocument();
      expect(screen.queryByTestId('mentionsMenu-loading')).not.toBeInTheDocument();
    });
  });
});
