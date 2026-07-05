/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createRef } from 'react';
import { render, screen, act } from '@testing-library/react';
import { EuiProvider } from '@elastic/eui';
import { Skills } from './skills';
import { CommandId } from '../../types';
import type { CommandMenuHandle } from '../../types';

const mockSkills = [
  { id: 'skill-1', name: 'Summarize', description: 'Summarize text' },
  { id: 'skill-2', name: 'Translate', description: 'Translate text' },
  { id: 'skill-3', name: 'Search', description: 'Search documents' },
];

jest.mock('../../../../../../../hooks/use_conversation', () => ({
  useAgentId: () => 'test-agent-id',
}));

jest.mock('../../../../../../../hooks/skills/use_agent_skills', () => ({
  useAgentSkills: () => ({
    skills: mockSkills,
    isLoading: false,
    error: null,
    isError: false,
  }),
}));

const renderWithProvider = (ui: React.ReactElement) => {
  return render(<EuiProvider>{ui}</EuiProvider>);
};

describe('Skills', () => {
  it('renders all skills when query is empty', () => {
    renderWithProvider(<Skills query="" onSelect={jest.fn()} />);

    expect(screen.getByText('Summarize')).toBeInTheDocument();
    expect(screen.getByText('Translate')).toBeInTheDocument();
    expect(screen.getByText('Search')).toBeInTheDocument();
  });

  it('filters skills by query', () => {
    renderWithProvider(<Skills query="sum" onSelect={jest.fn()} />);

    expect(screen.getByText('Summarize')).toBeInTheDocument();
    expect(screen.queryByText('Translate')).not.toBeInTheDocument();
    expect(screen.queryByText('Search')).not.toBeInTheDocument();
  });

  it('filters case-insensitively', () => {
    renderWithProvider(<Skills query="TRANS" onSelect={jest.fn()} />);

    expect(screen.getByText('Translate')).toBeInTheDocument();
    expect(screen.queryByText('Summarize')).not.toBeInTheDocument();
  });

  it('shows loading state when skills are loading', () => {
    const useAgentSkillsMock = jest.requireMock(
      '../../../../../../../hooks/skills/use_agent_skills'
    ) as {
      useAgentSkills: () => unknown;
    };
    const originalImpl = useAgentSkillsMock.useAgentSkills;
    useAgentSkillsMock.useAgentSkills = () => ({
      skills: [],
      isLoading: true,
      error: null,
      isError: false,
    });

    renderWithProvider(<Skills query="" onSelect={jest.fn()} />);

    expect(screen.getByTestId('skillsMenu-loading')).toBeInTheDocument();

    useAgentSkillsMock.useAgentSkills = originalImpl;
  });

  describe('mark as invalid on Escape for no-match queries', () => {
    it('does not claim Escape while there are still matching skills', () => {
      const ref = createRef<CommandMenuHandle>();
      renderWithProvider(<Skills ref={ref} query="sum" onSelect={jest.fn()} />);

      expect(ref.current!.isKeyDownEventHandled({ key: 'Escape' } as React.KeyboardEvent)).toBe(
        false
      );
    });

    it('commits an invalid badge on Escape when nothing matches the query', () => {
      const ref = createRef<CommandMenuHandle>();
      const onSelect = jest.fn();
      renderWithProvider(<Skills ref={ref} query="nosuchskill" onSelect={onSelect} />);

      expect(ref.current!.isKeyDownEventHandled({ key: 'Escape' } as React.KeyboardEvent)).toBe(
        true
      );

      act(() => {
        ref.current!.handleKeyDown({ key: 'Escape' } as React.KeyboardEvent);
      });

      expect(onSelect).toHaveBeenCalledWith({
        commandId: CommandId.Skill,
        label: 'nosuchskill',
        id: '',
        metadata: {},
        matched: false,
        consumedLength: 'nosuchskill'.length,
      });
    });

    it('caps the invalid badge at the first space, since a skill name can legitimately contain one', () => {
      const ref = createRef<CommandMenuHandle>();
      const onSelect = jest.fn();
      renderWithProvider(
        <Skills ref={ref} query="nosuchskill and then more text" onSelect={onSelect} />
      );

      act(() => {
        ref.current!.handleKeyDown({ key: 'Escape' } as React.KeyboardEvent);
      });

      expect(onSelect).toHaveBeenCalledWith({
        commandId: CommandId.Skill,
        label: 'nosuchskill',
        id: '',
        metadata: {},
        matched: false,
        consumedLength: 'nosuchskill'.length,
      });
    });

    it('does not claim Escape for an empty query', () => {
      const ref = createRef<CommandMenuHandle>();
      renderWithProvider(<Skills ref={ref} query="" onSelect={jest.fn()} />);

      expect(ref.current!.isKeyDownEventHandled({ key: 'Escape' } as React.KeyboardEvent)).toBe(
        false
      );
    });
  });
});
