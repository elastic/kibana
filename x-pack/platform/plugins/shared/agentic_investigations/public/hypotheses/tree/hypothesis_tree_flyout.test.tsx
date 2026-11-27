/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { EuiProvider, type EuiFlyoutProps } from '@elastic/eui';
import { I18nProvider } from '@kbn/i18n-react';
import { HypothesisTreeFlyout } from './hypothesis_tree_flyout';
import type { HypothesisTreeInput } from './build_hypothesis_graph';

// `EuiFlyout` renders the same markup for push and overlay in jsdom, so assert on its props.
const mockEuiFlyout = jest.fn();
jest.mock('@elastic/eui', () => {
  const actual = jest.requireActual('@elastic/eui');
  return {
    ...actual,
    EuiFlyout: (props: EuiFlyoutProps) => {
      mockEuiFlyout(props);
      return <actual.EuiFlyout {...props} />;
    },
  };
});

// The canvas is covered by the node and graph tests; here only the flyout shell matters.
jest.mock('@xyflow/react', () => ({
  Background: () => null,
  BackgroundVariant: { Dots: 'dots' },
  ControlButton: () => null,
  Controls: () => null,
  MarkerType: { ArrowClosed: 'arrowclosed' },
  Panel: () => null,
  ReactFlow: () => <div data-test-subj="reactFlowStub" />,
  ReactFlowProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useNodesState: () => [[], jest.fn(), jest.fn()],
  useReactFlow: () => ({ fitView: jest.fn(), setCenter: jest.fn(), getZoom: jest.fn() }),
  useStore: () => 0,
}));

const input: HypothesisTreeInput = {
  id: 'investigation-1',
  title: 'Checkout latency',
  subjects: [],
  hypotheses: [],
  proposals: [],
  isRunning: false,
};

describe('HypothesisTreeFlyout', () => {
  it('renders as an overlay flyout so the page behind it keeps its width', () => {
    render(
      <EuiProvider>
        <I18nProvider>
          <HypothesisTreeFlyout input={input} onClose={jest.fn()} />
        </I18nProvider>
      </EuiProvider>
    );

    expect(screen.getByTestId('investigationHypothesisTreeFlyout')).toBeInTheDocument();
    expect(mockEuiFlyout).toHaveBeenCalledWith(expect.objectContaining({ type: 'overlay' }));
    expect(mockEuiFlyout).not.toHaveBeenCalledWith(expect.objectContaining({ type: 'push' }));
  });
});
