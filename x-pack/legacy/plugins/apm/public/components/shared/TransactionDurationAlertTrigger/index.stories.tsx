/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { cloneDeep, merge } from 'lodash';
import { storiesOf } from '@storybook/react';
import React from 'react';
import { TransactionDurationAlertTrigger } from '.';
import {
  MockApmPluginContextWrapper,
  mockApmPluginContextValue
} from '../../../context/ApmPluginContext/MockApmPluginContext';
import { MockUrlParamsContextProvider } from '../../../context/UrlParamsContext/MockUrlParamsContextProvider';
import { ApmPluginContextValue } from '../../../context/ApmPluginContext';

storiesOf('app/TransactionDurationAlertTrigger', module).add(
  'example',
  context => {
    const params = {
      threshold: 1500,
      aggregationType: 'avg' as const,
      window: '5m'
    };

    const contextMock = (merge(cloneDeep(mockApmPluginContextValue), {
      core: {
        http: {
          get: () => {
            return Promise.resolve({ transactionTypes: ['request'] });
          }
        }
      }
    }) as unknown) as ApmPluginContextValue;

    return (
      <div style={{ width: 400 }}>
        <MockApmPluginContextWrapper value={contextMock}>
          <MockUrlParamsContextProvider>
            <TransactionDurationAlertTrigger
              alertParams={params as any}
              setAlertParams={() => undefined}
              setAlertProperty={() => undefined}
            />
          </MockUrlParamsContextProvider>
        </MockApmPluginContextWrapper>
      </div>
    );
  }
);
