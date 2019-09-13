/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiHorizontalRule,
  EuiPortal,
  EuiSpacer,
  EuiTitle
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { Transaction } from '../../../../../../../../typings/es_schemas/ui/Transaction';
import { TransactionActionMenu } from '../../../../../../shared/TransactionActionMenu/TransactionActionMenu';
import { StickyTransactionProperties } from '../../../StickyTransactionProperties';
import { FlyoutTopLevelProperties } from '../FlyoutTopLevelProperties';
import { ResponsiveFlyout } from '../ResponsiveFlyout';
import { TransactionMetadata } from '../../../../../../shared/MetadataTable/TransactionMetadata';
import { DroppedSpansWarning } from './DroppedSpansWarning';

interface Props {
  onClose: () => void;
  transaction?: Transaction;
  errorCount: number;
  traceRootDuration?: number;
}

function TransactionPropertiesTable({
  transaction
}: {
  transaction: Transaction;
}) {
  return (
    <div>
      <EuiTitle size="s">
        <h4>Metadata</h4>
      </EuiTitle>
      <EuiSpacer />
      <TransactionMetadata transaction={transaction} />
    </div>
  );
}

export function TransactionFlyout({
  transaction: transactionDoc,
  onClose,
  errorCount,
  traceRootDuration
}: Props) {
  if (!transactionDoc) {
    return null;
  }

  return (
    <EuiPortal>
      <ResponsiveFlyout onClose={onClose} ownFocus={true} maxWidth={false}>
        <EuiFlyoutHeader hasBorder>
          <EuiFlexGroup>
            <EuiFlexItem grow={false}>
              <EuiTitle>
                <h4>
                  {i18n.translate(
                    'xpack.apm.transactionDetails.transFlyout.transactionDetailsTitle',
                    {
                      defaultMessage: 'Transaction details'
                    }
                  )}
                </h4>
              </EuiTitle>
            </EuiFlexItem>

            <EuiFlexItem grow={false}>
              <TransactionActionMenu transaction={transactionDoc} />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlyoutHeader>
        <EuiFlyoutBody>
          <FlyoutTopLevelProperties transaction={transactionDoc} />
          <EuiHorizontalRule />
          <StickyTransactionProperties
            errorCount={errorCount}
            transaction={transactionDoc}
            totalDuration={traceRootDuration}
          />
          <EuiHorizontalRule />
          <DroppedSpansWarning transactionDoc={transactionDoc} />
          <TransactionPropertiesTable transaction={transactionDoc} />
        </EuiFlyoutBody>
      </ResponsiveFlyout>
    </EuiPortal>
  );
}
