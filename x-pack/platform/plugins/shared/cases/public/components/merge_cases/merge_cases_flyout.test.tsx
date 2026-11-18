/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { waitForEuiPopoverOpen } from '@elastic/eui/lib/test/rtl';
import type { MergeCasesPreviewResponse } from '../../../common/types/api';
import { CaseStatuses } from '../../../common/types/domain';
import { CASES_API_ERROR_CODES } from '../../../common/constants/error_codes';
import { noCreateCasesPermissions, renderWithTestingProviders } from '../../common/mock';
import { useCasesFeatures } from '../../common/use_cases_features';
import { basicCase } from '../../containers/mock';
import { useGetCases } from '../../containers/use_get_cases';
import { useGetMergeCasesPreview } from '../../containers/use_get_merge_cases_preview';
import { useBulkGetUserProfiles } from '../../containers/user_profiles/use_bulk_get_user_profiles';
import { MergeCasesFlyout } from './merge_cases_flyout';
import { buildMergePreview, mergePreviewCase, mergeSummary } from './mock';
import { useMergeCases } from './use_merge_cases';

jest.mock('../../common/lib/kibana');
jest.mock('../../common/navigation/hooks');
jest.mock('../../common/use_cases_features');
jest.mock('../../containers/use_get_cases');
jest.mock('../../containers/use_get_merge_cases_preview');
jest.mock('../../containers/user_profiles/use_bulk_get_user_profiles');
jest.mock('./use_merge_cases', () => ({
  ...jest.requireActual('./use_merge_cases'),
  useMergeCases: jest.fn(),
}));

const useCasesFeaturesMock = useCasesFeatures as jest.Mock;
const useGetCasesMock = useGetCases as jest.Mock;
const useGetMergeCasesPreviewMock = useGetMergeCasesPreview as jest.Mock;
const useBulkGetUserProfilesMock = useBulkGetUserProfiles as jest.Mock;
const useMergeCasesMock = useMergeCases as jest.Mock;

const mockPreview = (preview: MergeCasesPreviewResponse) => {
  useGetMergeCasesPreviewMock.mockImplementation(
    ({ caseIds, destinationCaseId }: { caseIds: string[]; destinationCaseId?: string }) => ({
      data: {
        ...preview,
        cases: preview.cases.filter(({ id }) => caseIds.includes(id)),
        destination: { id: destinationCaseId ?? null, isNew: destinationCaseId == null },
      },
      isLoading: false,
      isFetching: false,
    })
  );
};

const selectedCases = [
  { ...basicCase, id: 'case-1', incrementalId: 118, title: 'Phishing' },
  { ...basicCase, id: 'case-2', incrementalId: 119, title: 'Follow-up' },
];

