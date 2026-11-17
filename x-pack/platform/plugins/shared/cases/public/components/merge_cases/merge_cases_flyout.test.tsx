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
import { CaseSeverity, CaseStatuses } from '../../../common/types/domain';
import { renderWithTestingProviders } from '../../common/mock';
import { useCasesFeatures } from '../../common/use_cases_features';
import { basicCase } from '../../containers/mock';
import { useGetMergeCasesPreview } from '../../containers/use_get_merge_cases_preview';
import { useBulkGetUserProfiles } from '../../containers/user_profiles/use_bulk_get_user_profiles';
import { MergeCasesFlyout } from './merge_cases_flyout';
import { useMergeCases } from './use_merge_cases';

jest.mock('../../common/lib/kibana');
jest.mock('../../common/navigation/hooks');
jest.mock('../../common/use_cases_features');
jest.mock('../../containers/use_get_merge_cases_preview');
jest.mock('../../containers/user_profiles/use_bulk_get_user_profiles');
jest.mock('./use_merge_cases');

const useCasesFeaturesMock = useCasesFeatures as jest.Mock;
const useGetMergeCasesPreviewMock = useGetMergeCasesPreview as jest.Mock;
const useBulkGetUserProfilesMock = useBulkGetUserProfiles as jest.Mock;
const useMergeCasesMock = useMergeCases as jest.Mock;

const summary = (
  overrides: Partial<MergeCasesPreviewResponse['attachments']['alerts']> = {}
): MergeCasesPreviewResponse['attachments']['alerts'] => ({
  total: 0,
  duplicates: 0,
  toCopy: 0,
  existing: 0,
  max: null,
  overLimit: 0,
  ...overrides,
});

const previewCase = (id: string, incrementalId: number, title: string) => ({
  id,
  version: `${id}-version`,
  title,
  incrementalId,
  status: CaseStatuses.open,
  severity: CaseSeverity.LOW,
  owner: 'securitySolution',
  createdAt: '2024-01-01T00:00:00.000Z',
  totalAlerts: 0,
});

const buildPreview = (
  attachments: Partial<MergeCasesPreviewResponse['attachments']> = {},
  choices: MergeCasesPreviewResponse['choices'] = null
): MergeCasesPreviewResponse => ({
  cases: [previewCase('case-1', 118, 'Phishing'), previewCase('case-2', 119, 'Follow-up')],
  destinationCaseId: null,
  fields: {
    title: {
      value: 'Phishing',
      provenance: 'oldest',
      sourceCaseId: 'case-1',
      options: [
        { value: 'Phishing', caseIds: ['case-1'] },
        { value: 'Follow-up', caseIds: ['case-2'] },
      ],
      hasConflict: true,
    },
    description: {
      value: 'First description',
      provenance: 'same',
      sourceCaseId: null,
      options: [{ value: 'First description', caseIds: ['case-1', 'case-2'] }],
      hasConflict: false,
    },
    severity: {
      value: CaseSeverity.LOW,
      provenance: 'same',
      sourceCaseId: null,
      options: [{ value: CaseSeverity.LOW, caseIds: ['case-1', 'case-2'] }],
      hasConflict: false,
    },
    category: {
      value: null,
      provenance: 'none',
      sourceCaseId: null,
      options: [],
      hasConflict: false,
    },
    tags: { value: ['phishing'], provenance: 'combined', max: 200 },
    assignees: { value: [], provenance: 'none', max: 10 },
  },
  attachments: {
    alerts: summary({ total: 4, toCopy: 3, duplicates: 1, max: 1000 }),
    events: summary(),
    observables: summary({ max: 50 }),
    other: summary({ total: 2, toCopy: 2, max: 100 }),
    files: { total: 0 },
    comments: { total: 1 },
    ...attachments,
  },
  choices,
});

const mockPreview = (preview: MergeCasesPreviewResponse) => {
  useGetMergeCasesPreviewMock.mockImplementation(
    ({ destinationCaseId }: { destinationCaseId?: string }) => ({
      data: { ...preview, destinationCaseId: destinationCaseId ?? null },
      isLoading: false,
      isFetching: false,
    })
  );
};

const selectedCases = [
  { ...basicCase, id: 'case-1' },
  { ...basicCase, id: 'case-2' },
];

