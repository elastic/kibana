/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { i18n } from '@kbn/i18n';
import styled from 'styled-components';
import { px } from '../../../../../code/public/style/variables';
import { ErrorCountBadge } from '../../app/TransactionDetails/WaterfallWithSummmary/ErrorCountBadge';
import { units } from '../../../style/variables';

interface Props {
  count: number;
}

const Badge = styled(ErrorCountBadge)`
  margin-top: ${px(units.eighth)};
`;

const ErrorCountSummaryItem = ({ count }: Props) => {
  return (
    <Badge>
      {i18n.translate('xpack.apm.transactionDetails.errorCount', {
        defaultMessage:
          '{errorCount, number} {errorCount, plural, one {Error} other {Errors}}',
        values: { errorCount: count }
      })}
    </Badge>
  );
};

export { ErrorCountSummaryItem };
