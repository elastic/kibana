/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiCommentList } from '@elastic/eui';
import { screen } from '@testing-library/react';
import { CaseSeverity, UserActionActions } from '../../../common/types/domain';
import React from 'react';

import { renderWithTestingProviders } from '../../common/mock';
import { getUserAction } from '../../containers/mock';
import { getMockBuilderArgs } from './mock';
import { createSeverityUserActionBuilder } from './severity';

jest.mock('../../common/lib/kibana');
jest.mock('../../common/navigation/hooks');

const builderArgs = getMockBuilderArgs();
describe('createSeverityUserActionBuilder', () => {
  it('renders correctly', () => {
    const userAction = getUserAction('severity', UserActionActions.update, {
      payload: { severity: CaseSeverity.LOW },
    });
    const builder = createSeverityUserActionBuilder({
      ...builderArgs,
      userAction,
    });
    const createdUserAction = builder.build();

    renderWithTestingProviders(<EuiCommentList comments={createdUserAction} />);
    expect(screen.getByTestId('severity-update-user-action-severity-title')).toBeTruthy();
    expect(screen.getByTestId('severity-update-user-action-severity-title-low')).toBeTruthy();
  });
});
