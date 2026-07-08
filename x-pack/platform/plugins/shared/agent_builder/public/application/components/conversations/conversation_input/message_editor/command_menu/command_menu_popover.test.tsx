/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { CommandMenuPopover } from './command_menu_popover';
import type { CommandMatchResult, CommandMenuHandle, CommandMenuComponentProps } from './types';
import { CommandId } from './types';

const MockMenuComponent = React.forwardRef<CommandMenuHandle, CommandMenuComponentProps>(
  ({ query, onSelect }, ref) => {
    return <div data-test-subj="mockMenu">Mock menu: {query}</div>;
  }
);

/** Reports content presence based on whether `query` is non-empty, like a real menu would report on results. */
const MockContentAwareMenuComponent = React.forwardRef<
  CommandMenuHandle,
  CommandMenuComponentProps
>(({ query, onContentChange }, ref) => {
  const hasContent = query.length > 0;
  useEffect(() => {
    onContentChange?.(hasContent);
  }, [hasContent, onContentChange]);
  return <div data-test-subj="mockMenu">Mock menu: {query}</div>;
});

const buildActiveMatch = (query: string, commandStartOffset = 0): CommandMatchResult => ({
  isActive: true,
  activeCommand: {
    command: {
      id: CommandId.Attachment,
      sequence: '@',
      name: 'Attachment',
      scheme: 'attachment',
      menuComponent: MockContentAwareMenuComponent,
    },
    commandStartOffset,
    query,
  },
});

const inactiveMatch: CommandMatchResult = {
  isActive: false,
  activeCommand: null,
};

const activeMatch: CommandMatchResult = {
  isActive: true,
  activeCommand: {
    command: {
      id: CommandId.Attachment,
      sequence: '@',
      name: 'Attachment',
      scheme: 'attachment',
      menuComponent: MockMenuComponent,
    },
    commandStartOffset: 0,
    query: 'joh',
  },
};

const defaultProps = {
  onSelect: jest.fn(),
  commandMenuRef: { current: null } as React.RefObject<CommandMenuHandle>,
};

describe('CommandMenuPopover', () => {
  it('renders closed when command is inactive', () => {
    render(
      <CommandMenuPopover
        commandMatch={inactiveMatch}
        anchorPosition={{ left: 10, top: 20 }}
        data-test-subj="testPopover"
        {...defaultProps}
      />
    );

    expect(screen.queryByTestId('testPopover-content')).not.toBeInTheDocument();
  });

  it('renders closed when anchorPosition is null', () => {
    render(
      <CommandMenuPopover
        commandMatch={activeMatch}
        anchorPosition={null}
        data-test-subj="testPopover"
        {...defaultProps}
      />
    );

    expect(screen.queryByTestId('testPopover-content')).not.toBeInTheDocument();
  });

  it('renders open when command is active and anchorPosition is provided', () => {
    render(
      <CommandMenuPopover
        commandMatch={activeMatch}
        anchorPosition={{ left: 10, top: 20 }}
        data-test-subj="testPopover"
        {...defaultProps}
      />
    );

    expect(screen.getByTestId('testPopover-content')).toBeInTheDocument();
  });

  it('renders screen reader announcement when command is active', () => {
    render(
      <CommandMenuPopover
        commandMatch={activeMatch}
        anchorPosition={{ left: 10, top: 20 }}
        data-test-subj="testPopover"
        {...defaultProps}
      />
    );

    expect(screen.getByText(/attachment suggestions opened/i)).toBeInTheDocument();
  });

  it('does not render screen reader announcement when command is inactive', () => {
    render(
      <CommandMenuPopover
        commandMatch={inactiveMatch}
        anchorPosition={{ left: 10, top: 20 }}
        data-test-subj="testPopover"
        {...defaultProps}
      />
    );

    expect(screen.queryByText(/suggestions opened/i)).not.toBeInTheDocument();
  });

  it('renders the menu component with query', () => {
    render(
      <CommandMenuPopover
        commandMatch={activeMatch}
        anchorPosition={{ left: 10, top: 20 }}
        data-test-subj="testPopover"
        {...defaultProps}
      />
    );

    expect(screen.getByTestId('mockMenu')).toHaveTextContent('Mock menu: joh');
  });

  describe('content-driven visibility', () => {
    it('stays closed once the menu reports it has nothing to show', async () => {
      // The popover assumes content on first mount (so a new mention isn't
      // hidden before its data arrives); it only closes once the mounted
      // menu's effect reports otherwise, so this settles asynchronously.
      render(
        <CommandMenuPopover
          commandMatch={buildActiveMatch('')}
          anchorPosition={{ left: 10, top: 20 }}
          data-test-subj="testPopover"
          {...defaultProps}
        />
      );

      await waitFor(() =>
        expect(screen.queryByTestId('testPopover-content')).not.toBeInTheDocument()
      );
    });

    it('opens once the menu reports it has content', async () => {
      render(
        <CommandMenuPopover
          commandMatch={buildActiveMatch('joh')}
          anchorPosition={{ left: 10, top: 20 }}
          data-test-subj="testPopover"
          {...defaultProps}
        />
      );

      await waitFor(() => expect(screen.getByTestId('testPopover-content')).toBeInTheDocument());
    });

    it('re-opens for a distinct new mention even if the previous one had no content', async () => {
      const { rerender } = render(
        <CommandMenuPopover
          commandMatch={buildActiveMatch('', 0)}
          anchorPosition={{ left: 10, top: 20 }}
          data-test-subj="testPopover"
          {...defaultProps}
        />
      );
      await waitFor(() =>
        expect(screen.queryByTestId('testPopover-content')).not.toBeInTheDocument()
      );

      // A new mention starting at a different offset resets the assumption
      // to "has content" until the freshly-mounted menu reports otherwise.
      rerender(
        <CommandMenuPopover
          commandMatch={buildActiveMatch('', 10)}
          anchorPosition={{ left: 10, top: 20 }}
          data-test-subj="testPopover"
          {...defaultProps}
        />
      );
      await waitFor(() => expect(screen.getByTestId('testPopover-content')).toBeInTheDocument());
    });
  });
});
