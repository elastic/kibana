/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { storiesOf } from '@storybook/react';
import React from 'react';
import { TransactionDurationAlertTrigger } from '.';

storiesOf('app/TransactionDurationAlertTrigger', module).add(
  'example',
  props => {
    const params = {
      threshold: 1500,
      aggregationType: 'avg' as const,
      window: '5m'
    };

    return (
      <div style={{ width: 400 }}>
        <TransactionDurationAlertTrigger
          alertParams={params as any}
          setAlertParams={() => undefined}
          setAlertProperty={() => undefined}
        />
      </div>
    );
  }
);
