/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { MergeCasesPreviewResponse } from '../../../../common/types/api';
import { renderWithTestingProviders } from '../../../common/mock';
import { buildMergePreview, mergeSummary } from '../mock';
import { applyExclusions } from '../utils';
import { AttachmentsStep } from './attachments_step';

jest.mock('../../../common/lib/kibana');

const addedAt = '2024-01-01T00:00:00.000Z';

const alertChoice = (key: string, caseId: string, ruleId: string, ruleName: string) => ({
  key,
  sourceCaseId: caseId,
  alertId: key,
  index: 'alerts-index',
  ruleId,
  ruleName,
  addedAt,
});

/** Everything fits: 3 alerts by rule and 1 more an attack brings, 1 observable, events all duplicates. */
const withinLimitsPreview = () =>
  buildMergePreview({
    conflicts: [],
    attachments: {
      alerts: { ...mergeSummary({ total: 4, toCopy: 4, max: 1000 }), byRule: [] },
      attacks: mergeSummary({ total: 1, toCopy: 1 }),
      events: mergeSummary({ total: 2, duplicates: 2 }),
      observables: mergeSummary({ total: 2, toCopy: 1, duplicates: 1, max: 50 }),
      other: mergeSummary(),
      files: { total: 1, byCase: [{ caseId: 'case-1', count: 1 }] },
      comments: {
        total: 3,
        byCase: [
          { caseId: 'case-1', count: 1 },
          { caseId: 'case-2', count: 2 },
        ],
      },
    },
    choices: {
      alerts: [
        alertChoice('alert-1', 'case-1', 'rule-1', 'Phishing rule'),
        alertChoice('alert-2', 'case-1', 'rule-1', 'Phishing rule'),
        alertChoice('alert-3', 'case-2', 'rule-2', 'Malware rule'),
      ],
      events: [],
      attacks: [
        {
          key: 'attack-1',
          sourceCaseId: 'case-2',
          addedAt,
          attackId: 'attack-1',
          title: 'Credential theft',
          alertKeys: ['alert-4'],
        },
      ],
      observables: [
        { key: 'obs-1', sourceCaseId: 'case-1', addedAt, typeKey: 'ipv4', value: '10.0.0.1' },
      ],
      other: [],
    },
  });

const StatefulStep: React.FC<{
  preview: MergeCasesPreviewResponse;
  onChangeExclusions: (keys: ReadonlySet<string>) => void;
}> = ({ preview, onChangeExclusions }) => {
  const [excludedKeys, setExcludedKeys] = useState<ReadonlySet<string>>(new Set());
  return (
    <AttachmentsStep
      preview={preview}
      attachments={applyExclusions(preview, excludedKeys)}
      excludedKeys={excludedKeys}
      onChangeExclusions={(keys) => {
        setExcludedKeys(keys);
        onChangeExclusions(keys);
      }}
      isDisabled={false}
    />
  );
};

const renderStep = (preview: MergeCasesPreviewResponse = withinLimitsPreview()) => {
  const onChangeExclusions = jest.fn();
  renderWithTestingProviders(
    <StatefulStep preview={preview} onChangeExclusions={onChangeExclusions} />
  );
  return { onChangeExclusions };
};

const openRow = (rowId: string) =>
  userEvent.click(screen.getByTestId(`merge-cases-attachments-${rowId}-toggle`));

