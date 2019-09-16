/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiToolTip } from '@elastic/eui';
import { asPercent } from '../../../../utils/formatters';

interface PercentOfTraceProps {
  duration: number;
  totalDuration?: number;
}

export function PercentOfTrace({
  duration,
  totalDuration
}: PercentOfTraceProps) {
  totalDuration = totalDuration || duration;
  const isOver100 = duration > totalDuration;
  const percentOfTrace = isOver100
    ? '>100%'
    : asPercent(duration, totalDuration, '');

  const percentOfTraceText = i18n.translate(
    'xpack.apm.transactionDetails.percentOfTrace',
    {
      defaultMessage: '{value} of trace',
      values: { value: percentOfTrace }
    }
  );

  return (
    <>
      {isOver100 ? (
        <EuiToolTip
          content={i18n.translate(
            'xpack.apm.transactionDetails.percentOfTraceLabelExplanation',
            {
              defaultMessage:
                'The % of trace exceeds 100% because this transaction takes longer than the root transaction.'
            }
          )}
        >
          <>{percentOfTraceText}</>
        </EuiToolTip>
      ) : (
        `(${percentOfTraceText})`
      )}
    </>
  );
}
