/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiToolTip, EuiText } from '@elastic/eui';
import styled from 'styled-components';
import { asTime } from '../../../../../utils/formatters';
import { PercentOfTrace } from '../PercentOfTrace';

interface DurationProps {
  duration: number;
  totalDuration?: number;
}

const Span = styled('span')`
  white-space: nowrap;
`;

export function Duration({ duration, totalDuration }: DurationProps) {
  totalDuration = totalDuration || duration;
  const label = i18n.translate('xpack.apm.transactionDetails.durationLabel', {
    defaultMessage: 'Duration'
  });

  return (
    <Span>
      <EuiToolTip content={label}>
        <EuiText>{asTime(duration)}</EuiText>
      </EuiToolTip>{' '}
      <PercentOfTrace duration={duration} totalDuration={totalDuration} />
    </Span>
  );
}
