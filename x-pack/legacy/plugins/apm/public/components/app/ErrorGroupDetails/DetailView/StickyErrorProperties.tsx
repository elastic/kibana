/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import React, { Fragment } from 'react';
import { idx } from '@kbn/elastic-idx';
import {
  ERROR_EXC_HANDLED,
  HTTP_REQUEST_METHOD,
  TRANSACTION_ID,
  URL_FULL,
  USER_ID
} from '../../../../../common/elasticsearch_fieldnames';
import { NOT_AVAILABLE_LABEL } from '../../../../../common/i18n';
import { APMError } from '../../../../../typings/es_schemas/ui/APMError';
import { Transaction } from '../../../../../typings/es_schemas/ui/Transaction';
<<<<<<< HEAD
import { APMLink } from '../../../shared/Links/APMLink';
import { legacyEncodeURIComponent } from '../../../shared/Links/url_helpers';
=======
>>>>>>> 7866872417... [APM] Move apm links into apm folder (#42118)
import { StickyProperties } from '../../../shared/StickyProperties';
import { TransactionLink } from '../../../shared/Links/apm/TransactionLink';

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

  const path = `/${
    transaction.service.name
  }/transactions/${legacyEncodeURIComponent(
    transaction.transaction.type
  )}/${legacyEncodeURIComponent(transaction.transaction.name)}`;

  return (
<<<<<<< HEAD
    <APMLink
      path={path}
      query={{
        transactionId: transaction.transaction.id,
        traceId: transaction.trace.id,
        banana: 'ok'
      }}
    >
=======
    <TransactionLink transaction={transaction}>
>>>>>>> 7866872417... [APM] Move apm links into apm folder (#42118)
      {transaction.transaction.id}
    </TransactionLink>
  );
}

export function StickyErrorProperties({ error, transaction }: Props) {
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
      fieldName: URL_FULL,
      label: 'URL',
      val:
        idx(error, _ => _.context.page.url) ||
        idx(error, _ => _.url.full) ||
        NOT_AVAILABLE_LABEL,
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
      val:
        String(idx(error, _ => _.error.exception[0].handled)) ||
        NOT_AVAILABLE_LABEL,
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
