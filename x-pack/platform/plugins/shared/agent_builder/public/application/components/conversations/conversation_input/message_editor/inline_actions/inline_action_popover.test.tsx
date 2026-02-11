/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { InlineActionPopover } from './inline_action_popover';
import type { TriggerMatchResult } from './types';

const inactiveMatch: TriggerMatchResult = {
  isActive: false,
  activeTrigger: null,
};

const activeMatch: TriggerMatchResult = {
  isActive: true,
  activeTrigger: {
    trigger: { id: 'mention', kind: 'mention', sequence: '@' },
    triggerStartOffset: 0,
    query: 'joh',
  },
};

const onClose = jest.fn();

describe('InlineActionPopover', () => {
  it('renders closed when trigger is inactive', () => {
    render(
      <InlineActionPopover
        triggerMatch={inactiveMatch}
        onClose={onClose}
        anchorPosition={{ left: 10, top: 20 }}
        data-test-subj="testPopover"
      />
    );

    expect(screen.queryByTestId('testPopover-content')).not.toBeInTheDocument();
  });

  it('renders closed when anchorPosition is null', () => {
    render(
      <InlineActionPopover
        triggerMatch={activeMatch}
        onClose={onClose}
        anchorPosition={null}
        data-test-subj="testPopover"
      />
    );

    expect(screen.queryByTestId('testPopover-content')).not.toBeInTheDocument();
  });

  it('renders open when trigger is active and anchorPosition is provided', () => {
    render(
      <InlineActionPopover
        triggerMatch={activeMatch}
        onClose={onClose}
        anchorPosition={{ left: 10, top: 20 }}
        data-test-subj="testPopover"
      />
    );

    expect(screen.getByTestId('testPopover-content')).toBeInTheDocument();
  });

  it('displays trigger kind and query', () => {
    render(
      <InlineActionPopover
        triggerMatch={activeMatch}
        onClose={onClose}
        anchorPosition={{ left: 10, top: 20 }}
        data-test-subj="testPopover"
      />
    );

    const content = screen.getByTestId('testPopover-content');
    expect(content).toHaveTextContent('mention');
    expect(content).toHaveTextContent('joh');
  });
});