describe('MergeCasesFlyout', () => {
  const mergeCases = jest.fn();
  const onClose = jest.fn();
  const onMerged = jest.fn();

  const renderFlyout = () =>
    renderWithTestingProviders(
      <MergeCasesFlyout selectedCases={selectedCases} onClose={onClose} onMerged={onMerged} />
    );

  const selectDestination = async (caseId: string) => {
    await userEvent.click(screen.getByTestId('merge-cases-destination'));
    await waitForEuiPopoverOpen();
    await userEvent.click(screen.getByTestId(`merge-cases-destination-${caseId}`));
  };

  beforeEach(() => {
    jest.clearAllMocks();
    useCasesFeaturesMock.mockReturnValue({
      isSyncAlertsEnabled: false,
      caseAssignmentAuthorized: false,
    });
    useBulkGetUserProfilesMock.mockReturnValue({ data: new Map(), isLoading: false });
    useMergeCasesMock.mockReturnValue({ mutate: mergeCases, isLoading: false });
    mockPreview(buildPreview());
  });

  it('summarizes a merge into a new case', () => {
    renderFlyout();

    expect(screen.getByTestId('merge-cases-summary')).toHaveTextContent(
      'Copies 5 attachments into the new case. Closes 2 cases.'
    );
    expect(
      screen.getByText(
        'They keep their comments, attachments, and history, and link to the new case.'
      )
    ).toBeInTheDocument();
  });

  it('opens the listed cases in a new tab so the merge stays open', () => {
    renderFlyout();

    for (const link of within(screen.getByTestId('merge-cases-table')).getAllByRole('link')) {
      expect(link).toHaveAttribute('target', '_blank');
    }
  });

  it('says there is nothing to copy when no attachments would be copied', () => {
    mockPreview(buildPreview({ alerts: summary(), other: summary() }));

    renderFlyout();

    expect(screen.getByTestId('merge-cases-summary')).toHaveTextContent(
      'Nothing to copy into the new case. Closes 2 cases.'
    );
  });

  it('describes a single original case when merging into an existing case', async () => {
    useCasesFeaturesMock.mockReturnValue({
      isSyncAlertsEnabled: true,
      caseAssignmentAuthorized: false,
    });

    renderFlyout();
    await selectDestination('case-1');

    expect(screen.getByText('Close the original case')).toBeInTheDocument();
    expect(screen.getByTestId('merge-cases-close-originals')).toBeChecked();
    expect(
      screen.getByText(
        'It keeps its comments, attachments, and history, and links to #118. Its alerts stay open.'
      )
    ).toBeInTheDocument();
    expect(screen.getByTestId('merge-cases-summary')).toHaveTextContent(
      'Copies 5 attachments into #118. Closes 1 case.'
    );
  });

  it('merges with the chosen destination and options', async () => {
    renderFlyout();
    await selectDestination('case-1');
    await userEvent.click(screen.getByTestId('merge-cases-close-originals'));
    await userEvent.click(screen.getByTestId('merge-cases-add-note'));
    await userEvent.type(screen.getByTestId('merge-cases-note'), '  Same campaign  ');
    await userEvent.click(screen.getByTestId('merge-cases-submit'));

    expect(mergeCases).toHaveBeenCalledWith(
      {
        caseIds: ['case-1', 'case-2'],
        destinationCaseId: 'case-1',
        fields: {
          title: 'Phishing',
          description: 'First description',
          severity: CaseSeverity.LOW,
          category: null,
          tags: ['phishing'],
        },
        closeOriginals: false,
        note: 'Same campaign',
      },
      { onSuccess: onMerged }
    );
  });

  it('lets the user leave alerts out of an over-limit merge', async () => {
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
      buildPreview(
        {
          alerts: summary({ total: 3, toCopy: 3, max: 2, overLimit: 1 }),
          other: summary(),
        },
        {
          alerts: [
            alertChoice('alert-1', 'rule-1', 'Phishing rule'),
            alertChoice('alert-2', 'rule-1', 'Phishing rule'),
            alertChoice('alert-3', 'rule-2', 'Malware rule'),
          ],
          events: [],
          observables: [],
          other: [],
        }
      )
    );

    renderFlyout();

    expect(screen.getByTestId('merge-cases-blocking-reason')).toHaveTextContent(
      '1 alert over the limit'
    );
    expect(screen.getByTestId('merge-cases-submit')).toBeDisabled();

    await userEvent.click(screen.getByTestId('merge-cases-choose-attachments'));
    expect(await screen.findByTestId('merge-attachments-modal')).toBeInTheDocument();
    await userEvent.click(screen.getByTestId('merge-choices-rule-rule:rule-2-checkbox'));
    expect(screen.getByTestId('merge-choices-alerts-status')).toHaveTextContent(
      'Within the limit.'
    );
    await userEvent.click(screen.getByTestId('merge-choices-apply'));

    expect(screen.queryByTestId('merge-attachments-modal')).not.toBeInTheDocument();
    expect(screen.getByTestId('merge-cases-attachments-alerts')).toHaveTextContent(
      '2 to copy · 1 left out'
    );
    expect(screen.getByTestId('merge-cases-summary')).toHaveTextContent(
      'Copies 2 attachments into the new case.'
    );

    await userEvent.click(screen.getByTestId('merge-cases-submit'));

    expect(mergeCases).toHaveBeenCalledWith(
      expect.objectContaining({ excludedAttachments: ['alert-3'] }),
      { onSuccess: onMerged }
    );
  });

  it('does not offer to choose attachments when nothing is over the limit', () => {
    renderFlyout();

    expect(screen.queryByTestId('merge-cases-choose-attachments')).not.toBeInTheDocument();
  });

  it('blocks the merge when only one case is left', async () => {
    renderFlyout();
    await userEvent.click(screen.getByTestId('merge-cases-remove-case-2'));

    expect(screen.getByTestId('merge-cases-blocking-reason')).toHaveTextContent(
      'Add another case to merge'
    );
    expect(screen.getByTestId('merge-cases-submit')).toBeDisabled();
  });
});
