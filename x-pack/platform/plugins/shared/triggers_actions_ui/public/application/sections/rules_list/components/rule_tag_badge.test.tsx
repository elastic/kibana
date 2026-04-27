/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RuleTagBadge } from './rule_tag_badge';

const onClickMock = jest.fn();
const onCloseMock = jest.fn();

const tags = ['a', 'b', 'c'];

describe('RuleTagBadge', () => {
  beforeEach(() => {
    onClickMock.mockReset();
    onCloseMock.mockReset();
  });

  it('renders the initial badge count correctly', () => {
    render(<RuleTagBadge isOpen={false} tags={tags} onClick={onClickMock} onClose={onCloseMock} />);

    expect(screen.getByTestId('ruleTagBadge')).toBeInTheDocument();
    expect(screen.getByTestId('ruleTagBadge')).toHaveTextContent(`${tags.length}`);
  });

  it('can open and close the popover', async () => {
    const { rerender } = render(
      <RuleTagBadge isOpen={false} tags={tags} onClick={onClickMock} onClose={onCloseMock} />
    );

    expect(screen.queryByTestId('ruleTagBadgeItem-a')).not.toBeInTheDocument();
    expect(screen.queryByTestId('ruleTagBadgeItem-b')).not.toBeInTheDocument();
    expect(screen.queryByTestId('ruleTagBadgeItem-c')).not.toBeInTheDocument();

    await userEvent.click(screen.getByTestId('ruleTagBadge'));
    expect(onClickMock).toHaveBeenCalledTimes(1);

    rerender(
      <RuleTagBadge isOpen={true} tags={tags} onClick={onClickMock} onClose={onCloseMock} />
    );

    expect(screen.getByTestId('ruleTagBadgeItem-a')).toBeInTheDocument();
    expect(screen.getByTestId('ruleTagBadgeItem-b')).toBeInTheDocument();
    expect(screen.getByTestId('ruleTagBadgeItem-c')).toBeInTheDocument();

    await userEvent.click(screen.getByTestId('ruleTagBadge'));
    expect(onClickMock).toHaveBeenCalledTimes(2);
  });

  it('shows all the tags without clicking when passing "spread" props with "true"', () => {
    render(<RuleTagBadge tags={tags} tagsOutPopover={true} />);
    expect(screen.getByTestId('tagsOutPopover')).toBeInTheDocument();
    expect(screen.getByTestId('ruleTagBadgeItem-a')).toBeInTheDocument();
    expect(screen.getByTestId('ruleTagBadgeItem-b')).toBeInTheDocument();
    expect(screen.getByTestId('ruleTagBadgeItem-c')).toBeInTheDocument();
  });
});
