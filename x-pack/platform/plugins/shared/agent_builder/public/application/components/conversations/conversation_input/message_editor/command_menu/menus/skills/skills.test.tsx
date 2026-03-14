/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createRef } from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { EuiProvider } from '@elastic/eui';
import { Skills } from './skills';
import type { CommandMenuHandle } from '../../types';

const mockSkills = [
  { id: 'skill-1', name: 'Summarize', description: 'Summarize text' },
  { id: 'skill-2', name: 'Translate', description: 'Translate text' },
  { id: 'skill-3', name: 'Search', description: 'Search documents' },
];

jest.mock('./use_skills', () => ({
  useSkills: () => ({
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

  it('shows no matches message when nothing matches', () => {
    renderWithProvider(<Skills query="zzzzz" onSelect={jest.fn()} />);

    expect(screen.getByText('No matching skills')).toBeInTheDocument();
  });

  it('calls onSelect when an option is clicked', () => {
    const onSelect = jest.fn();
    renderWithProvider(<Skills query="" onSelect={onSelect} />);

    fireEvent.click(screen.getByText('Translate'));

    expect(onSelect).toHaveBeenCalledWith('Translate');
  });

  describe('keyboard navigation via imperative handle', () => {
    it('selects first item with Enter', () => {
      const ref = createRef<CommandMenuHandle>();
      const onSelect = jest.fn();
      renderWithProvider(<Skills ref={ref} query="" onSelect={onSelect} />);

      act(() => {
        ref.current!.handleKeyDown({ key: 'Enter' } as React.KeyboardEvent);
      });

      expect(onSelect).toHaveBeenCalledWith('Summarize');
    });

    it('navigates down and selects with Enter', () => {
      const ref = createRef<CommandMenuHandle>();
      const onSelect = jest.fn();
      renderWithProvider(<Skills ref={ref} query="" onSelect={onSelect} />);

      act(() => {
        ref.current!.handleKeyDown({ key: 'ArrowDown' } as React.KeyboardEvent);
      });
      act(() => {
        ref.current!.handleKeyDown({ key: 'Enter' } as React.KeyboardEvent);
      });

      expect(onSelect).toHaveBeenCalledWith('Translate');
    });

    it('navigates up from second item', () => {
      const ref = createRef<CommandMenuHandle>();
      const onSelect = jest.fn();
      renderWithProvider(<Skills ref={ref} query="" onSelect={onSelect} />);

      act(() => {
        ref.current!.handleKeyDown({ key: 'ArrowDown' } as React.KeyboardEvent);
      });
      act(() => {
        ref.current!.handleKeyDown({ key: 'ArrowUp' } as React.KeyboardEvent);
      });
      act(() => {
        ref.current!.handleKeyDown({ key: 'Enter' } as React.KeyboardEvent);
      });

      expect(onSelect).toHaveBeenCalledWith('Summarize');
    });

    it('clamps at end of list', () => {
      const ref = createRef<CommandMenuHandle>();
      const onSelect = jest.fn();
      renderWithProvider(<Skills ref={ref} query="" onSelect={onSelect} />);

      act(() => {
        ref.current!.handleKeyDown({ key: 'ArrowDown' } as React.KeyboardEvent);
        ref.current!.handleKeyDown({ key: 'ArrowDown' } as React.KeyboardEvent);
        ref.current!.handleKeyDown({ key: 'ArrowDown' } as React.KeyboardEvent);
        ref.current!.handleKeyDown({ key: 'ArrowDown' } as React.KeyboardEvent);
      });
      act(() => {
        ref.current!.handleKeyDown({ key: 'Enter' } as React.KeyboardEvent);
      });

      expect(onSelect).toHaveBeenCalledWith('Search');
    });

    it('clamps at start of list', () => {
      const ref = createRef<CommandMenuHandle>();
      const onSelect = jest.fn();
      renderWithProvider(<Skills ref={ref} query="" onSelect={onSelect} />);

      act(() => {
        ref.current!.handleKeyDown({ key: 'ArrowUp' } as React.KeyboardEvent);
      });
      act(() => {
        ref.current!.handleKeyDown({ key: 'Enter' } as React.KeyboardEvent);
      });

      expect(onSelect).toHaveBeenCalledWith('Summarize');
    });

    it('selects with Tab', () => {
      const ref = createRef<CommandMenuHandle>();
      const onSelect = jest.fn();
      renderWithProvider(<Skills ref={ref} query="" onSelect={onSelect} />);

      act(() => {
        ref.current!.handleKeyDown({ key: 'Tab' } as React.KeyboardEvent);
      });

      expect(onSelect).toHaveBeenCalledWith('Summarize');
    });

    it('reports handled keys via isKeyDownEventHandled', () => {
      const ref = createRef<CommandMenuHandle>();
      renderWithProvider(<Skills ref={ref} query="" onSelect={jest.fn()} />);

      expect(ref.current!.isKeyDownEventHandled({ key: 'ArrowDown' } as React.KeyboardEvent)).toBe(
        true
      );
      expect(ref.current!.isKeyDownEventHandled({ key: 'ArrowUp' } as React.KeyboardEvent)).toBe(
        true
      );
      expect(ref.current!.isKeyDownEventHandled({ key: 'Enter' } as React.KeyboardEvent)).toBe(
        true
      );
      expect(ref.current!.isKeyDownEventHandled({ key: 'Tab' } as React.KeyboardEvent)).toBe(true);
    });

    it('returns false for unhandled keys', () => {
      const ref = createRef<CommandMenuHandle>();
      renderWithProvider(<Skills ref={ref} query="" onSelect={jest.fn()} />);

      expect(ref.current!.isKeyDownEventHandled({ key: 'a' } as React.KeyboardEvent)).toBe(false);
    });
  });
});

describe('Skills loading state', () => {
  it('shows loading spinner when loading', () => {
    // Override the mock for this test
    const useSkillsMock = jest.requireMock('./use_skills') as { useSkills: () => unknown };
    const originalImpl = useSkillsMock.useSkills;
    useSkillsMock.useSkills = () => ({
      skills: [],
      isLoading: true,
      error: null,
      isError: false,
    });

    renderWithProvider(<Skills query="" onSelect={jest.fn()} />);

    expect(screen.getByTestId('skillsMenuLoading')).toBeInTheDocument();

    // Restore
    useSkillsMock.useSkills = originalImpl;
  });
});
