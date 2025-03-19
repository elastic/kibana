/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type {
  LogsOverviewProps,
  SelfContainedLogsOverviewComponent,
  SelfContainedLogsOverviewHelpers,
} from './logs_overview';

export const createLogsOverviewMock = () => {
  const LogsOverviewMock = jest.fn(LogsOverviewMockImpl) as unknown as ILogsOverviewMock;

  LogsOverviewMock.useIsEnabled = jest.fn(() => true);

  LogsOverviewMock.ErrorContent = jest.fn(() => <div />);

  LogsOverviewMock.LoadingContent = jest.fn(() => <div />);

  return LogsOverviewMock;
};

const LogsOverviewMockImpl = (_props: LogsOverviewProps) => {
  return <div />;
};

type ILogsOverviewMock = jest.Mocked<SelfContainedLogsOverviewComponent> &
  jest.Mocked<SelfContainedLogsOverviewHelpers>;
