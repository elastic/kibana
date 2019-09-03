/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { isBoolean } from 'lodash';
import React, { Fragment } from 'react';
import { idx } from '@kbn/elastic-idx';
import {
  ERROR_EXC_HANDLED,
  HTTP_REQUEST_METHOD,
  TRANSACTION_ID,
  URL_FULL,
  USER_ID,
  ERROR_PAGE_URL
} from '../../../../../common/elasticsearch_fieldnames';
import { NOT_AVAILABLE_LABEL } from '../../../../../common/i18n';
import { APMError } from '../../../../../typings/es_schemas/ui/APMError';
import { Transaction } from '../../../../../typings/es_schemas/ui/Transaction';
import { StickyProperties } from '../../../shared/StickyProperties';
import { TransactionDetailLink } from '../../../shared/Links/apm/TransactionDetailLink';
import { isRumAgentName } from '../../../../../common/agent_name';

interface Props {
  error: APMError;
  transaction: Transaction | undefined;
}

function TransactionLinkWrapper({
  transaction
}: {
  transaction: Transaction | undefined;
}) {
  if (!transaction) {
    return <Fragment>{NOT_AVAILABLE_LABEL}</Fragment>;
  }

  const isSampled = transaction.transaction.sampled;
  if (!isSampled) {
    return <Fragment>{transaction.transaction.id}</Fragment>;
  }

  return (
    <TransactionDetailLink
      serviceName={transaction.service.name}
      transactionId={transaction.transaction.id}
      traceId={transaction.trace.id}
      transactionName={transaction.transaction.name}
      transactionType={transaction.transaction.type}
    >
      {transaction.transaction.id}
    </TransactionDetailLink>
  );
}

export function StickyErrorProperties({ error, transaction }: Props) {
  const isHandled = idx(error, _ => _.error.exception[0].handled);
  const isRumAgent = isRumAgentName(error.agent.name);

  const { urlFieldName, urlValue } = isRumAgent
    ? {
        urlFieldName: ERROR_PAGE_URL,
        urlValue: idx(error, _ => _.error.page.url)
      }
    : {
        urlFieldName: URL_FULL,
        urlValue: idx(error, _ => _.url.full)
      };

  const stickyProperties = [
    {
      fieldName: '@timestamp',
      label: i18n.translate('xpack.apm.errorGroupDetails.timestampLabel', {
        defaultMessage: 'Timestamp'
      }),
      val: error['@timestamp'],
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
      fieldName: HTTP_REQUEST_METHOD,
      label: i18n.translate('xpack.apm.errorGroupDetails.requestMethodLabel', {
        defaultMessage: 'Request method'
      }),
      val: idx(error, _ => _.http.request.method) || NOT_AVAILABLE_LABEL,
      width: '25%'
    },
    {
      fieldName: ERROR_EXC_HANDLED,
      label: i18n.translate('xpack.apm.errorGroupDetails.handledLabel', {
        defaultMessage: 'Handled'
      }),
      val: isBoolean(isHandled) ? String(isHandled) : NOT_AVAILABLE_LABEL,
      width: '25%'
    },
    {
      fieldName: TRANSACTION_ID,
      label: i18n.translate(
        'xpack.apm.errorGroupDetails.transactionSampleIdLabel',
        {
          defaultMessage: 'Transaction sample ID'
        }
      ),
      val: <TransactionLinkWrapper transaction={transaction} />,
      width: '25%'
    },
    {
      fieldName: USER_ID,
      label: i18n.translate('xpack.apm.errorGroupDetails.userIdLabel', {
        defaultMessage: 'User ID'
      }),
      val: idx(error, _ => _.user.id) || NOT_AVAILABLE_LABEL,
      width: '25%'
    }
  ];

  return <StickyProperties stickyProperties={stickyProperties} />;
}
