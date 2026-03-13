/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { CommandMenuPopover } from './command_menu_popover';
import type { TriggerMatchResult } from './types';
import { TriggerId } from './types';

const inactiveMatch: TriggerMatchResult = {
  isActive: false,
  activeTrigger: null,
};

const activeMatch: TriggerMatchResult = {
  isActive: true,
  activeTrigger: {
    trigger: { id: TriggerId.Attachment, sequence: '@', name: 'Attachment' },
    triggerStartOffset: 0,
    query: 'joh',
  },
};

describe('CommandMenuPopover', () => {
  it('renders closed when trigger is inactive', () => {
    render(
      <CommandMenuPopover
        triggerMatch={inactiveMatch}
        anchorPosition={{ left: 10, top: 20 }}
        data-test-subj="testPopover"
      />
    );

    expect(screen.queryByTestId('testPopover-content')).not.toBeInTheDocument();
  });

  it('renders closed when anchorPosition is null', () => {
    render(
      <CommandMenuPopover
        triggerMatch={activeMatch}
        anchorPosition={null}
        data-test-subj="testPopover"
      />
    );

    expect(screen.queryByTestId('testPopover-content')).not.toBeInTheDocument();
  });

  it('renders open when trigger is active and anchorPosition is provided', () => {
    render(
      <CommandMenuPopover
        triggerMatch={activeMatch}
        anchorPosition={{ left: 10, top: 20 }}
        data-test-subj="testPopover"
      />
    );

    expect(screen.getByTestId('testPopover-content')).toBeInTheDocument();
  });

  it('renders screen reader announcement when trigger is active', () => {
    render(
      <CommandMenuPopover
        triggerMatch={activeMatch}
        anchorPosition={{ left: 10, top: 20 }}
        data-test-subj="testPopover"
      />
    );

    expect(screen.getByText(/attachment suggestions opened/i)).toBeInTheDocument();
  });

  it('does not render screen reader announcement when trigger is inactive', () => {
    render(
      <CommandMenuPopover
        triggerMatch={inactiveMatch}
        anchorPosition={{ left: 10, top: 20 }}
        data-test-subj="testPopover"
      />
    );

    expect(screen.queryByText(/suggestions opened/i)).not.toBeInTheDocument();
  });

  it('displays trigger id and query', () => {
    render(
      <CommandMenuPopover
        triggerMatch={activeMatch}
        anchorPosition={{ left: 10, top: 20 }}
        data-test-subj="testPopover"
      />
    );

    const content = screen.getByTestId('testPopover-content');
    expect(content).toHaveTextContent('attachment');
    expect(content).toHaveTextContent('joh');
  });
});
