/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RulesCell } from './rules_cell';

describe('RulesCell', () => {
  const props = {
    activeRuleId: null,
    onRuleClick: jest.fn(),
    maxVisibleRules: 3,
    canReadRules: true,
  };

  const rule = (id: string, name = `${id}-name`) => ({ id, name });

  beforeEach(() => jest.clearAllMocks());

  it('renders nothing when totalRuleCount === 0', () => {
    const { container } = render(<RulesCell {...props} rules={[]} totalRuleCount={0} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders all rules as badges when count ≤ maxVisibleRules', () => {
    render(<RulesCell {...props} rules={[rule('r-1'), rule('r-2')]} totalRuleCount={2} />);
    expect(screen.getByText('r-1-name')).toBeInTheDocument();
    expect(screen.getByText('r-2-name')).toBeInTheDocument();
    expect(screen.queryByText(/^\+/)).not.toBeInTheDocument();
  });

  it('renders +N overflow badge when rules exceed maxVisibleRules', () => {
    render(
      <RulesCell
        {...props}
        rules={[rule('a'), rule('b'), rule('c'), rule('d'), rule('e')]}
        totalRuleCount={5}
      />
    );
    // 3 visible + "+2" overflow
    expect(screen.getByText('+2')).toBeInTheDocument();
    expect(screen.queryByText('d-name')).not.toBeInTheDocument();
  });

  it('overflow badge count includes server-truncated rules (notShownCount)', () => {
    render(
      <RulesCell
        {...props}
        rules={[rule('a'), rule('b'), rule('c'), rule('d')]}
        totalRuleCount={50} // server has 50, only 4 embedded
      />
    );
    // hidden = 1 (rule d), notShown = 46, total overflow = 47
    expect(screen.getByText('+47')).toBeInTheDocument();
  });

  it('calls onRuleClick with the rule id when a visible badge is clicked', async () => {
    const onRuleClick = jest.fn();
    render(
      <RulesCell {...props} onRuleClick={onRuleClick} rules={[rule('r-1')]} totalRuleCount={1} />
    );
    await userEvent.click(screen.getByRole('button', { name: 'r-1-name' }));
    expect(onRuleClick).toHaveBeenCalledWith('r-1');
  });

  it('opens a popover with hidden rules when the +N badge is clicked', async () => {
    render(
      <RulesCell
        {...props}
        rules={[rule('a'), rule('b'), rule('c'), rule('d'), rule('e')]}
        totalRuleCount={5}
      />
    );
    await userEvent.click(screen.getByRole('button', { name: /2 more/i }));
    // hidden rules d, e appear in the popover
    expect(await screen.findByText('d-name')).toBeInTheDocument();
    expect(screen.getByText('e-name')).toBeInTheDocument();
  });

  it('shows a "N more not shown" callout when server-truncated', async () => {
    render(
      <RulesCell
        {...props}
        rules={[rule('a'), rule('b'), rule('c'), rule('d')]}
        totalRuleCount={50}
      />
    );
    await userEvent.click(screen.getByRole('button', { name: /47 more/i }));
    expect(await screen.findByText(/46 more rules not shown/i)).toBeInTheDocument();
  });

  describe('when the user cannot read rules (canReadRules=false)', () => {
    it('renders the rule names as non-clickable badges', () => {
      render(
        <RulesCell
          {...props}
          canReadRules={false}
          rules={[rule('r-1'), rule('r-2')]}
          totalRuleCount={2}
        />
      );
      expect(screen.getByText('r-1-name')).toBeInTheDocument();
      expect(screen.getByText('r-2-name')).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'r-1-name' })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'r-2-name' })).not.toBeInTheDocument();
    });

    it('does not call onRuleClick when a badge is clicked', async () => {
      const onRuleClick = jest.fn();
      render(
        <RulesCell
          {...props}
          canReadRules={false}
          onRuleClick={onRuleClick}
          rules={[rule('r-1')]}
          totalRuleCount={1}
        />
      );
      await userEvent.click(screen.getByText('r-1-name'));
      expect(onRuleClick).not.toHaveBeenCalled();
    });
  });
});
