/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { createEvent, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { EuiProvider } from '@elastic/eui';
import { I18nProvider } from '@kbn/i18n-react';
import { ReactFlowProvider, type NodeProps } from '@xyflow/react';
import {
  useIsApprovingProposal,
  useIsDecliningProposal,
  useProposal,
} from '@kbn/proposals-plugin/public';
import type { ProposalWithMetadata } from '@kbn/proposals-common';
import type { InvestigationProposalSummary } from '../../../common/investigations/investigation';
import {
  HypothesisTreeActionsContext,
  HypothesisTreeNode,
  type HypothesisTreeFlowNode,
} from './hypothesis_tree_nodes';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import type { SubjectServices } from '../../subjects/attachments/subject_services';

jest.mock('@kbn/proposals-plugin/public');
// The flyout itself is covered by `subject_details_flyout.test.tsx`; here only the link's choice
// between opening it and following its href matters.
jest.mock('../../subjects/attachments/subject_details_flyout', () => ({
  SubjectDetailsFlyout: ({ alertId, onClose }: { alertId: string; onClose: () => void }) => (
    <div data-test-subj="subjectFlyoutStub">
      {alertId}
      <button type="button" data-test-subj="subjectFlyoutStubClose" onClick={onClose}>
        close
      </button>
    </div>
  ),
}));

const flags = { isSelected: false, isDimmed: false, isRunning: false, selectedActionIndex: null };

const renderNode = (
  data: HypothesisTreeFlowNode['data'],
  actions = { onSelectAction: jest.fn(), onSelectNode: jest.fn() },
  services: SubjectServices = {},
  onParentClick?: () => void
) => {
  render(
    <EuiProvider>
      <I18nProvider>
        <ReactFlowProvider>
          <KibanaContextProvider services={services}>
            <HypothesisTreeActionsContext.Provider value={actions}>
              {/* React Flow selects a node from a click that bubbles up to it. */}
              <div role="presentation" onClick={onParentClick}>
                <HypothesisTreeNode
                  {...({ id: 'node', data } as NodeProps<HypothesisTreeFlowNode>)}
                />
              </div>
            </HypothesisTreeActionsContext.Provider>
          </KibanaContextProvider>
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

const loadedProposals: Record<string, Partial<ProposalWithMetadata>> = {
  'p-1': { id: 'p-1', status: 'succeeded', decision: 'approved' },
  'p-2': { id: 'p-2', status: 'pending' },
};

describe('HypothesisTreeNode', () => {
  beforeEach(() => {
    jest
      .mocked(useProposal)
      .mockImplementation(
        (id) => ({ data: id ? loadedProposals[id] : undefined } as ReturnType<typeof useProposal>)
      );
    jest.mocked(useIsApprovingProposal).mockReturnValue(false);
    jest.mocked(useIsDecliningProposal).mockReturnValue(false);
  });

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

  it('links an alert trigger to the alert without selecting the node', () => {
    renderNode({
      kind: 'trigger',
      title: 'Checkout latency spike',
      subjects: [
        {
          type: 'alert',
          id: 'a-1',
          snapshot: { rule_name: 'Checkout p99 > 2s', url: '/app/observability/alerts/a-1' },
          created_at: 'x',
        },
      ],
      ...flags,
    });

    const link = screen.getByTestId('investigationHypothesisTreeTriggerLink');
    expect(link).toHaveTextContent('View alert');
    expect(link).toHaveAttribute('href', '/app/observability/alerts/a-1');
  });

  describe('an alert trigger whose source has a registered flyout', () => {
    const subject = {
      type: 'alert' as const,
      id: 'episode-1',
      snapshot: {
        source: 'elastic.example',
        url: '/app/observability/alerts/episode-1',
        data: { event_id: 'event-1' },
      },
      created_at: 'x',
    };
    const trigger = { kind: 'trigger' as const, title: 'x', subjects: [subject], ...flags };

    it('opens that flyout in place, without following the link or selecting the node', async () => {
      const actions = renderNode(trigger, undefined, { getAlertFlyout: () => () => null });

      const link = screen.getByTestId('investigationHypothesisTreeTriggerLink');
      const click = createEvent.click(link, { bubbles: true, cancelable: true });
      fireEvent(link, click);

      expect(click.defaultPrevented).toBe(true);
      expect(await screen.findByTestId('subjectFlyoutStub')).toHaveTextContent('episode-1');
      expect(actions.onSelectNode).not.toHaveBeenCalled();
    });

    it('keeps a click inside the flyout from reaching the node, as React bubbles it through the portal', async () => {
      const onParentClick = jest.fn();
      renderNode(trigger, undefined, { getAlertFlyout: () => () => null }, onParentClick);

      fireEvent.click(screen.getByTestId('investigationHypothesisTreeTriggerLink'));
      const flyout = await screen.findByTestId('subjectFlyoutStub');
      onParentClick.mockClear();
      fireEvent.click(flyout);

      expect(onParentClick).not.toHaveBeenCalled();
    });

    it('opens a flyout registered after the link rendered, since it decides when clicked', async () => {
      const registry: { flyout?: () => null } = {};
      renderNode(trigger, undefined, { getAlertFlyout: () => registry.flyout });

      registry.flyout = () => null;
      const link = screen.getByTestId('investigationHypothesisTreeTriggerLink');
      const click = createEvent.click(link, { bubbles: true, cancelable: true });
      fireEvent(link, click);

      expect(click.defaultPrevented).toBe(true);
      expect(await screen.findByTestId('subjectFlyoutStub')).toHaveTextContent('episode-1');
    });

    it('gives focus back to the link when the flyout closes', async () => {
      renderNode(trigger, undefined, { getAlertFlyout: () => () => null });

      const link = screen.getByTestId('investigationHypothesisTreeTriggerLink');
      link.focus();
      fireEvent.click(link);
      fireEvent.click(await screen.findByTestId('subjectFlyoutStubClose'));
      (document.activeElement as HTMLElement | null)?.blur();

      await waitFor(() => expect(link).toHaveFocus());
    });

    it('keeps following the link for a new-tab click', () => {
      renderNode(trigger, undefined, { getAlertFlyout: () => () => null });

      const link = screen.getByTestId('investigationHypothesisTreeTriggerLink');
      const click = createEvent.click(link, { bubbles: true, cancelable: true, metaKey: true });
      fireEvent(link, click);

      expect(click.defaultPrevented).toBe(false);
      expect(screen.queryByTestId('subjectFlyoutStub')).not.toBeInTheDocument();
    });

    it('keeps the link for alerts without a registered flyout, as before', () => {
      renderNode(
        { ...trigger, subjects: [{ ...subject, snapshot: { url: subject.snapshot.url } }] },
        undefined,
        { http: {} as never, getAlertFlyout: () => undefined }
      );

      const link = screen.getByTestId('investigationHypothesisTreeTriggerLink');
      const click = createEvent.click(link, { bubbles: true, cancelable: true });
      fireEvent(link, click);

      expect(screen.queryByTestId('subjectFlyoutStub')).not.toBeInTheDocument();
      expect(link).toHaveAttribute('href', '/app/observability/alerts/episode-1');
    });
  });

  it('links several alert triggers to the alerts list, filtered to them', async () => {
    const services = {
      share: {
        url: {
          locators: {
            get: (locatorId: string) => ({
              getUrl: async (params: object) => `/located/${locatorId}?${JSON.stringify(params)}`,
              navigate: jest.fn(),
            }),
          },
        },
      },
    } as unknown as SubjectServices;

    renderNode(
      {
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
      },
      undefined,
      services
    );

    const link = await screen.findByTestId('investigationHypothesisTreeTriggerLink');
    expect(link).toHaveTextContent('View 2 alerts');
    await waitFor(() => expect(link).toHaveAttribute('href'));
    expect(JSON.parse(link.getAttribute('href')!.split('?')[1]).filters).toEqual({
      queryString: 'alert.id: ("a-1" or "a-2") or kibana.alert.uuid: ("a-1" or "a-2")',
      status: 'all',
    });
  });

  it('links a Slack trigger to the thread in a new tab', () => {
    renderNode({
      kind: 'trigger',
      title: 'Why is checkout slow?',
      subjects: [
        {
          type: 'slack_thread',
          id: 's-1',
          summary: 'Why is checkout slow?',
          slack: {
            channel: 'ops',
            thread_ts: '1.2',
            permalink: 'https://example.slack.com/archives/C1/p12',
          },
          created_at: 'x',
        },
      ],
      ...flags,
    });

    const link = screen.getByTestId('investigationHypothesisTreeTriggerLink');
    expect(link).toHaveTextContent('Open in Slack');
    expect(link).toHaveAttribute('target', '_blank');
  });

  it('does not link a subject without a link', () => {
    renderNode({
      kind: 'trigger',
      title: 'x',
      subjects: [{ type: 'alert', id: 'a-1', created_at: 'x' }],
      ...flags,
    });

    expect(screen.queryByTestId('investigationHypothesisTreeTriggerLink')).toBeNull();
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
    expect(node).toHaveTextContent('90% confidence');
    expect(node.querySelector('code')).toHaveTextContent('user_id');
  });

  it.each([
    [true, 'Investigating', 'Unresolved'],
    [false, 'Unresolved', 'Investigating'],
  ])(
    'shows an open hypothesis as in progress only while the agent runs (running: %s)',
    (isRunning, shown, hidden) => {
      renderNode({
        kind: 'hypothesis',
        index: 0,
        isWinner: false,
        hypothesis: { candidate: 'Pool leak', confidence: 0.4, status: 'investigating' },
        ...flags,
        isRunning,
      });

      const node = screen.getByTestId('investigationHypothesisTreeNode-hypothesis');
      expect(node).toHaveTextContent(shown);
      expect(node).not.toHaveTextContent(hidden);
      expect(node.querySelector('[role="progressbar"]') !== null).toBe(isRunning);
    }
  );

  it('shows what settles a hypothesis only while it is still open', () => {
    const settledBy = 'Refuted if 5xx stays under 0.1% for 30 min';
    renderNode({
      kind: 'hypothesis',
      index: 0,
      isWinner: false,
      hypothesis: {
        candidate: 'Pool leak',
        confidence: 0.4,
        status: 'investigating',
        settled_by: settledBy,
      },
      ...flags,
    });
    expect(screen.getByTestId('investigationHypothesisTreeNode-hypothesis')).toHaveTextContent(
      `Settled by: ${settledBy}`
    );
  });

  it('does not show settled_by on a dismissed hypothesis', () => {
    renderNode({
      kind: 'hypothesis',
      index: 0,
      isWinner: false,
      hypothesis: {
        candidate: 'Pool leak',
        confidence: 0.1,
        status: 'dismissed',
        settled_by: 'Refuted if x',
      },
      ...flags,
    });
    expect(screen.getByTestId('investigationHypothesisTreeNode-hypothesis')).not.toHaveTextContent(
      'Settled by'
    );
  });

  it('lists the missing data under the conclusion, with why it is missing', () => {
    renderNode({
      kind: 'conclusion',
      conclusion: 'Cause not confirmed: a bad deploy.',
      missingData: [{ what: 'SLO definition', source: 'SLO API', why: 'no_access' }],
      ...flags,
    });

    const list = screen.getByTestId('missingData');
    expect(list).toHaveTextContent('No access');
    expect(list).toHaveTextContent('SLO definition · SLO API');
  });

  it('counts the hypotheses by status', () => {
    renderNode({
      kind: 'hypotheses',
      total: 3,
      counts: { confirmed: 1, dismissed: 2, investigating: 0 },
      ...flags,
    });

    const node = screen.getByTestId('investigationHypothesisTreeNode-hypotheses');
    expect(node).toHaveTextContent('3 hypotheses');
    expect(node).toHaveTextContent('1 Confirmed');
    expect(node).toHaveTextContent('2 Dismissed');
    expect(node).not.toHaveTextContent('Investigating');
  });

  it('lists every proposed action and selects one on click', () => {
    const actions = renderNode({
      kind: 'actions',
      proposals: [proposal('p-1', 'Roll back'), proposal('p-2', 'Scale up')],
      ...flags,
    });

    expect(screen.getByTestId('investigationHypothesisTreeAction-0')).toHaveTextContent(
      'Roll back'
    );
    expect(screen.getByTestId('investigationHypothesisTreeAction-1')).toHaveTextContent('Scale up');

    fireEvent.click(screen.getByTestId('investigationHypothesisTreeAction-1'));
    expect(actions.onSelectAction).toHaveBeenCalledWith(1);
  });

  it("shows each proposed action's status", () => {
    jest.mocked(useIsDecliningProposal).mockImplementation((id) => id === 'p-2');
    renderNode({
      kind: 'actions',
      proposals: [proposal('p-1', 'Roll back'), proposal('p-2', 'Scale up')],
      ...flags,
    });

    expect(screen.getByTestId('investigationHypothesisTreeAction-0')).toHaveTextContent('Applied');
    expect(screen.getByTestId('investigationHypothesisTreeAction-1')).toHaveTextContent(
      'Declining'
    );
  });

  it('shows a proposed action awaiting a decision as needing review', () => {
    renderNode({ kind: 'actions', proposals: [proposal('p-2', 'Scale up')], ...flags });

    expect(
      screen.getByTestId('investigationHypothesisTreeActionStatus-pending')
    ).toBeInTheDocument();
  });

  it('opens a node from the keyboard', () => {
    const actions = renderNode({
      kind: 'conclusion',
      conclusion: 'A bad deploy.',
      ...flags,
    });

    const node = screen.getByRole('button', { pressed: false });
    fireEvent.keyDown(node, { key: 'Enter' });
    fireEvent.keyDown(node, { key: ' ' });
    fireEvent.keyDown(node, { key: 'a' });
    expect(actions.onSelectNode).toHaveBeenCalledTimes(2);
    expect(actions.onSelectNode).toHaveBeenCalledWith('node');
  });

  it('leaves keys on a link inside a node to the link', () => {
    const actions = renderNode({
      kind: 'trigger',
      title: 'Checkout latency spike',
      subjects: [
        {
          type: 'alert',
          id: 'a-1',
          snapshot: { rule_name: 'Checkout p99 > 2s', url: '/app/observability/alerts/a-1' },
          created_at: 'x',
        },
      ],
      ...flags,
    });

    fireEvent.keyDown(screen.getByTestId('investigationHypothesisTreeTriggerLink'), {
      key: 'Enter',
    });
    expect(actions.onSelectNode).not.toHaveBeenCalled();
  });

  it('does not make the hypotheses chip a button', () => {
    renderNode({
      kind: 'hypotheses',
      total: 1,
      counts: { confirmed: 1, dismissed: 0, investigating: 0 },
      ...flags,
    });

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
