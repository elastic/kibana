/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FunctionComponent } from 'react';
import React from 'react';

import type { DataSourceConnectionTestResult } from '../../common';
import { createDataSourceFlyoutStrings } from './create_data_source_flyout_i18n';
import { FlyoutCallout, type FlyoutCalloutProps } from './flyout_callout';

export interface ConnectionTestCalloutProps {
  result: DataSourceConnectionTestResult;
}

const getCalloutProps = (result: DataSourceConnectionTestResult): FlyoutCalloutProps => {
  switch (result.status) {
    case 'success':
      return {
        variant: 'success',
        title: createDataSourceFlyoutStrings.testConnectionSuccessTitle,
        message: createDataSourceFlyoutStrings.testConnectionSuccessMessage,
        'data-test-subj': 'createDataSourceFlyoutTestConnectionSuccess',
      };
    case 'failure':
      return {
        variant: 'danger',
        title: createDataSourceFlyoutStrings.testConnectionFailureTitle,
        message: result.error ?? createDataSourceFlyoutStrings.testConnectionFailureMessage,
        'data-test-subj': 'createDataSourceFlyoutTestConnectionFailure',
      };
    // A status Elasticsearch adds later is neither a pass nor a failure to this UI.
    case 'untestable':
    default:
      return {
        variant: 'warning',
        title: createDataSourceFlyoutStrings.testConnectionUntestableTitle,
        message: result.message ?? createDataSourceFlyoutStrings.testConnectionUntestableMessage,
        'data-test-subj': 'createDataSourceFlyoutTestConnectionUntestable',
      };
  }
};

/** Outcome of the last connection test, shown above the flyout actions. */
export const ConnectionTestCallout: FunctionComponent<ConnectionTestCalloutProps> = ({
  result,
}) => <FlyoutCallout {...getCalloutProps(result)} />;
