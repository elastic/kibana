/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { MergeAttachmentChoices } from '../../../common/types/api';
import { renderWithTestingProviders } from '../../common/mock';
import { MergeAttachmentsModal } from './merge_attachments_modal';
import { mergePreviewCase, mergeSummary as summary } from './mock';

jest.mock('../../common/lib/kibana');

const casesById = new Map([
  ['case-1', mergePreviewCase('case-1', 118, 'case-1')],
  ['case-2', mergePreviewCase('case-2', 119, 'case-2')],
]);

const alertChoice = (
  key: string,
  { ruleId = 'rule-1', ruleName = 'Phishing rule', sourceCaseId = 'case-1', addedAt = '' } = {}
) => ({
  key,
  sourceCaseId,
  alertId: key,
  index: 'alerts-index',
  ruleId,
  ruleName,
  addedAt: addedAt || '2024-01-01T00:00:00.000Z',
});

const choices: MergeAttachmentChoices = {
  alerts: [
    alertChoice('alert-1', { addedAt: '2024-01-01T00:00:00.000Z' }),
    alertChoice('alert-2', { addedAt: '2024-03-01T00:00:00.000Z' }),
    alertChoice('alert-3', {
      ruleId: 'rule-2',
      ruleName: 'Malware rule',
      sourceCaseId: 'case-2',
      addedAt: '2024-02-01T00:00:00.000Z',
    }),
  ],
  events: [],
  attacks: [
    {
      key: 'attack-1',
      sourceCaseId: 'case-2',
      addedAt: '2024-01-01T00:00:00.000Z',
      attackId: 'attack-1',
      title: 'Lateral movement',
      alertKeys: ['attack-alert-1', 'attack-alert-2'],
    },
  ],
  observables: [
    {
      key: 'observable-1',
      sourceCaseId: 'case-1',
      addedAt: '2024-01-01T00:00:00.000Z',
      typeKey: 'observable-type-ipv4',
      value: '10.0.0.1',
    },
  ],
  other: [],
};

const attachments = {
  alerts: { ...summary({ total: 5, toCopy: 5, max: 4, overBy: 1 }), byRule: [] },
  attacks: summary({ total: 1, toCopy: 1 }),
  events: summary(),
  observables: summary({ total: 1, toCopy: 1, max: 50 }),
  other: summary({ max: 100 }),
  files: { total: 0 },
  comments: { total: 0 },
};

describe('MergeAttachmentsModal', () => {
  const onApply = jest.fn();
  const onClose = jest.fn();

  const renderModal = (props: Partial<React.ComponentProps<typeof MergeAttachmentsModal>> = {}) =>
    renderWithTestingProviders(
      <MergeAttachmentsModal
        choices={choices}
        attachments={attachments}
        casesById={casesById}
        excludedKeys={new Set()}
        onApply={onApply}
        onClose={onClose}
        {...props}
      />
    );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('opens on the kind that is over its limit and shows only kinds with choices', () => {
    renderModal({
      attachments: {
        ...attachments,
        alerts: { ...summary({ total: 3, toCopy: 3, max: 1000 }), byRule: [] },
        observables: summary({ total: 1, toCopy: 1, max: 0, overBy: 1 }),
      },
    });

    expect(screen.getByTestId('merge-choices-tab-observables')).toHaveAttribute(
      'aria-selected',
      'true'
    );
    expect(screen.getByTestId('merge-choices-tab-alerts')).toBeInTheDocument();
    expect(screen.queryByTestId('merge-choices-tab-events')).not.toBeInTheDocument();
    expect(screen.getByTestId('merge-choices-observables')).toHaveTextContent('IPv4');
  });

  it('groups alerts by rule, and leaves out a rule or a single alert', async () => {
    renderModal();

    expect(screen.getByTestId('merge-choices-alerts-status')).toHaveTextContent(
      'Leave out 1 more to stay within the limit.'
    );
    expect(screen.getByTestId('merge-choices-rule-rule:rule-1-count')).toHaveTextContent(
      '2 of 2 selected'
    );

    await userEvent.click(screen.getByTestId('merge-choices-rule-rule:rule-1-expand'));
    const ruleAlerts = screen.getByTestId('merge-choices-rule-rule:rule-1-alerts');
    expect(within(ruleAlerts).getAllByText('#118')).toHaveLength(2);
    await userEvent.click(within(ruleAlerts).getByRole('checkbox', { name: 'Copy alert-1' }));

    expect(screen.getByTestId('merge-choices-rule-rule:rule-1-count')).toHaveTextContent(
      '1 of 2 selected'
    );
    expect(screen.getByTestId('merge-choices-alerts-status')).toHaveTextContent(
      'Within the limit.'
    );

    await userEvent.click(screen.getByTestId('merge-choices-rule-rule:rule-2-checkbox'));
    expect(screen.getByTestId('merge-choices-alerts-selected')).toHaveTextContent(
      '1 of 3 selected'
    );
    expect(screen.getByTestId('merge-choices-left-out')).toHaveTextContent('2 left out');

    await userEvent.click(screen.getByTestId('merge-choices-apply'));
    expect(onApply).toHaveBeenCalledWith(new Set(['alert-1', 'alert-3']));
  });

  it('keeps the alerts most recently added to a case', async () => {
    renderModal({ excludedKeys: new Set(['observable-1']) });

    await userEvent.click(screen.getByTestId('merge-choices-keep-newest'));
    await userEvent.click(screen.getByTestId('merge-choices-apply'));

    expect(onApply).toHaveBeenCalledWith(new Set(['observable-1', 'alert-1']));
  });

  it('leaves an attack out with its alerts', async () => {
    renderModal({ initialKind: 'attacks' });

    expect(screen.getByTestId('merge-choices-attacks')).toHaveTextContent('Lateral movement');
    expect(screen.getByTestId('merge-choices-attacks')).toHaveTextContent('2 alerts');
    await userEvent.click(screen.getByRole('checkbox', { name: 'Copy Lateral movement' }));
    await userEvent.click(screen.getByTestId('merge-choices-tab-alerts'));

    // Its two alerts bring the alerts within the limit.
    expect(screen.getByTestId('merge-choices-alerts-status')).toHaveTextContent(
      'Within the limit.'
    );

    await userEvent.click(screen.getByTestId('merge-choices-apply'));
    expect(onApply).toHaveBeenCalledWith(new Set(['attack-1']));
  });

  it('discards the changes on cancel', async () => {
    renderModal();

    await userEvent.click(screen.getByTestId('merge-choices-rule-rule:rule-2-checkbox'));
    await userEvent.click(screen.getByTestId('merge-choices-cancel'));

    expect(onClose).toHaveBeenCalled();
    expect(onApply).not.toHaveBeenCalled();
  });
});
