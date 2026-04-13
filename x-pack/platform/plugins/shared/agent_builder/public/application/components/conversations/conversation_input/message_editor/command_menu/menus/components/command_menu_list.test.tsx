/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createRef } from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { EuiProvider } from '@elastic/eui';
import { CommandMenuList } from './command_menu_list';
import type { CommandMenuHandle } from '../../types';

const mockOptions = [
  { key: '1', label: 'Alpha' },
  { key: '2', label: 'Beta' },
  { key: '3', label: 'Gamma' },
];

const renderWithProvider = (ui: React.ReactElement) => {
  return render(<EuiProvider>{ui}</EuiProvider>);
};

describe('CommandMenuList', () => {
  it('renders all options', () => {
    renderWithProvider(
      <CommandMenuList options={mockOptions} isLoading={false} onSelect={jest.fn()} />
    );

    expect(screen.getByText('Alpha')).toBeInTheDocument();
    expect(screen.getByText('Beta')).toBeInTheDocument();
    expect(screen.getByText('Gamma')).toBeInTheDocument();
  });

  it('shows empty message when no options', () => {
    renderWithProvider(<CommandMenuList options={[]} isLoading={false} onSelect={jest.fn()} />);

    expect(screen.getByText('No matching results')).toBeInTheDocument();
  });

  it('shows loading spinner when loading', () => {
    renderWithProvider(<CommandMenuList options={[]} isLoading={true} onSelect={jest.fn()} />);

    expect(screen.getByTestId('commandMenuList-loading')).toBeInTheDocument();
  });

  it('renders renderLabel content (EuiSelectable merges option.data onto the renderOption argument)', () => {
    renderWithProvider(
      <CommandMenuList
        options={[
          {
            key: '1',
            label: 'plain accessibility label',
            renderLabel: <span data-test-subj="richLabel">Rich label with highlight</span>,
          },
        ]}
        isLoading={false}
        onSelect={jest.fn()}
      />
    );

    expect(screen.getByTestId('richLabel')).toHaveTextContent('Rich label with highlight');
  });

  it('renders a composite renderLabel (e.g. primary text plus trailing description)', () => {
    renderWithProvider(
      <CommandMenuList
        options={[
          {
            key: '1',
            label: 'Skill name',
            renderLabel: (
              <span data-test-subj="skillRow">
                <span>Skill name</span>
                <span data-test-subj="extraBit">Extra description</span>
              </span>
            ),
          },
        ]}
        isLoading={false}
        onSelect={jest.fn()}
      />
    );

    expect(screen.getByTestId('skillRow')).toBeInTheDocument();
    expect(screen.getByText('Skill name')).toBeInTheDocument();
    expect(screen.getByTestId('extraBit')).toHaveTextContent('Extra description');
  });

  it('calls onSelect when the first option is clicked', () => {
    const onSelect = jest.fn();
    renderWithProvider(
      <CommandMenuList options={mockOptions} isLoading={false} onSelect={onSelect} />
    );

    fireEvent.click(screen.getByText('Alpha'));

    expect(onSelect).toHaveBeenCalledWith({ key: '1', label: 'Alpha' });
  });

  it('calls onSelect when a non-first option is clicked', () => {
    const onSelect = jest.fn();
    renderWithProvider(
      <CommandMenuList options={mockOptions} isLoading={false} onSelect={onSelect} />
    );

    fireEvent.click(screen.getByText('Beta'));

    expect(onSelect).toHaveBeenCalledWith({ key: '2', label: 'Beta' });
  });

  describe('keyboard navigation', () => {
    it('selects first item with Enter', () => {
      const ref = createRef<CommandMenuHandle>();
      const onSelect = jest.fn();
      renderWithProvider(
        <CommandMenuList ref={ref} options={mockOptions} isLoading={false} onSelect={onSelect} />
      );

      act(() => {
        ref.current!.handleKeyDown({ key: 'Enter' } as React.KeyboardEvent);
      });

      expect(onSelect).toHaveBeenCalledWith({ key: '1', label: 'Alpha' });
    });

    it('navigates down and selects with Enter', () => {
      const ref = createRef<CommandMenuHandle>();
      const onSelect = jest.fn();
      renderWithProvider(
        <CommandMenuList ref={ref} options={mockOptions} isLoading={false} onSelect={onSelect} />
      );

      act(() => {
        ref.current!.handleKeyDown({ key: 'ArrowDown' } as React.KeyboardEvent);
      });
      act(() => {
        ref.current!.handleKeyDown({ key: 'Enter' } as React.KeyboardEvent);
      });

      expect(onSelect).toHaveBeenCalledWith({ key: '2', label: 'Beta' });
    });

    it('navigates up from second item', () => {
      const ref = createRef<CommandMenuHandle>();
      const onSelect = jest.fn();
      renderWithProvider(
        <CommandMenuList ref={ref} options={mockOptions} isLoading={false} onSelect={onSelect} />
      );

      act(() => {
        ref.current!.handleKeyDown({ key: 'ArrowDown' } as React.KeyboardEvent);
      });
      act(() => {
        ref.current!.handleKeyDown({ key: 'ArrowUp' } as React.KeyboardEvent);
      });
      act(() => {
        ref.current!.handleKeyDown({ key: 'Enter' } as React.KeyboardEvent);
      });

      expect(onSelect).toHaveBeenCalledWith({ key: '1', label: 'Alpha' });
    });

    it('clamps at end of list', () => {
      const ref = createRef<CommandMenuHandle>();
      const onSelect = jest.fn();
      renderWithProvider(
        <CommandMenuList ref={ref} options={mockOptions} isLoading={false} onSelect={onSelect} />
      );

      act(() => {
        ref.current!.handleKeyDown({ key: 'ArrowDown' } as React.KeyboardEvent);
        ref.current!.handleKeyDown({ key: 'ArrowDown' } as React.KeyboardEvent);
        ref.current!.handleKeyDown({ key: 'ArrowDown' } as React.KeyboardEvent);
        ref.current!.handleKeyDown({ key: 'ArrowDown' } as React.KeyboardEvent);
      });
      act(() => {
        ref.current!.handleKeyDown({ key: 'Enter' } as React.KeyboardEvent);
      });

      expect(onSelect).toHaveBeenCalledWith({ key: '3', label: 'Gamma' });
    });

    it('clamps at start of list', () => {
      const ref = createRef<CommandMenuHandle>();
      const onSelect = jest.fn();
      renderWithProvider(
        <CommandMenuList ref={ref} options={mockOptions} isLoading={false} onSelect={onSelect} />
      );

      act(() => {
        ref.current!.handleKeyDown({ key: 'ArrowUp' } as React.KeyboardEvent);
      });
      act(() => {
        ref.current!.handleKeyDown({ key: 'Enter' } as React.KeyboardEvent);
      });

      expect(onSelect).toHaveBeenCalledWith({ key: '1', label: 'Alpha' });
    });

    it('selects with Tab', () => {
      const ref = createRef<CommandMenuHandle>();
      const onSelect = jest.fn();
      renderWithProvider(
        <CommandMenuList ref={ref} options={mockOptions} isLoading={false} onSelect={onSelect} />
      );

      act(() => {
        ref.current!.handleKeyDown({ key: 'Tab' } as React.KeyboardEvent);
      });

      expect(onSelect).toHaveBeenCalledWith({ key: '1', label: 'Alpha' });
    });

    it('reports handled keys via isKeyDownEventHandled', () => {
      const ref = createRef<CommandMenuHandle>();
      renderWithProvider(
        <CommandMenuList ref={ref} options={mockOptions} isLoading={false} onSelect={jest.fn()} />
      );

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
      renderWithProvider(
        <CommandMenuList ref={ref} options={mockOptions} isLoading={false} onSelect={jest.fn()} />
      );

      expect(ref.current!.isKeyDownEventHandled({ key: 'a' } as React.KeyboardEvent)).toBe(false);
    });
  });
});