describe('MergeCasesFlyout', () => {
  const mergeCases = jest.fn();
  const onClose = jest.fn();
  const onMerged = jest.fn();

  const renderFlyout = (options?: Parameters<typeof renderWithTestingProviders>[1]) =>
    renderWithTestingProviders(
      <MergeCasesFlyout
        initialCases={selectedCases}
        origin="list"
        onClose={onClose}
        onMerged={onMerged}
      />,
      options
    );

  const resolveTitle = async () => {
    await userEvent.click(screen.getByTestId('merge-cases-field-title-use-suggestion'));
  };

  beforeEach(() => {
    jest.clearAllMocks();
    useCasesFeaturesMock.mockReturnValue({
      isSyncAlertsEnabled: false,
      caseAssignmentAuthorized: false,
    });
    useBulkGetUserProfilesMock.mockReturnValue({ data: new Map(), isLoading: false });
    useGetCasesMock.mockReturnValue({ data: { cases: [] }, isFetching: false });
    useMergeCasesMock.mockReturnValue({ mutate: mergeCases, isLoading: false });
    mockPreview(buildMergePreview());
  });

  it('blocks the merge until every conflict is resolved', async () => {
    renderFlyout();

    expect(screen.getByTestId('merge-cases-blocking-reason')).toHaveTextContent(
      'Resolve 1 conflict to merge'
    );
    expect(screen.getByTestId('merge-cases-conflicts-badge')).toHaveTextContent(
      '1 conflict to resolve'
    );
    expect(screen.getByTestId('merge-cases-submit')).toBeDisabled();
    expect(screen.getByTestId('merge-cases-field-title-provenance')).toHaveTextContent(
      'Suggested: From #118'
    );

    await resolveTitle();

    expect(screen.getByTestId('merge-cases-no-conflicts')).toHaveTextContent('Conflicts resolved');
    expect(screen.getByTestId('merge-cases-field-title-resolved')).toBeInTheDocument();
    expect(screen.getByTestId('merge-cases-summary')).toHaveTextContent(
      'Copies 5 attachments into the new case. Closes 2 cases.'
    );
    expect(screen.getByTestId('merge-cases-submit')).not.toBeDisabled();
  });

  it('resolves a conflict by picking another case value', async () => {
    renderFlyout();

    await userEvent.click(screen.getByTestId('merge-cases-field-title-conflict-trigger'));
    await waitForEuiPopoverOpen();
    await userEvent.click(
      screen.getByText('Follow-up', { selector: '.euiSelectableListItem__text' })
    );

    expect(screen.getByTestId('merge-cases-field-title-value')).toHaveTextContent('Follow-up');
    expect(screen.queryByTestId('merge-cases-blocking-reason')).not.toBeInTheDocument();
  });

  it('announces the footer status to screen readers', () => {
    renderFlyout();

    expect(screen.getByTestId('merge-cases-footer-status')).toHaveAttribute('role', 'status');
  });

  it('opens the listed cases in a new tab so the merge stays open', () => {
    renderFlyout();

    for (const link of within(screen.getByTestId('merge-cases-table')).getAllByRole('link')) {
      expect(link).toHaveAttribute('target', '_blank');
    }
  });

  it('sends only the fields the user acted on, with the destination and options', async () => {
    renderFlyout();
    await userEvent.click(screen.getByTestId('merge-cases-destination'));
    await waitForEuiPopoverOpen();
    await userEvent.click(screen.getByTestId('merge-cases-destination-case-1'));
    await resolveTitle();
    await userEvent.click(screen.getByTestId('merge-cases-close-sources'));
    await userEvent.click(screen.getByTestId('merge-cases-add-note'));
    await userEvent.type(screen.getByTestId('merge-cases-note'), '  Same campaign  ');
    await userEvent.click(screen.getByTestId('merge-cases-submit'));

    expect(mergeCases).toHaveBeenCalledWith(
      {
        request: {
          caseIds: ['case-1', 'case-2'],
          destinationCaseId: 'case-1',
          fields: { title: 'Phishing' },
          closeSources: false,
          note: 'Same campaign',
        },
        origin: 'list',
      },
      expect.objectContaining({ onSuccess: onMerged })
    );
  });

  it('counts only the open sources it would close', async () => {
    useGetMergeCasesPreviewMock.mockImplementation(() => ({
      data: {
        ...buildMergePreview({ conflicts: [] }),
        cases: [
          mergePreviewCase('case-1', 118, 'Phishing'),
          mergePreviewCase('case-2', 119, 'Follow-up', { status: CaseStatuses.closed }),
        ],
      },
      isLoading: false,
      isFetching: false,
    }));

    renderFlyout();

    expect(screen.getByText('Close the source case')).toBeInTheDocument();
    expect(screen.getByTestId('merge-cases-summary')).toHaveTextContent('Closes 1 case.');
  });

  it('lets the user leave alerts out of an over-limit merge from its row', async () => {
    const alertChoice = (key: string, ruleId: string, ruleName: string) => ({
      key,
      sourceCaseId: 'case-1',
      alertId: key,
      index: 'alerts-index',
      ruleId,
      ruleName,
      addedAt: '2024-01-01T00:00:00.000Z',
    });
    mockPreview(
      buildMergePreview({
        conflicts: [],
        attachments: {
          alerts: { ...mergeSummary({ total: 3, toCopy: 3, max: 2, overBy: 1 }), byRule: [] },
          other: mergeSummary(),
        },
        choices: {
          alerts: [
            alertChoice('alert-1', 'rule-1', 'Phishing rule'),
            alertChoice('alert-2', 'rule-1', 'Phishing rule'),
            alertChoice('alert-3', 'rule-2', 'Malware rule'),
          ],
          events: [],
          attacks: [],
          observables: [],
          other: [],
        },
      })
    );

    renderFlyout();

    expect(screen.getByTestId('merge-cases-blocking-reason')).toHaveTextContent(
      'Leave out 1 alert to merge'
    );

    await userEvent.click(screen.getByTestId('merge-cases-attachments-alerts-choose'));
    expect(await screen.findByTestId('merge-attachments-modal')).toBeInTheDocument();
    await userEvent.click(screen.getByTestId('merge-choices-rule-rule:rule-2-checkbox'));
    expect(screen.getByTestId('merge-choices-alerts-status')).toHaveTextContent(
      'Within the limit.'
    );
    await userEvent.click(screen.getByTestId('merge-choices-apply'));

    expect(screen.getByTestId('merge-cases-attachments-alerts')).toHaveTextContent(
      '2 to copy · 1 left out'
    );

    await userEvent.click(screen.getByTestId('merge-cases-submit'));

    expect(mergeCases).toHaveBeenCalledWith(
      expect.objectContaining({
        request: expect.objectContaining({
          attachments: { alerts: { mode: 'exclude', keys: ['alert-3'] } },
        }),
      }),
      expect.anything()
    );
  });

  it('reports what the merge leaves out on its own', () => {
    mockPreview(
      buildMergePreview({
        conflicts: [],
        attachments: {
          alerts: {
            ...mergeSummary({
              total: 3,
              toCopy: 2,
              max: 1000,
              notCopied: [{ reason: 'alertCaseLimit', count: 1 }],
            }),
            byRule: [],
          },
        },
      })
    );

    renderFlyout();

    expect(screen.getByTestId('merge-cases-attachments-alerts-not-copied')).toHaveTextContent(
      '1 alert is already in 10 cases and stays on the source cases.'
    );
  });

  it('blocks the merge when only one case is left', async () => {
    renderFlyout();
    await userEvent.click(screen.getByTestId('merge-cases-remove-case-2'));

    expect(screen.getByTestId('merge-cases-blocking-reason')).toHaveTextContent(
      'Add another case to merge'
    );
    expect(screen.getByTestId('merge-cases-submit')).toBeDisabled();
  });

  it('asks before discarding changes', async () => {
    renderFlyout();
    await resolveTitle();
    await userEvent.click(screen.getByTestId('merge-cases-cancel'));

    expect(screen.getByTestId('cancel-creation-confirmation-modal')).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();

    await userEvent.click(screen.getByText('Discard'));
    expect(onClose).toHaveBeenCalled();
  });

  it('closes without asking when nothing changed', async () => {
    renderFlyout();
    await userEvent.click(screen.getByTestId('merge-cases-cancel'));

    expect(onClose).toHaveBeenCalled();
  });

  it('merges into an open case when the user cannot create cases', () => {
    renderFlyout({ wrapperProps: { permissions: noCreateCasesPermissions() } });

    expect(screen.getByTestId('merge-cases-destination')).toHaveTextContent('#118 Phishing');
  });

  it('asks the user to review what the server refused', async () => {
    mergeCases.mockImplementation((_variables, { onError }) =>
      onError({
        body: {
          attributes: {
            code: CASES_API_ERROR_CODES.MERGE_BLOCKED,
            conflicts: [{ field: 'title', reason: 'differentValues' }],
            limits: [],
          },
        },
      })
    );

    renderFlyout();
    await resolveTitle();
    await userEvent.click(screen.getByTestId('merge-cases-submit'));

    expect(screen.getByTestId('merge-cases-changed-callout')).toBeInTheDocument();
    expect(screen.getByTestId('merge-cases-blocking-reason')).toHaveTextContent(
      'Resolve 1 conflict to merge'
    );
  });
});
