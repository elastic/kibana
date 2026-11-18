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
import type { MergeCounts, MergePayload, MergeSource } from '../../../common/types/domain';
import { UserActionActions, UserActionTypes } from '../../../common/types/domain';
import { renderWithTestingProviders } from '../../common/mock';
import { basicCase, getUserAction } from '../../containers/mock';
import { getMockBuilderArgs } from './mock';
import { createMergeUserActionBuilder } from './merge';

jest.mock('../../common/lib/kibana');
jest.mock('../../common/navigation/hooks');

const noCounts: MergeCounts = { alerts: 0, events: 0, attacks: 0, observables: 0, other: 0 };

type SourceDetails = Partial<
  Pick<MergeSource, 'copied' | 'existing' | 'leftOut' | 'outcome' | 'closed'>
>;

const mergePayload = (
  [firstSource, secondSource]: [SourceDetails, SourceDetails] = [
    { copied: { ...noCounts, alerts: 2, events: 1 } },
    {
      copied: { ...noCounts, alerts: 1, observables: 3, other: 1, attacks: 1 },
      existing: { ...noCounts, alerts: 1 },
    },
  ]
): { merge: MergePayload } => {
  const source = (
    id: string,
    title: string,
    incrementalId: number | null,
    details: SourceDetails
  ): MergeSource => ({
    id,
    title,
    incrementalId,
    outcome: 'merged',
    closed: true,
    copied: noCounts,
    existing: noCounts,
    leftOut: noCounts,
    ...details,
  });

  return {
    merge: {
      destination: { id: basicCase.id, title: 'Phishing campaign', incrementalId: 142 },
      sources: [
        source('case-118', 'Phishing email', 118, firstSource),
        source('case-121', 'Suspicious link', null, secondSource),
      ],
      updatedFields: [],
      notCopiedFields: [],
    },
  };
};

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

  it('lists the merged cases as a list, and what each case copied', async () => {
    renderUserAction();

    expect(screen.getByTestId('merge-user-action-destination')).toHaveTextContent(
      /^merged #118 and Suspicious link into this case$/
    );

    await userEvent.click(screen.getByTestId('merge-user-action-details-button'));

    const firstSource = await screen.findByTestId('merge-user-action-details-case-118');
    expect(firstSource).toHaveTextContent('#118');
    expect(firstSource).toHaveTextContent('New: 2 alerts, 1 event');
    expect(firstSource).toHaveTextContent('Closed by the merge');
    expect(firstSource).not.toHaveTextContent('Already in this case');

    const secondSource = screen.getByTestId('merge-user-action-details-case-121');
    expect(secondSource).toHaveTextContent('Suspicious link');
    expect(secondSource).toHaveTextContent(
      'New: 1 alert, 1 attack, 3 observables, 1 other attachment'
    );
    expect(secondSource).toHaveTextContent('Already in this case: 1 alert');
  });

  it('shows what stayed on each source case', async () => {
    renderUserAction(
      mergePayload([
        { copied: { ...noCounts, alerts: 900 }, leftOut: { ...noCounts, alerts: 240 } },
        { copied: { ...noCounts, alerts: 100 } },
      ])
    );

    await userEvent.click(screen.getByTestId('merge-user-action-details-button'));

    expect(await screen.findByTestId('merge-user-action-details-case-118')).toHaveTextContent(
      'Left out, still on the source case: 240 alerts'
    );
    expect(screen.getByTestId('merge-user-action-details-case-121')).not.toHaveTextContent(
      'Left out'
    );
  });

  it('names only the merged sources and marks the one that was not merged', async () => {
    renderUserAction(
      mergePayload([
        { copied: { ...noCounts, alerts: 1 } },
        { copied: noCounts, outcome: 'notMerged', closed: false },
      ])
    );

    expect(screen.getByTestId('merge-user-action-destination')).toHaveTextContent(
      /^merged #118 into this case$/
    );

    await userEvent.click(screen.getByTestId('merge-user-action-details-button'));

    expect(
      await screen.findByTestId('merge-user-action-details-case-121-not-merged')
    ).toBeInTheDocument();
  });

  it('lists the fields the merge changed and the template fields it did not copy', async () => {
    const { merge } = mergePayload();
    renderUserAction({
      merge: {
        ...merge,
        updatedFields: [
          { field: 'title' },
          { field: 'extendedFields', key: 'verdict_as_keyword', label: 'Verdict' },
        ],
        notCopiedFields: [{ key: 'region_as_keyword', label: 'Region' }],
      },
    });

    await userEvent.click(screen.getByTestId('merge-user-action-details-button'));

    expect(await screen.findByTestId('merge-user-action-details-updated-fields')).toHaveTextContent(
      'Changed on this case: title, Verdict'
    );
    expect(screen.getByTestId('merge-user-action-details-not-copied-fields')).toHaveTextContent(
      'Template fields not copied: Region'
    );
  });

  it('links to the destination on a source case', () => {
    const { merge } = mergePayload();
    renderUserAction({
      merge: { ...merge, destination: { ...merge.destination, id: 'destination-id' } },
    });

    expect(screen.getByTestId('merge-user-action-source')).toHaveTextContent(
      'merged this case into #142'
    );
    expect(screen.queryByTestId('merge-user-action-destination')).not.toBeInTheDocument();
    expect(
      screen.getByRole('link', {
        name: 'click to visit case with title Phishing campaign in a new tab',
      })
    ).toHaveAttribute('target', '_blank');
  });

  it('does not list changed fields when the merge changed none', async () => {
    renderUserAction();

    await userEvent.click(screen.getByTestId('merge-user-action-details-button'));

    expect(await screen.findByTestId('merge-user-action-details')).toBeInTheDocument();
    expect(
      screen.queryByTestId('merge-user-action-details-updated-fields')
    ).not.toBeInTheDocument();
  });
});
