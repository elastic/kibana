/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { CommandMenuPopover } from './command_menu_popover';
import type { CommandMatchResult, CommandMenuHandle, CommandMenuComponentProps } from './types';
import { CommandId } from './types';

const MockMenuComponent = React.forwardRef<CommandMenuHandle, CommandMenuComponentProps>(
  ({ query, onSelect }, ref) => {
    return <div data-test-subj="mockMenu">Mock menu: {query}</div>;
  }
);

/** Immediately reports `onContentChange` with whatever query it was given — lets a test drive it deterministically. */
const MockReportingMenuComponent = React.forwardRef<CommandMenuHandle, CommandMenuComponentProps>(
  ({ query, onContentChange }, ref) => {
    onContentChange?.(true, query);
    return <div data-test-subj="mockMenu">reporting menu</div>;
  }
);

const buildMatch = (overrides: Partial<CommandMatchResult> = {}): CommandMatchResult => ({
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
  hasVisibleContent: true,
  ...overrides,
});

const inactiveMatch: CommandMatchResult = {
  isActive: false,
  activeCommand: null,
  hasVisibleContent: true,
};

const activeMatch = buildMatch();

const defaultProps = {
  onSelect: jest.fn(),
  onContentChange: jest.fn(),
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
    it('hides the panel (via CSS) when the match reports no visible content', () => {
      render(
        <CommandMenuPopover
          commandMatch={buildMatch({ hasVisibleContent: false })}
          anchorPosition={{ left: 10, top: 20 }}
          data-test-subj="testPopover"
          {...defaultProps}
        />
      );

      expect(screen.getByTestId('testPopover-content')).not.toBeVisible();
    });

    it('shows the panel once the match reports visible content', () => {
      render(
        <CommandMenuPopover
          commandMatch={buildMatch({ hasVisibleContent: true })}
          anchorPosition={{ left: 10, top: 20 }}
          data-test-subj="testPopover"
          {...defaultProps}
        />
      );

      expect(screen.getByTestId('testPopover-content')).toBeVisible();
    });

    it('keeps the menu component mounted while hidden, so it can keep re-evaluating and recover on its own', () => {
      const mountSpy = jest.fn();
      const MockMountTrackingMenuComponent = React.forwardRef<
        CommandMenuHandle,
        CommandMenuComponentProps
      >((_props, ref) => {
        React.useEffect(() => {
          mountSpy();
        }, []);
        return <div data-test-subj="mockMenu">tracked menu</div>;
      });

      const { rerender } = render(
        <CommandMenuPopover
          commandMatch={buildMatch({
            hasVisibleContent: true,
            activeCommand: {
              ...activeMatch.activeCommand!,
              command: {
                ...activeMatch.activeCommand!.command,
                menuComponent: MockMountTrackingMenuComponent,
              },
            },
          })}
          anchorPosition={{ left: 10, top: 20 }}
          data-test-subj="testPopover"
          {...defaultProps}
        />
      );
      expect(mountSpy).toHaveBeenCalledTimes(1);

      rerender(
        <CommandMenuPopover
          commandMatch={buildMatch({
            hasVisibleContent: false,
            activeCommand: {
              ...activeMatch.activeCommand!,
              query: 'joh2',
              command: {
                ...activeMatch.activeCommand!.command,
                menuComponent: MockMountTrackingMenuComponent,
              },
            },
          })}
          anchorPosition={{ left: 10, top: 20 }}
          data-test-subj="testPopover"
          {...defaultProps}
        />
      );

      expect(mountSpy).toHaveBeenCalledTimes(1);
      expect(screen.getByTestId('mockMenu')).not.toBeVisible();
    });

    it('forwards onContentChange, including the current query, to the mounted menu component', () => {
      const onContentChange = jest.fn();
      render(
        <CommandMenuPopover
          commandMatch={buildMatch({
            activeCommand: {
              ...activeMatch.activeCommand!,
              command: {
                ...activeMatch.activeCommand!.command,
                menuComponent: MockReportingMenuComponent,
              },
            },
          })}
          anchorPosition={{ left: 10, top: 20 }}
          data-test-subj="testPopover"
          {...defaultProps}
          onContentChange={onContentChange}
        />
      );

      expect(onContentChange).toHaveBeenCalledWith(true, 'joh');
    });
  });
});
