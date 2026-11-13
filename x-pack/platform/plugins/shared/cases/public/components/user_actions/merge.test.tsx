/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiCommentList } from '@elastic/eui';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { UserActionActions, UserActionTypes } from '../../../common/types/domain';
import { renderWithTestingProviders } from '../../common/mock';
import { basicCase, getUserAction } from '../../containers/mock';
import { getMockBuilderArgs } from './mock';
import { createMergeUserActionBuilder } from './merge';

jest.mock('../../common/lib/kibana');
jest.mock('../../common/navigation/hooks');

const mergePayload = (destinationId: string) => ({
  merge: {
    destination: { id: destinationId, title: 'Phishing campaign', incrementalId: 142 },
    sources: [
      {
        id: 'case-118',
        title: 'Phishing email',
        incrementalId: 118,
        copied: { alerts: 2, events: 1, observables: 0, other: 0 },
      },
      {
        id: 'case-121',
        title: 'Suspicious link',
        incrementalId: null,
        copied: { alerts: 1, events: 0, observables: 3, other: 1 },
      },
    ],
    closedSources: true,
  },
});

describe('createMergeUserActionBuilder', () => {
  const renderUserAction = (destinationId: string) => {
    const userAction = getUserAction(UserActionTypes.merge, UserActionActions.update, {
      type: UserActionTypes.merge,
      payload: mergePayload(destinationId),
    });
    const comments = createMergeUserActionBuilder({
      ...getMockBuilderArgs(),
      caseData: basicCase,
      userAction,
    }).build();

    renderWithTestingProviders(<EuiCommentList comments={comments} />);
  };

  it('lists the merged cases on the destination', async () => {
    renderUserAction(basicCase.id);

    expect(screen.getByTestId('merge-user-action-destination')).toHaveTextContent(
      'merged #118, Suspicious link into this case'
    );

    await userEvent.click(screen.getByTestId('merge-user-action-details-button'));

    expect(await screen.findByTestId('merge-user-action-details')).toHaveTextContent(
      '#118: 2 alerts, 1 event, 0 observables, 0 other attachments'
    );
    expect(screen.getByTestId('merge-user-action-details')).toHaveTextContent(
      'Suspicious link: 1 alert, 0 events, 3 observables, 1 other attachment'
    );
  });

  it('links to the destination on an original case', () => {
    renderUserAction('destination-id');

    expect(screen.getByTestId('merge-user-action-original')).toHaveTextContent(
      'merged this case into #142'
    );
    expect(screen.queryByTestId('merge-user-action-destination')).not.toBeInTheDocument();
  });
});
