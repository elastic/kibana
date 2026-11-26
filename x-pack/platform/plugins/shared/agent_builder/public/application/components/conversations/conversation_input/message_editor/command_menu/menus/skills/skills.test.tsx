/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { EuiProvider } from '@elastic/eui';
import { useSlashCommands } from '../../../../slash_commands/use_slash_commands';
import type { SlashCommand } from '../../../../slash_commands/types';
import { Skills } from './skills';

jest.mock('../../../../slash_commands/use_slash_commands', () => ({
  useSlashCommands: jest.fn(),
}));

const threadCommand: SlashCommand = {
  name: 'thread',
  description: 'Start new sub-conversation',
  iconType: 'comment',
  run: jest.fn(),
};

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
  beforeEach(() => {
    jest.mocked(useSlashCommands).mockReturnValue([]);
  });

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

  describe('reporting content presence via onContentChange', () => {
    it('reports content when there are matching skills, for the current query', () => {
      const onContentChange = jest.fn();
      renderWithProvider(
        <Skills query="" onSelect={jest.fn()} onContentChange={onContentChange} />
      );

      expect(onContentChange).toHaveBeenCalledWith(true, '');
    });

    it('reports no content once the query matches nothing, for the current query', () => {
      const onContentChange = jest.fn();
      renderWithProvider(
        <Skills query="nosuchskill" onSelect={jest.fn()} onContentChange={onContentChange} />
      );

      expect(onContentChange).toHaveBeenCalledWith(false, 'nosuchskill');
    });

    it('keeps reporting content across every word of a multi-word skill name', () => {
      const useAgentSkillsMock = jest.requireMock(
        '../../../../../../../hooks/skills/use_agent_skills'
      ) as {
        useAgentSkills: () => unknown;
      };
      const originalImpl = useAgentSkillsMock.useAgentSkills;
      useAgentSkillsMock.useAgentSkills = () => ({
        skills: [...mockSkills, { id: 'skill-4', name: 'Skill With Spaces' }],
        isLoading: false,
        error: null,
        isError: false,
      });

      const onContentChange = jest.fn();
      const { rerender } = renderWithProvider(
        <Skills query="Skill" onSelect={jest.fn()} onContentChange={onContentChange} />
      );
      expect(onContentChange).toHaveBeenLastCalledWith(true, 'Skill');

      rerender(
        <EuiProvider>
          <Skills query="Skill With" onSelect={jest.fn()} onContentChange={onContentChange} />
        </EuiProvider>
      );
      expect(onContentChange).toHaveBeenLastCalledWith(true, 'Skill With');

      rerender(
        <EuiProvider>
          <Skills
            query="Skill With Spaces"
            onSelect={jest.fn()}
            onContentChange={onContentChange}
          />
        </EuiProvider>
      );
      expect(onContentChange).toHaveBeenLastCalledWith(true, 'Skill With Spaces');

      useAgentSkillsMock.useAgentSkills = originalImpl;
    });

    it('reports content while loading, even with zero skills so far', () => {
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

      const onContentChange = jest.fn();
      renderWithProvider(
        <Skills query="nosuchskill" onSelect={jest.fn()} onContentChange={onContentChange} />
      );

      expect(onContentChange).toHaveBeenCalledWith(true, 'nosuchskill');

      useAgentSkillsMock.useAgentSkills = originalImpl;
    });
  });

  describe('slash commands', () => {
    const getOptionLabels = () =>
      screen.getAllByRole('option').map((option) => option.textContent ?? '');

    beforeEach(() => {
      jest.mocked(useSlashCommands).mockReturnValue([threadCommand]);
    });

    it('lists commands before skills, with their description and icons', () => {
      const { container } = renderWithProvider(<Skills query="" onSelect={jest.fn()} />);

      const labels = getOptionLabels();
      expect(labels).toHaveLength(4);
      expect(labels[0]).toContain('thread');
      expect(labels[0]).toContain('Start new sub-conversation');
      expect(labels[1]).toContain('Summarize');
      expect(container.querySelector('[data-euiicon-type="comment"]')).toBeInTheDocument();
      expect(container.querySelectorAll('[data-euiicon-type="document"]')).toHaveLength(3);
    });

    it('filters commands by query', () => {
      renderWithProvider(<Skills query="thr" onSelect={jest.fn()} />);

      expect(getOptionLabels()).toEqual([expect.stringContaining('thread')]);
    });

    it('hides a command that is unavailable here', () => {
      jest
        .mocked(useSlashCommands)
        .mockReturnValue([{ ...threadCommand, unavailableReason: 'Not here.' }]);
      renderWithProvider(<Skills query="" onSelect={jest.fn()} />);

      expect(screen.queryByText('thread')).not.toBeInTheDocument();
      expect(getOptionLabels()).toHaveLength(3);
    });

    it('fills in the command name instead of inserting a badge when picked', () => {
      const onSelect = jest.fn();
      const onReplaceText = jest.fn();
      renderWithProvider(<Skills query="thr" onSelect={onSelect} onReplaceText={onReplaceText} />);

      fireEvent.click(screen.getByRole('option'));

      expect(onReplaceText).toHaveBeenCalledWith('thread ');
      expect(onSelect).not.toHaveBeenCalled();
    });

    it('still inserts a badge for a picked skill', () => {
      const onSelect = jest.fn();
      const onReplaceText = jest.fn();
      renderWithProvider(<Skills query="sum" onSelect={onSelect} onReplaceText={onReplaceText} />);

      fireEvent.click(screen.getByRole('option'));

      expect(onSelect).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'skill-1', label: 'Summarize' })
      );
      expect(onReplaceText).not.toHaveBeenCalled();
    });

    it('reports no content once the command arguments are being typed', () => {
      const useAgentSkillsMock = jest.requireMock(
        '../../../../../../../hooks/skills/use_agent_skills'
      ) as {
        useAgentSkills: () => unknown;
      };
      const originalImpl = useAgentSkillsMock.useAgentSkills;
      useAgentSkillsMock.useAgentSkills = () => ({
        skills: [{ id: 'skill-4', name: 'thread summary' }],
        isLoading: false,
        error: null,
        isError: false,
      });

      const onContentChange = jest.fn();
      renderWithProvider(
        <Skills query="thread sum" onSelect={jest.fn()} onContentChange={onContentChange} />
      );

      expect(onContentChange).toHaveBeenCalledWith(false, 'thread sum');

      useAgentSkillsMock.useAgentSkills = originalImpl;
    });
  });
});
