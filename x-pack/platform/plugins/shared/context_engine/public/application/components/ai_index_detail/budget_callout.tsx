/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { KbnDangerCallout, KbnWarningCallout } from '@kbn/ui-callout';
import React from 'react';
import type { AiIndexBudgetStatusResponse } from '../../../../common/budgets';
import { formatResetDate, getBucketState } from '../../utils/budgets';

/** Tells the user that automation runs of the AI index are paused, or about to be, by its budget. */
export const AutomationsBudgetCallout = ({ budget }: { budget: AiIndexBudgetStatusResponse }) => {
  const state = getBucketState(budget, 'automations');
  if (state !== 'exhausted' && state !== 'warning') {
    return null;
  }
  const resetDate = formatResetDate(budget.period.end);

  return (
    <>
      {state === 'exhausted' ? (
        <KbnDangerCallout
          announceOnMount
          size="s"
          title={i18n.translate('xpack.contextEngine.aiIndexDetail.budget.automationsPaused', {
            defaultMessage: 'Automation runs are paused until {resetDate}',
            values: { resetDate },
          })}
          data-test-subj="contextAutomationsBudgetPausedCallout"
        >
          {i18n.translate('xpack.contextEngine.aiIndexDetail.budget.automationsPausedBody', {
            defaultMessage:
              'The monthly AI budget for automation runs is spent, so scheduled and manual runs of these automations do not start. Raise the limit in the AI budget section to resume them now.',
          })}
        </KbnDangerCallout>
      ) : (
        <KbnWarningCallout
          announceOnMount
          size="s"
          title={i18n.translate('xpack.contextEngine.aiIndexDetail.budget.automationsWarning', {
            defaultMessage: 'The automation runs budget is nearly spent',
          })}
          data-test-subj="contextAutomationsBudgetWarningCallout"
        >
          {i18n.translate('xpack.contextEngine.aiIndexDetail.budget.automationsWarningBody', {
            defaultMessage:
              'Runs pause when the monthly limit is reached, until the budget resets on {resetDate}.',
            values: { resetDate },
          })}
        </KbnWarningCallout>
      )}
      <EuiSpacer size="m" />
    </>
  );
};
