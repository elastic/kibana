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
import type { MergeCopiedTotals, MergePayload } from '../../../common/types/domain';
import { UserActionActions, UserActionTypes } from '../../../common/types/domain';
import { renderWithTestingProviders } from '../../common/mock';
import { basicCase, getUserAction } from '../../containers/mock';
import { getMockBuilderArgs } from './mock';
import { createMergeUserActionBuilder } from './merge';

jest.mock('../../common/lib/kibana');
jest.mock('../../common/navigation/hooks');

const noCounts = { alerts: 0, events: 0, observables: 0, other: 0 };

interface SourceCounts {
  copied: MergeCopiedTotals;
  duplicates?: MergeCopiedTotals;
  excluded?: MergeCopiedTotals;
}

const mergePayload = (
  [firstSource, secondSource]: [SourceCounts, SourceCounts] = [
    { copied: { alerts: 2, events: 1, observables: 0, other: 0 }, duplicates: noCounts },
    {
      copied: { alerts: 1, events: 0, observables: 3, other: 1 },
      duplicates: { ...noCounts, alerts: 1 },
    },
  ]
): { merge: MergePayload } => ({
  merge: {
    destination: { id: basicCase.id, title: 'Phishing campaign', incrementalId: 142 },
    sources: [
      { id: 'case-118', title: 'Phishing email', incrementalId: 118, ...firstSource },
      { id: 'case-121', title: 'Suspicious link', incrementalId: null, ...secondSource },
    ],
    closedSources: true,
  },
});

describe('createMergeUserActionBuilder', () => {
  const renderUserAction = (payload = mergePayload()) => {
    const userAction = getUserAction(UserActionTypes.merge, UserActionActions.update, {
      type: UserActionTypes.merge,
      payload,
    });
    const comments = createMergeUserActionBuilder({
      ...getMockBuilderArgs(),
      caseData: basicCase,
      userAction,
    }).build();

    renderWithTestingProviders(<EuiCommentList comments={comments} />);
  };

  it('lists the merged cases and who merged them, and what each case copied', async () => {
    renderUserAction();

    expect(screen.getByTestId('merge-user-action-destination')).toHaveTextContent(
      /^Cases #118, Suspicious link merged into this case by Leslie Knope$/
    );
    expect(screen.getAllByText('Leslie Knope')).toHaveLength(1);

    await userEvent.click(screen.getByTestId('merge-user-action-details-button'));

    const firstSource = await screen.findByTestId('merge-user-action-details-case-118');
    expect(firstSource).toHaveTextContent('#118');
    expect(firstSource).toHaveTextContent('New: 2 alerts, 1 event');
    expect(firstSource).not.toHaveTextContent('Already in this case');

    const secondSource = screen.getByTestId('merge-user-action-details-case-121');
    expect(secondSource).toHaveTextContent('Suspicious link');
    expect(secondSource).toHaveTextContent('New: 1 alert, 3 observables, 1 other attachment');
    expect(secondSource).toHaveTextContent('Already in this case: 1 alert');
  });

  it('shows a case that added nothing new and what this case already had', async () => {
    renderUserAction(
      mergePayload([
        { copied: { ...noCounts, alerts: 7, observables: 23 }, duplicates: noCounts },
        { copied: noCounts, duplicates: { ...noCounts, alerts: 7, observables: 23 } },
      ])
    );

    await userEvent.click(screen.getByTestId('merge-user-action-details-button'));

    const secondSource = await screen.findByTestId('merge-user-action-details-case-121');
    expect(secondSource).toHaveTextContent('New: none');
    expect(secondSource).toHaveTextContent('Already in this case: 7 alerts, 23 observables');
  });

  it('shows what the user left on each case', async () => {
    renderUserAction(
      mergePayload([
        { copied: { ...noCounts, alerts: 900 }, excluded: { ...noCounts, alerts: 240 } },
        { copied: { ...noCounts, alerts: 100 }, excluded: noCounts },
      ])
    );

    await userEvent.click(screen.getByTestId('merge-user-action-details-button'));

    expect(await screen.findByTestId('merge-user-action-details-case-118')).toHaveTextContent(
      'Left out, still on the original case: 240 alerts'
    );
    expect(screen.getByTestId('merge-user-action-details-case-121')).not.toHaveTextContent(
      'Left out'
    );
  });

  it('shows only what was copied when the merge did not record duplicates', async () => {
    renderUserAction(mergePayload([{ copied: { ...noCounts, alerts: 1 } }, { copied: noCounts }]));

    await userEvent.click(screen.getByTestId('merge-user-action-details-button'));

    expect(await screen.findByTestId('merge-user-action-details-case-118')).toHaveTextContent(
      'New: 1 alert'
    );
    expect(screen.getByTestId('merge-user-action-details')).not.toHaveTextContent(
      'Already in this case'
    );
  });

  it('names a single merged case', () => {
    const { merge } = mergePayload();
    renderUserAction({ merge: { ...merge, sources: [merge.sources[0]] } });

    expect(screen.getByTestId('merge-user-action-destination')).toHaveTextContent(
      /^Case #118 merged into this case by Leslie Knope$/
    );
  });

  it('lists the fields the merge changed on this case', async () => {
    const { merge } = mergePayload();
    renderUserAction({ merge: { ...merge, updatedFields: ['title', 'tags'] } });

    await userEvent.click(screen.getByTestId('merge-user-action-details-button'));

    expect(await screen.findByTestId('merge-user-action-details-updated-fields')).toHaveTextContent(
      'Changed on this case: title, tags'
    );
  });

  it('links to the destination on an original case', () => {
    const { merge } = mergePayload();
    renderUserAction({
      merge: { ...merge, destination: { ...merge.destination, id: 'destination-id' } },
    });

    expect(screen.getByTestId('merge-user-action-original')).toHaveTextContent(
      'merged this case into #142'
    );
    expect(screen.queryByTestId('merge-user-action-destination')).not.toBeInTheDocument();
    expect(
      screen.getByRole('link', {
        name: 'click to visit case with title Phishing campaign in a new tab',
      })
    ).toHaveAttribute('target', '_blank');
  });

  it('does not list changed fields when the merge changed none or did not record them', async () => {
    renderUserAction();

    await userEvent.click(screen.getByTestId('merge-user-action-details-button'));

    expect(await screen.findByTestId('merge-user-action-details')).toBeInTheDocument();
    expect(
      screen.queryByTestId('merge-user-action-details-updated-fields')
    ).not.toBeInTheDocument();
  });
});
