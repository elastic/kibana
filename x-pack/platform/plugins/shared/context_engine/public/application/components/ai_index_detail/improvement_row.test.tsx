/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiProvider } from '@elastic/eui';
import { I18nProvider } from '@kbn/i18n-react';
import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import type { Improvement } from '../../../../common/http_api/improvements';
import { MAX_PREVIEW_LENGTH } from './improvement_format';
import { ImprovementRow } from './improvement_row';
import { buildImprovement } from './improvement_test_fixtures';

const renderRow = ({
  improvement = buildImprovement(),
  onTalkWithAgent,
  onApprove = jest.fn(),
  onReject = jest.fn(),
  isApproving = false,
  isRejecting = false,
  canDecide = true,
  onViewProvenance,
}: {
  improvement?: Improvement;
  onTalkWithAgent?: jest.Mock;
  onApprove?: jest.Mock;
  onReject?: jest.Mock;
  isApproving?: boolean;
  isRejecting?: boolean;
  canDecide?: boolean;
  onViewProvenance?: jest.Mock;
} = {}) => {
  render(
    <I18nProvider>
      <EuiProvider>
        <ImprovementRow
          improvement={improvement}
          onTalkWithAgent={onTalkWithAgent}
          onApprove={onApprove}
          onReject={onReject}
          isApproving={isApproving}
          isRejecting={isRejecting}
          canDecide={canDecide}
          onViewProvenance={onViewProvenance}
        />
      </EuiProvider>
    </I18nProvider>
  );

  return { onApprove, onReject, onTalkWithAgent, onViewProvenance };
};

describe('ImprovementRow', () => {
  it('shows the title, action, status and rationale', () => {
    renderRow();

    expect(screen.getByText('Document the refund window')).toBeInTheDocument();
    expect(screen.getByTestId('contextImprovementAction')).toHaveTextContent(
      'Add knowledge indicator'
    );
    expect(screen.getByTestId('contextImprovementStatus')).toHaveTextContent('Suggested');
    expect(screen.getByTestId('contextImprovementRationale')).toHaveTextContent(
      'Three unanswered questions'
    );
  });

  it('renders the proposed change and where it came from', () => {
    renderRow();

    expect(screen.getByTestId('contextImprovementChange')).toHaveTextContent(
      'Refunds are accepted for 30 days.'
    );
    expect(screen.getByTestId('contextImprovementProvenance')).toHaveTextContent(
      'From 3 signals (coverage_gap)'
    );
  });

  it('approves and rejects the improvement it was given', () => {
    const improvement = buildImprovement();
    const { onApprove, onReject } = renderRow({ improvement });

    fireEvent.click(screen.getByTestId('contextImprovementApproveButton'));
    expect(onApprove).toHaveBeenCalledWith(improvement);

    fireEvent.click(screen.getByTestId('contextImprovementRejectButton'));
    expect(onReject).toHaveBeenCalledWith(improvement);
  });

  it('spins on the action that was clicked, and locks the other so it cannot race it', () => {
    renderRow({ isApproving: true });

    const approve = screen.getByTestId('contextImprovementApproveButton');
    const reject = screen.getByTestId('contextImprovementRejectButton');

    expect(approve.querySelector('.euiLoadingSpinner')).toBeInTheDocument();
    expect(reject.querySelector('.euiLoadingSpinner')).not.toBeInTheDocument();
    expect(reject).toBeDisabled();
  });

  it('opens the agent for this improvement', () => {
    const improvement = buildImprovement();
    const onTalkWithAgent = jest.fn();
    renderRow({ improvement, onTalkWithAgent });

    fireEvent.click(screen.getByTestId('contextImprovementTalkButton'));

    expect(onTalkWithAgent).toHaveBeenCalledWith(improvement);
  });

  it('hides "Talk with agent" when there is no agent to talk to', () => {
    renderRow();

    expect(screen.queryByTestId('contextImprovementTalkButton')).not.toBeInTheDocument();
  });

  it('says a removal is recoverable rather than implying destruction', () => {
    renderRow({
      improvement: buildImprovement({
        action: 'remove_ki',
        target: { ki_id: 'ki-1' },
        payload: {},
      }),
    });

    expect(screen.getByTestId('contextImprovementAction')).toHaveTextContent(
      'Exclude knowledge indicator'
    );
    expect(screen.getByTestId('contextImprovementReversible')).toHaveTextContent(
      'flagged excluded rather than deleted'
    );
  });

  it('keeps a failed improvement actionable, and shows why it failed', () => {
    renderRow({
      improvement: buildImprovement({
        status: 'failed',
        resolution: { error: 'Destination is a pattern' },
      }),
    });

    expect(screen.getByTestId('contextImprovementError')).toHaveTextContent(
      'Destination is a pattern'
    );
    expect(screen.getByTestId('contextImprovementApproveButton')).toHaveTextContent('Retry');
  });

  it('offers no decision on one that is already decided', () => {
    renderRow({ improvement: buildImprovement({ status: 'applied' }) });

    expect(screen.queryByTestId('contextImprovementApproveButton')).not.toBeInTheDocument();
    expect(screen.queryByTestId('contextImprovementRejectButton')).not.toBeInTheDocument();
  });

  it('shows why a reviewer rejected one', () => {
    renderRow({
      improvement: buildImprovement({
        status: 'rejected',
        resolution: { by: 'reviewer', reason: 'Already covered' },
      }),
    });

    expect(screen.getByTestId('contextImprovementRejectReason')).toHaveTextContent(
      'Already covered'
    );
  });

  it('clamps a long rationale behind a show-more toggle', () => {
    const rationale = `${'x'.repeat(MAX_PREVIEW_LENGTH)}TAIL`;
    renderRow({ improvement: buildImprovement({ rationale }) });

    expect(screen.getByTestId('contextImprovementRationale')).not.toHaveTextContent('TAIL');

    fireEvent.click(screen.getByTestId('contextImprovementRationaleShowMore'));

    expect(screen.getByTestId('contextImprovementRationale')).toHaveTextContent('TAIL');
  });

  it('drills into the signals the improvement came from', () => {
    const improvement = buildImprovement();
    const onViewProvenance = jest.fn();
    renderRow({ improvement, onViewProvenance });

    fireEvent.click(screen.getByTestId('contextImprovementViewSignalsButton'));

    expect(onViewProvenance).toHaveBeenCalledWith(improvement);
  });

  it('offers no drill-down when the improvement carries no tag to drill into', () => {
    renderRow({
      improvement: buildImprovement({
        provenance: {
          agent_run_id: 'run-1',
          signal_ids: ['sig-1'],
          signal_spaces: ['default'],
          signal_window: { from: 'now-30d', to: 'now' },
          signal_count: 1,
        },
      }),
      onViewProvenance: jest.fn(),
    });

    expect(screen.queryByTestId('contextImprovementViewSignalsButton')).not.toBeInTheDocument();
  });
});
