/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { CommandMenuPopover } from './command_menu_popover';
import type { CommandMatchResult } from './types';
import { CommandId } from './types';

const inactiveMatch: CommandMatchResult = {
  isActive: false,
  activeCommand: null,
};

const activeMatch: CommandMatchResult = {
  isActive: true,
  activeCommand: {
    command: { id: CommandId.Attachment, sequence: '@', name: 'Attachment' },
    commandStartOffset: 0,
    query: 'joh',
  },
};

describe('CommandMenuPopover', () => {
  it('renders closed when command is inactive', () => {
    render(
      <CommandMenuPopover
        commandMatch={inactiveMatch}
        anchorPosition={{ left: 10, top: 20 }}
        data-test-subj="testPopover"
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
      />
    );

    expect(screen.queryByText(/suggestions opened/i)).not.toBeInTheDocument();
  });

  it('displays command id and query', () => {
    render(
      <CommandMenuPopover
        commandMatch={activeMatch}
        anchorPosition={{ left: 10, top: 20 }}
        data-test-subj="testPopover"
      />
    );

    const content = screen.getByTestId('testPopover-content');
    expect(content).toHaveTextContent('attachment');
    expect(content).toHaveTextContent('joh');
  });
});
