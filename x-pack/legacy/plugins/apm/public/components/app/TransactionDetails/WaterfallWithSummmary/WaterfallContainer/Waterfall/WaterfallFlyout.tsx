/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { Location } from 'history';
import React from 'react';
import { SpanFlyout } from './SpanFlyout';
import { TransactionFlyout } from './TransactionFlyout';
import { IWaterfall } from './waterfall_helpers/waterfall_helpers';

interface Props {
  waterfallItemId?: string;
  waterfall: IWaterfall;
  location: Location;
  toggleFlyout: ({ location }: { location: Location }) => void;
}
export const WaterfallFlyout: React.FC<Props> = ({
  waterfallItemId,
  waterfall,
  location,
  toggleFlyout
}) => {
  const currentItem = waterfall.items.find(item => item.id === waterfallItemId);

  if (!currentItem) {
    return null;
  }

  switch (currentItem.docType) {
    case 'span':
      const parentTransaction =
        currentItem.parent?.docType === 'transaction'
          ? currentItem.parent.transaction
          : undefined;

      return (
        <SpanFlyout
          totalDuration={waterfall.duration}
          span={currentItem.span}
          parentTransaction={parentTransaction}
          onClose={() => toggleFlyout({ location })}
        />
      );
    case 'transaction':
      return (
        <TransactionFlyout
          transaction={currentItem.transaction}
          onClose={() => toggleFlyout({ location })}
          rootTransactionDuration={
            waterfall.rootTransaction?.transaction.duration.us
          }
          errorCount={currentItem.errorCount}
        />
      );
    default:
      return null;
  }
};
