/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import React from 'react';
import { idx } from '@kbn/elastic-idx';
import styled from 'styled-components';
import {
  TRANSACTION_DURATION,
  TRANSACTION_RESULT,
  URL_FULL,
  USER_ID,
  TRANSACTION_PAGE_URL
} from '../../../../../common/elasticsearch_fieldnames';
import { NOT_AVAILABLE_LABEL } from '../../../../../common/i18n';
import { Transaction } from '../../../../../typings/es_schemas/ui/Transaction';
import { asTime } from '../../../../utils/formatters';
import {
  IStickyProperty,
  StickyProperties
} from '../../../shared/StickyProperties';
import { ErrorCountBadge } from './ErrorCountBadge';
import { isRumAgentName } from '../../../../../common/agent_name';
import { fontSize } from '../../../../style/variables';
import { PercentOfTrace } from './PercentOfTrace';

interface Props {
  transaction: Transaction;
  totalDuration?: number;
  errorCount: number;
}

const ErrorTitle = styled.span`
  font-size: ${fontSize};
`;

export function StickyTransactionProperties({
  transaction,
  totalDuration,
  errorCount
}: Props) {
  const timestamp = transaction['@timestamp'];

  const isRumAgent = isRumAgentName(transaction.agent.name);
  const { urlFieldName, urlValue } = isRumAgent
    ? {
        urlFieldName: TRANSACTION_PAGE_URL,
        urlValue: idx(transaction, _ => _.transaction.page.url)
      }
    : {
        urlFieldName: URL_FULL,
        urlValue: idx(transaction, _ => _.url.full)
      };

  const duration = transaction.transaction.duration.us;

  const noErrorsText = i18n.translate(
    'xpack.apm.transactionDetails.errorsNone',
    {
      defaultMessage: 'None'
    }
  );

  const stickyProperties: IStickyProperty[] = [
    {
      label: i18n.translate('xpack.apm.transactionDetails.timestampLabel', {
        defaultMessage: 'Timestamp'
      }),
      fieldName: '@timestamp',
      val: timestamp,
      truncated: true,
      width: '50%'
    },
    {
      fieldName: urlFieldName,
      label: 'URL',
      val: urlValue || NOT_AVAILABLE_LABEL,
      truncated: true,
      width: '50%'
    },
    {
      label: i18n.translate('xpack.apm.transactionDetails.durationLabel', {
        defaultMessage: 'Duration'
      }),
      fieldName: TRANSACTION_DURATION,
      val: asTime(duration),
      width: '25%'
    },
    {
      label: i18n.translate(
        'xpack.apm.transactionDetails.percentOfTraceLabel',
        {
          defaultMessage: '% of trace'
        }
      ),
      val: <PercentOfTrace duration={duration} totalDuration={totalDuration} />,
      width: '25%'
    },
    {
      label: i18n.translate('xpack.apm.transactionDetails.resultLabel', {
        defaultMessage: 'Result'
      }),
      fieldName: TRANSACTION_RESULT,
      val: idx(transaction, _ => _.transaction.result) || NOT_AVAILABLE_LABEL,
      width: '14%'
    },
    {
      label: i18n.translate(
        'xpack.apm.transactionDetails.errorsOverviewLabel',
        {
          defaultMessage: 'Errors'
        }
      ),
      val: errorCount ? (
        <>
          <ErrorCountBadge>{errorCount}</ErrorCountBadge>
          <ErrorTitle>
            &nbsp;
            {i18n.translate('xpack.apm.transactionDetails.errorsOverviewLink', {
              values: { errorCount },
              defaultMessage:
                '{errorCount, plural, one {Related error} other {Related errors}}'
            })}
          </ErrorTitle>
        </>
      ) : (
        noErrorsText
      ),
      width: '18%'
    },
    {
      label: i18n.translate('xpack.apm.transactionDetails.userIdLabel', {
        defaultMessage: 'User ID'
      }),
      fieldName: USER_ID,
      val: idx(transaction, _ => _.user.id) || NOT_AVAILABLE_LABEL,
      truncated: true,
      width: '18%'
    }
  ];

  const { user_agent: userAgent } = transaction;

  if (userAgent) {
    const { os, device } = userAgent;
    const width = '25%';
    stickyProperties.push({
      label: i18n.translate('xpack.apm.transactionDetails.userAgentLabel', {
        defaultMessage: 'User agent'
      }),
      val: [userAgent.name, userAgent.version].filter(Boolean).join(' '),
      truncated: true,
      width
    });

    if (os) {
      stickyProperties.push({
        label: i18n.translate('xpack.apm.transactionDetails.userAgentOsLabel', {
          defaultMessage: 'User agent OS'
        }),
        val: os.full || os.name,
        truncated: true,
        width
      });
    }

    if (device) {
      stickyProperties.push({
        label: i18n.translate(
          'xpack.apm.transactionDetails.userAgentDeviceLabel',
          {
            defaultMessage: 'User agent device'
          }
        ),
        val: device.name,
        width
      });
    }
  }

  return <StickyProperties stickyProperties={stickyProperties} />;
}
