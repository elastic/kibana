/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiCommentList } from '@elastic/eui';
import { screen } from '@testing-library/react';

import { getUserAction } from '../../containers/mock';
import { renderWithTestingProviders } from '../../common/mock';
import { createSyncUserActionBuilder } from './sync';
import { getMockBuilderArgs } from './mock';
import { UserActionActions } from '../../../common/types/domain';

jest.mock('../../common/lib/kibana');
jest.mock('../../common/navigation/hooks');

describe('createSyncUserActionBuilder', () => {
  const builderArgs = getMockBuilderArgs();

  it('renders the updated fields and a link to the external incident', () => {
    const userAction = getUserAction('sync', UserActionActions.update);
    const builder = createSyncUserActionBuilder({ ...builderArgs, userAction });

    renderWithTestingProviders(<EuiCommentList comments={builder.build()} />);

    expect(screen.getByTestId('sync-label')).toHaveTextContent(
      'updated title, status from My SN connector'
    );
    expect(screen.getByTestId('sync-external-link')).toHaveAttribute('href', 'basicPush.com');
  });

  it('renders the kept fields when the case value won a conflict', () => {
    const userAction = getUserAction('sync', UserActionActions.update, {
      payload: {
        sync: {
          connectorName: 'My SN connector',
          externalId: 'external_id',
          externalTitle: 'INC01',
          externalUrl: 'basicPush.com',
          updatedFields: ['status'],
          conflictedFields: ['description'],
        },
      },
    });
    const builder = createSyncUserActionBuilder({ ...builderArgs, userAction });

    renderWithTestingProviders(<EuiCommentList comments={builder.build()} />);

    expect(screen.getByTestId('sync-label')).toHaveTextContent(
      'updated status from My SN connector, kept description changed in Kibana'
    );
  });

  it('renders a no-change entry when nothing was applied', () => {
    const userAction = getUserAction('sync', UserActionActions.update, {
      payload: {
        sync: {
          connectorName: 'My SN connector',
          externalId: 'external_id',
          externalTitle: 'INC01',
          externalUrl: 'basicPush.com',
          updatedFields: [],
          conflictedFields: [],
        },
      },
    });
    const builder = createSyncUserActionBuilder({ ...builderArgs, userAction });

    renderWithTestingProviders(<EuiCommentList comments={builder.build()} />);

    expect(screen.getByTestId('sync-label')).toHaveTextContent(
      'checked My SN connector, nothing to update'
    );
  });
});
