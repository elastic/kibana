/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiProvider } from '@elastic/eui';
import { I18nProvider } from '@kbn/i18n-react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import React from 'react';
import type { ImprovementEnvelope } from '../../../../common/http_api/improvements';
import { ImprovementRow } from './improvement_row';
import { buildImprovement } from './improvement_test_fixtures';

const renderRow = ({
  improvement = buildImprovement(),
  isActionable = true,
  resolvingAction,
  onApprove = jest.fn(),
  onReject = jest.fn(),
}: {
  improvement?: ImprovementEnvelope;
  isActionable?: boolean;
  resolvingAction?: 'approve' | 'reject';
  onApprove?: () => void;
  onReject?: () => void;
} = {}) => {
  render(
    <I18nProvider>
      <EuiProvider>
        <ImprovementRow
          improvement={improvement}
          isActionable={isActionable}
          resolvingAction={resolvingAction}
          onApprove={onApprove}
          onReject={onReject}
        />
      </EuiProvider>
    </I18nProvider>
  );
  return { onApprove, onReject };
};

describe('ImprovementRow', () => {
  it('shows what would change and the evidence behind it', () => {
    renderRow();

    expect(screen.getByTestId('contextImprovementRowTitle')).toHaveTextContent(
      'Document the refund window'
    );
    expect(screen.getByTestId('contextImprovementRowAction')).toHaveTextContent(
      'Add knowledge indicator'
    );
    expect(screen.getByTestId('contextImprovementRowRationale')).toHaveTextContent(
      'Three retrievals for "refund" returned nothing.'
    );
    expect(screen.getByTestId('contextImprovementRowSignalTag')).toHaveTextContent(
      'Empty retrieval'
    );
    expect(screen.getByTestId('contextImprovementRowConfidence')).toHaveTextContent(
      '82% confidence'
    );
  });

  it('collapses a long rationale so one verbose suggestion cannot bury the rest', () => {
    renderRow({
      improvement: buildImprovement({
        rationale: `${'Refund questions keep failing. '.repeat(80)}FINAL-SENTENCE.`,
      }),
    });

    const rationale = screen.getByTestId('contextImprovementRowRationale');
    expect(rationale).not.toHaveTextContent('FINAL-SENTENCE.');

    fireEvent.click(within(rationale).getByText('Show more'));

    expect(rationale).toHaveTextContent('FINAL-SENTENCE.');
  });

  it('collapses a long knowledge indicator body in the payload preview', () => {
    renderRow({
      improvement: buildImprovement({
        payload: { ki: { title: 'Refunds', content: `${'x'.repeat(1200)}FINAL-CONTENT.` } },
      }),
    });

    fireEvent.click(screen.getByText('What would change'));

    const payload = screen.getByTestId('contextImprovementRowKiPayload');
    expect(payload).not.toHaveTextContent('FINAL-CONTENT.');

    fireEvent.click(within(payload).getByText('Show more'));

    expect(payload).toHaveTextContent('FINAL-CONTENT.');
  });

  it('previews the knowledge indicator fields the approval would write', () => {
    renderRow();

    fireEvent.click(screen.getByText('What would change'));

    expect(screen.getByTestId('contextImprovementRowKiPayload')).toHaveTextContent('Refunds');
    expect(screen.getByTestId('contextImprovementRowKiPayload')).toHaveTextContent('30 days.');
  });

  it('previews the workflow definition for an automation suggestion', () => {
    renderRow({
      improvement: buildImprovement({
        action: 'add_workflow',
        payload: { workflow_yaml: 'name: nightly refresh' },
      }),
    });

    fireEvent.click(screen.getByText('What would change'));

    expect(screen.getByTestId('contextImprovementRowWorkflowYaml')).toHaveTextContent(
      'name: nightly refresh'
    );
  });

  it('names the target so two edits of the same kind can be told apart', () => {
    renderRow({
      improvement: buildImprovement({ action: 'edit_ki', target: { ki_id: 'ki-42' } }),
    });

    expect(screen.getByTestId('contextImprovementRowTarget')).toHaveTextContent('ki-42');
  });

  it('approves and rejects through the given handlers', () => {
    const { onApprove, onReject } = renderRow();

    fireEvent.click(screen.getByTestId('contextImprovementApproveButton'));
    fireEvent.click(screen.getByTestId('contextImprovementRejectButton'));

    expect(onApprove).toHaveBeenCalledTimes(1);
    expect(onReject).toHaveBeenCalledTimes(1);
  });

  it('blocks its own buttons while another suggestion is being resolved', () => {
    renderRow({ isActionable: false });

    expect(screen.getByTestId('contextImprovementApproveButton')).toBeDisabled();
    expect(screen.getByTestId('contextImprovementRejectButton')).toBeDisabled();
  });

  it('shows the spinner on the action that is actually running', () => {
    renderRow({ isActionable: false, resolvingAction: 'reject' });

    expect(
      within(screen.getByTestId('contextImprovementRejectButton')).getByRole('progressbar')
    ).toBeInTheDocument();
    expect(
      within(screen.getByTestId('contextImprovementApproveButton')).queryByRole('progressbar')
    ).not.toBeInTheDocument();
  });

  it('reports who applied a suggestion instead of offering it again', () => {
    renderRow({
      improvement: buildImprovement({
        status: 'applied',
        applied_at: '2026-02-02T10:00:00.000Z',
        resolution: { by: 'elastic' },
      }),
    });

    expect(screen.getByTestId('contextImprovementRowStatus')).toHaveTextContent('Applied');
    expect(screen.getByTestId('contextImprovementRowResolution')).toHaveTextContent(
      'Applied by elastic'
    );
    expect(screen.queryByTestId('contextImprovementApproveButton')).not.toBeInTheDocument();
  });

  it('reports a rejection without naming a user when the username is unknown', () => {
    renderRow({
      improvement: buildImprovement({
        status: 'rejected',
        rejected_at: '2026-02-02T10:00:00.000Z',
        resolution: {},
      }),
    });

    expect(screen.getByTestId('contextImprovementRowResolution')).toHaveTextContent(
      'Rejected by an unknown user'
    );
  });

  it('explains a failed apply and offers a retry', () => {
    renderRow({
      improvement: buildImprovement({
        status: 'failed',
        resolution: { error: 'workflow yaml is invalid' },
      }),
    });

    expect(screen.getByTestId('contextImprovementRowError')).toHaveTextContent(
      'workflow yaml is invalid'
    );
    expect(screen.getByTestId('contextImprovementApproveButton')).toHaveTextContent('Retry');
  });

  it('omits the payload preview when there is nothing to show', () => {
    renderRow({
      improvement: buildImprovement({
        action: 'remove_ki',
        target: { ki_id: 'ki-9' },
        payload: {},
      }),
    });

    expect(screen.queryByTestId('contextImprovementRowPayload')).not.toBeInTheDocument();
  });
});