describe('AttachmentsStep', () => {
  it('starts with every row closed when nothing is over a limit', () => {
    renderStep();

    for (const rowId of ['alerts', 'attacks', 'observables', 'filesAndComments']) {
      expect(screen.getByTestId(`merge-cases-attachments-${rowId}-toggle`)).toHaveAttribute(
        'aria-expanded',
        'false'
      );
    }
    expect(screen.queryByTestId('merge-choices-rules')).not.toBeInTheDocument();
    expect(screen.queryByTestId('merge-cases-attachments-keep-newest')).not.toBeInTheDocument();
  });

  it('opens Alerts to the alerts by rule, and a rule to its alerts, all checked', async () => {
    renderStep();
    await openRow('alerts');

    expect(screen.getByTestId('merge-choices-rule-rule:rule-1-count')).toHaveTextContent(
      '2 of 2 selected'
    );
    expect(screen.getByTestId('merge-choices-rule-rule:rule-1-checkbox')).toBeChecked();

    await userEvent.click(screen.getByTestId('merge-choices-rule-rule:rule-1-expand'));

    const alerts = screen.getByTestId('merge-choices-rule-rule:rule-1-alerts');
    expect(alerts).toHaveTextContent('alert-1');
    expect(alerts).toHaveTextContent('alert-2');
    expect(within(alerts).getByRole('checkbox', { name: 'Copy alert-1' })).toBeChecked();
  });

  it('says how many of the alerts come with attacks', async () => {
    renderStep();
    await openRow('alerts');

    expect(screen.getByTestId('merge-cases-attachments-alerts-with-attacks')).toHaveTextContent(
      '1 more alert comes with the attacks below.'
    );
  });

  it('opens the other kinds to their items', async () => {
    renderStep();
    await openRow('attacks');
    await openRow('observables');

    expect(screen.getByTestId('merge-choices-attacks')).toHaveTextContent('Credential theft');
    expect(screen.getByTestId('merge-choices-observables')).toHaveTextContent('10.0.0.1');
  });

  it('leaves items out by unchecking them, even when nothing is over a limit', async () => {
    const { onChangeExclusions } = renderStep();
    await openRow('alerts');
    await userEvent.click(screen.getByTestId('merge-choices-rule-rule:rule-2-checkbox'));

    expect(onChangeExclusions).toHaveBeenLastCalledWith(new Set(['alert-3']));
    expect(screen.getByTestId('merge-choices-rule-rule:rule-2-count')).toHaveTextContent(
      '0 of 1 selected'
    );
    expect(screen.getByTestId('merge-cases-attachments-alerts')).toHaveTextContent(
      '3 to copy · 1 left out'
    );
  });

  it('opens files and comments to what stays on each case', async () => {
    renderStep();
    await openRow('filesAndComments');

    const rows = within(screen.getByTestId('merge-cases-files-comments-by-case')).getAllByRole(
      'row'
    );
    // The header row, then one row per case.
    expect(rows).toHaveLength(3);
    expect(rows[1]).toHaveTextContent(/Phishing.*1.*1/);
    expect(rows[2]).toHaveTextContent(/Follow-up.*0.*2/);
  });

  it("doesn't open a row with nothing to list", () => {
    renderStep();

    expect(screen.queryByTestId('merge-cases-attachments-events-toggle')).not.toBeInTheDocument();
    expect(screen.getByTestId('merge-cases-attachments-events')).toHaveTextContent(
      '0 to copy · 2 duplicates skipped'
    );
  });

  it('opens a kind over its limit with the items to leave out', () => {
    const preview = withinLimitsPreview();
    renderStep({
      ...preview,
      attachments: {
        ...preview.attachments,
        alerts: { ...mergeSummary({ total: 4, toCopy: 4, max: 3, overBy: 1 }), byRule: [] },
      },
    });

    expect(screen.getByTestId('merge-cases-attachments-alerts-toggle')).toHaveAttribute(
      'aria-expanded',
      'true'
    );
    expect(screen.getByTestId('merge-choices-rule-rule:rule-1-checkbox')).toBeInTheDocument();
    expect(screen.getByTestId('merge-cases-attachments-alerts-status')).toHaveTextContent(
      'Leave out 1 more.'
    );
  });

  it('keeps the newest of every kind over its limit with one button', async () => {
    const preview = withinLimitsPreview();
    const { onChangeExclusions } = renderStep({
      ...preview,
      attachments: {
        ...preview.attachments,
        alerts: { ...mergeSummary({ total: 4, toCopy: 4, max: 3, overBy: 1 }), byRule: [] },
        observables: mergeSummary({ total: 2, toCopy: 2, max: 1, overBy: 1 }),
      },
      choices: {
        ...preview.choices,
        observables: [
          ...preview.choices.observables,
          {
            key: 'obs-2',
            sourceCaseId: 'case-2',
            addedAt: '2024-02-01T00:00:00.000Z',
            typeKey: 'ipv4',
            value: '10.0.0.2',
          },
        ],
      },
    });
    const status = screen.getByTestId('merge-cases-attachments-limits-status');
    expect(status).toHaveTextContent('Some attachments are over a limit.');

    await userEvent.click(screen.getByTestId('merge-cases-attachments-keep-newest'));

    // Alerts added at the same time keep their order, so the last one leaves.
    expect(onChangeExclusions).toHaveBeenLastCalledWith(new Set(['alert-3', 'obs-1']));
    expect(status).toHaveTextContent('Every attachment is within its limit.');
  });
});
