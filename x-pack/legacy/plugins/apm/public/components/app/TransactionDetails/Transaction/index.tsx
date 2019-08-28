/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSpacer,
  EuiTitle,
  EuiToolTip
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { Location } from 'history';
import React from 'react';
import { Transaction as ITransaction } from '../../../../../typings/es_schemas/ui/Transaction';
import { IUrlParams } from '../../../../context/UrlParamsContext/types';
import { TransactionDetailLink } from '../../../shared/Links/apm/TransactionDetailLink';
import { TransactionActionMenu } from '../../../shared/TransactionActionMenu/TransactionActionMenu';
import { StickyTransactionProperties } from './StickyTransactionProperties';
import { TransactionTabs } from './TransactionTabs';
import { IWaterfall } from './WaterfallContainer/Waterfall/waterfall_helpers/waterfall_helpers';

function MaybeViewTraceLink({
  transaction,
  waterfall
}: {
  transaction: ITransaction;
  waterfall: IWaterfall;
}) {
  const viewFullTraceButtonLabel = i18n.translate(
    'xpack.apm.transactionDetails.viewFullTraceButtonLabel',
    {
      defaultMessage: 'View full trace'
    }
  );

  // the traceroot cannot be found, so we cannot link to it
  if (!waterfall.traceRoot) {
    return (
      <EuiFlexItem grow={false}>
        <EuiToolTip
          content={i18n.translate(
            'xpack.apm.transactionDetails.noTraceParentButtonTooltip',
            {
              defaultMessage: 'The trace parent cannot be found'
            }
          )}
        >
          <EuiButton iconType="apmTrace" disabled={true}>
            {viewFullTraceButtonLabel}
          </EuiButton>
        </EuiToolTip>
      </EuiFlexItem>
    );
  }

  const isRoot =
    transaction.transaction.id === waterfall.traceRoot.transaction.id;

  // the user is already viewing the full trace, so don't link to it
  if (isRoot) {
    return (
      <EuiFlexItem grow={false}>
        <EuiToolTip
          content={i18n.translate(
            'xpack.apm.transactionDetails.viewingFullTraceButtonTooltip',
            {
              defaultMessage: 'Currently viewing the full trace'
            }
          )}
        >
          <EuiButton iconType="apmTrace" disabled={true}>
            {viewFullTraceButtonLabel}
          </EuiButton>
        </EuiToolTip>
      </EuiFlexItem>
    );

    // the user is viewing a zoomed in version of the trace. Link to the full trace
  } else {
    const traceRoot = waterfall.traceRoot;
    return (
      <EuiFlexItem grow={false}>
        <TransactionDetailLink
          serviceName={traceRoot.service.name}
          transactionId={traceRoot.transaction.id}
          traceId={traceRoot.trace.id}
          transactionName={traceRoot.transaction.name}
          transactionType={traceRoot.transaction.type}
        >
          <EuiButton iconType="apmTrace">{viewFullTraceButtonLabel}</EuiButton>
        </TransactionDetailLink>
      </EuiFlexItem>
    );
  }
}

interface Props {
  transaction: ITransaction;
  urlParams: IUrlParams;
  location: Location;
  waterfall: IWaterfall;
  exceedsMax: boolean;
}

export const Transaction: React.SFC<Props> = ({
  transaction,
  urlParams,
  location,
  waterfall,
  exceedsMax
}) => {
  return (
    <EuiPanel paddingSize="m">
      <EuiFlexGroup justifyContent="spaceBetween">
        <EuiFlexItem>
          <EuiTitle size="xs">
            <h5>
              {i18n.translate(
                'xpack.apm.transactionDetails.transactionSampleTitle',
                {
                  defaultMessage: 'Transaction sample'
                }
              )}
            </h5>
          </EuiTitle>
        </EuiFlexItem>

        <EuiFlexItem>
          <EuiFlexGroup justifyContent="flexEnd">
            <EuiFlexItem grow={false}>
              <TransactionActionMenu transaction={transaction} />
            </EuiFlexItem>
            <MaybeViewTraceLink
              transaction={transaction}
              waterfall={waterfall}
            />
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>

      <StickyTransactionProperties
        errorCount={
          waterfall.errorCountByTransactionId[transaction.transaction.id]
        }
        transaction={transaction}
        totalDuration={waterfall.traceRootDuration}
      />

      <EuiSpacer />

      <TransactionTabs
        transaction={transaction}
        location={location}
        urlParams={urlParams}
        waterfall={waterfall}
        exceedsMax={exceedsMax}
      />
    </EuiPanel>
  );
};
