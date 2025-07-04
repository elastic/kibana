/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiCommentList } from '@elastic/eui';
import { screen } from '@testing-library/react';
import { UserActionActions } from '../../../common/types/domain';

import { renderWithTestingProviders } from '../../common/mock';
import { getUserAction } from '../../containers/mock';
import { getMockBuilderArgs } from './mock';
import { createSettingsUserActionBuilder } from './settings';

jest.mock('../../common/lib/kibana');
jest.mock('../../common/navigation/hooks');

describe('createStatusUserActionBuilder ', () => {
  const builderArgs = getMockBuilderArgs();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const tests = [
    [false, 'disabled'],
    [true, 'enabled'],
  ];

  it.each(tests)(
    'renders correctly when changed setting sync-alerts to %s',
    async (syncAlerts, label) => {
      const userAction = getUserAction('settings', UserActionActions.update, {
        payload: { settings: { syncAlerts } },
      });
      const builder = createSettingsUserActionBuilder({
        ...builderArgs,
        userAction,
      });

      const createdUserAction = builder.build();
      renderWithTestingProviders(<EuiCommentList comments={createdUserAction} />);

      expect(screen.getByTestId('settings-update-action-settings-update')).toBeTruthy();
      expect(screen.getByText(`${label} sync alerts`)).toBeTruthy();
    }
  );
});
