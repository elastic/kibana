/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { EuiProvider } from '@elastic/eui';
import { I18nProvider } from '@kbn/i18n-react';
import { ReactFlowProvider, type NodeProps } from '@xyflow/react';
import type { InvestigationProposalSummary } from '../../../common/investigations/investigation';
import {
  HypothesisTreeActionsContext,
  HypothesisTreeNode,
  type HypothesisTreeFlowNode,
} from './hypothesis_tree_nodes';

const flags = { isSelected: false, isDimmed: false, selectedActionIndex: null };

const renderNode = (
  data: HypothesisTreeFlowNode['data'],
  actions = { onSelectAction: jest.fn(), onToggleActionsExpanded: jest.fn() }
) => {
  render(
    <EuiProvider>
      <I18nProvider>
        <ReactFlowProvider>
          <HypothesisTreeActionsContext.Provider value={actions}>
            <HypothesisTreeNode {...({ id: 'node', data } as NodeProps<HypothesisTreeFlowNode>)} />
          </HypothesisTreeActionsContext.Provider>
        </ReactFlowProvider>
      </I18nProvider>
    </EuiProvider>
  );
  return actions;
};

const proposal = (id: string, title: string): InvestigationProposalSummary => ({
  id,
  title,
  comment: '',
  status: 'pending',
  impact: 'low',
  confidence: 'high',
  created_at: '2026-07-28T14:00:00.000Z',
});

describe('HypothesisTreeNode', () => {
  it('names the trigger after its first subject and counts the others', () => {
    renderNode({
      kind: 'trigger',
      title: 'Checkout latency spike',
      subjects: [
        {
          type: 'alert',
          id: 'a-1',
          snapshot: { rule_name: 'Checkout p99 > 2s' },
          created_at: 'x',
        },
        { type: 'alert', id: 'a-2', created_at: 'x' },
      ],
      ...flags,
    });

    const node = screen.getByTestId('investigationHypothesisTreeNode-trigger');
    expect(node).toHaveTextContent('Checkout p99 > 2s');
    expect(node).toHaveTextContent('Alert · +1 more');
  });

  it('falls back to the title for a trigger without subjects', () => {
    renderNode({ kind: 'trigger', title: 'Checkout latency spike', subjects: [], ...flags });

    expect(screen.getByTestId('investigationHypothesisTreeNode-trigger')).toHaveTextContent(
      'Checkout latency spike'
    );
  });

  it('shows a hypothesis status, confidence, and its reason as markdown', () => {
    renderNode({
      kind: 'hypothesis',
      index: 0,
      isWinner: true,
      hypothesis: {
        candidate: 'Mapping gap',
        confidence: 0.9,
        status: 'confirmed',
        reason: 'Filters on `user_id` returned nothing.',
      },
      ...flags,
    });

    const node = screen.getByTestId('investigationHypothesisTreeNode-hypothesis');
    expect(node).toHaveTextContent('Confirmed');
    expect(node).toHaveTextContent('Confidence 90%');
    expect(node.querySelector('code')).toHaveTextContent('user_id');
  });

  it('counts the hypotheses by status', () => {
    renderNode({
      kind: 'hypotheses',
      total: 3,
      counts: { confirmed: 1, dismissed: 2, investigating: 0 },
      isExpanded: true,
      ...flags,
    });

    const node = screen.getByTestId('investigationHypothesisTreeNode-hypotheses');
    expect(node).toHaveTextContent('3 hypotheses');
    expect(node).toHaveTextContent('1 Confirmed');
    expect(node).toHaveTextContent('2 Dismissed');
    expect(node).not.toHaveTextContent('Investigating');
  });

  it('collapses the proposed actions to the recommended one and selects it on click', () => {
    const actions = renderNode({
      kind: 'actions',
      proposals: [proposal('p-1', 'Roll back'), proposal('p-2', 'Scale up')],
      isExpanded: false,
      ...flags,
    });

    expect(screen.getByTestId('investigationHypothesisTreeAction-0')).toHaveTextContent(
      'Roll back'
    );
    expect(screen.queryByTestId('investigationHypothesisTreeAction-1')).toBeNull();

    fireEvent.click(screen.getByTestId('investigationHypothesisTreeAction-0'));
    expect(actions.onSelectAction).toHaveBeenCalledWith(0);

    fireEvent.click(screen.getByTestId('investigationHypothesisTreeActionsToggle'));
    expect(actions.onToggleActionsExpanded).toHaveBeenCalled();
  });

  it('lists every proposed action when expanded', () => {
    renderNode({
      kind: 'actions',
      proposals: [proposal('p-1', 'Roll back'), proposal('p-2', 'Scale up')],
      isExpanded: true,
      ...flags,
    });

    expect(screen.getByTestId('investigationHypothesisTreeAction-1')).toHaveTextContent('Scale up');
  });
});
