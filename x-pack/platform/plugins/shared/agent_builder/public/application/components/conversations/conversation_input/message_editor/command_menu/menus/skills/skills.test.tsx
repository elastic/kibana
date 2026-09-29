/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';

import React from 'react';
import { render, screen } from '@testing-library/react';
import { EuiProvider } from '@elastic/eui';
import { Skills } from './skills';

const mockSkills = [
  { id: 'skill-1', name: 'Summarize', description: 'Summarize text' },
  { id: 'skill-2', name: 'Translate', description: 'Translate text' },
  { id: 'skill-3', name: 'Search', description: 'Search documents' },
];

vi.mock('../../../../../../../hooks/use_conversation', () => {
  const mocked = {
    useAgentId: () => 'test-agent-id',
  };
  return { ...mocked, default: mocked };
});

vi.mock('../../../../../../../hooks/skills/use_agent_skills', () => {
  const mocked = {
    useAgentSkills: () => ({
      skills: mockSkills,
      isLoading: false,
      error: null,
      isError: false,
    }),
  };
  return { ...mocked, default: mocked };
});

const renderWithProvider = (ui: React.ReactElement) => {
  return render(<EuiProvider>{ui}</EuiProvider>);
};

describe('Skills', () => {
  it('renders all skills when query is empty', () => {
    renderWithProvider(<Skills query="" onSelect={vi.fn()} />);

    expect(screen.getByText('Summarize')).toBeInTheDocument();
    expect(screen.getByText('Translate')).toBeInTheDocument();
    expect(screen.getByText('Search')).toBeInTheDocument();
  });

  it('filters skills by query', () => {
    renderWithProvider(<Skills query="sum" onSelect={vi.fn()} />);

    expect(screen.getByText('Summarize')).toBeInTheDocument();
    expect(screen.queryByText('Translate')).not.toBeInTheDocument();
    expect(screen.queryByText('Search')).not.toBeInTheDocument();
  });

  it('filters case-insensitively', () => {
    renderWithProvider(<Skills query="TRANS" onSelect={vi.fn()} />);

    expect(screen.getByText('Translate')).toBeInTheDocument();
    expect(screen.queryByText('Summarize')).not.toBeInTheDocument();
  });

  it('shows loading state when skills are loading', async () => {
    const useAgentSkillsMock = (vi.mocked(await import(
      '../../../../../../../hooks/skills/use_agent_skills'
    ))) as {
      useAgentSkills: () => unknown;
    };
    const originalImpl = useAgentSkillsMock.useAgentSkills;
    useAgentSkillsMock.useAgentSkills = () => ({
      skills: [],
      isLoading: true,
      error: null,
      isError: false,
    });

    renderWithProvider(<Skills query="" onSelect={vi.fn()} />);

    expect(screen.getByTestId('skillsMenu-loading')).toBeInTheDocument();

    useAgentSkillsMock.useAgentSkills = originalImpl;
  });

  describe('reporting content presence via onContentChange', () => {
    it('reports content when there are matching skills, for the current query', () => {
      const onContentChange = vi.fn();
      renderWithProvider(<Skills query="" onSelect={vi.fn()} onContentChange={onContentChange} />);

      expect(onContentChange).toHaveBeenCalledWith(true, '');
    });

    it('reports no content once the query matches nothing, for the current query', () => {
      const onContentChange = vi.fn();
      renderWithProvider(
        <Skills query="nosuchskill" onSelect={vi.fn()} onContentChange={onContentChange} />
      );

      expect(onContentChange).toHaveBeenCalledWith(false, 'nosuchskill');
    });

    it('keeps reporting content across every word of a multi-word skill name', async () => {
      const useAgentSkillsMock = (vi.mocked(await import(
        '../../../../../../../hooks/skills/use_agent_skills'
      ))) as {
        useAgentSkills: () => unknown;
      };
      const originalImpl = useAgentSkillsMock.useAgentSkills;
      useAgentSkillsMock.useAgentSkills = () => ({
        skills: [...mockSkills, { id: 'skill-4', name: 'Skill With Spaces' }],
        isLoading: false,
        error: null,
        isError: false,
      });

      const onContentChange = vi.fn();
      const { rerender } = renderWithProvider(
        <Skills query="Skill" onSelect={vi.fn()} onContentChange={onContentChange} />
      );
      expect(onContentChange).toHaveBeenLastCalledWith(true, 'Skill');

      rerender(
        <EuiProvider>
          <Skills query="Skill With" onSelect={vi.fn()} onContentChange={onContentChange} />
        </EuiProvider>
      );
      expect(onContentChange).toHaveBeenLastCalledWith(true, 'Skill With');

      rerender(
        <EuiProvider>
          <Skills query="Skill With Spaces" onSelect={vi.fn()} onContentChange={onContentChange} />
        </EuiProvider>
      );
      expect(onContentChange).toHaveBeenLastCalledWith(true, 'Skill With Spaces');

      useAgentSkillsMock.useAgentSkills = originalImpl;
    });

    it('reports content while loading, even with zero skills so far', async () => {
      const useAgentSkillsMock = (vi.mocked(await import(
        '../../../../../../../hooks/skills/use_agent_skills'
      ))) as {
        useAgentSkills: () => unknown;
      };
      const originalImpl = useAgentSkillsMock.useAgentSkills;
      useAgentSkillsMock.useAgentSkills = () => ({
        skills: [],
        isLoading: true,
        error: null,
        isError: false,
      });

      const onContentChange = vi.fn();
      renderWithProvider(
        <Skills query="nosuchskill" onSelect={vi.fn()} onContentChange={onContentChange} />
      );

      expect(onContentChange).toHaveBeenCalledWith(true, 'nosuchskill');

      useAgentSkillsMock.useAgentSkills = originalImpl;
    });
  });
});
