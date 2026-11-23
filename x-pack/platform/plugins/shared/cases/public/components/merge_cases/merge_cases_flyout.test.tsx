/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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
import type { DifferencesSummary, MergeFieldChoices } from './utils';
import { getDifferencesSummary } from './value_cards/field_state';

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
jest.mock('./value_cards/field_state', () => ({
  ...jest.requireActual('./value_cards/field_state'),
  getDifferencesSummary: jest.fn(),
}));
// The Differences step has its own tests; here it only needs to set a value and show the focus.
jest.mock('./steps/differences_step', () => ({
  DifferencesStep: ({
    onSetField,
    focusField,
  }: {
    onSetField: (key: string, value: string) => void;
    focusField?: string;
  }) => (
    <div data-test-subj="differences-step">
      <span data-test-subj="differences-focus">{focusField ?? ''}</span>
      <button type="button" onClick={() => onSetField('title', 'Follow-up')}>
        {'Pick a title'}
      </button>
    </div>
  ),
}));

const useCasesFeaturesMock = useCasesFeatures as jest.Mock;
const useGetCasesMock = useGetCases as jest.Mock;
const useGetMergeCasesPreviewMock = useGetMergeCasesPreview as jest.Mock;
const useBulkGetUserProfilesMock = useBulkGetUserProfiles as jest.Mock;
const useMergeCasesMock = useMergeCases as jest.Mock;
const getDifferencesSummaryMock = getDifferencesSummary as jest.Mock;

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

/** The title differs until the user picks one. */
const titleDiffers = (
  _preview: MergeCasesPreviewResponse,
  choices: MergeFieldChoices
): DifferencesSummary =>
  choices.title != null
    ? { total: 1, resolved: 1, blocking: [] }
    : {
        total: 1,
        resolved: 0,
        blocking: [{ key: 'title', label: 'Title', state: 'chooseOne' }],
      };

const nothingDiffers = (): DifferencesSummary => ({ total: 0, resolved: 0, blocking: [] });

const selectedCases = [
  { ...basicCase, id: 'case-1', incrementalId: 118, title: 'Phishing' },
  { ...basicCase, id: 'case-2', incrementalId: 119, title: 'Follow-up' },
];

const alertChoice = (key: string, caseId: string, ruleId: string, ruleName: string) => ({
  key,
  sourceCaseId: caseId,
  alertId: key,
  index: 'alerts-index',
  ruleId,
  ruleName,
  addedAt: `2024-01-0${key.slice(-1)}T00:00:00.000Z`,
});

const overLimitPreview = () =>
  buildMergePreview({
    conflicts: [],
    attachments: {
      alerts: { ...mergeSummary({ total: 3, toCopy: 3, max: 2, overBy: 1 }), byRule: [] },
      other: mergeSummary(),
    },
    choices: {
      alerts: [
        alertChoice('alert-1', 'case-1', 'rule-1', 'Phishing rule'),
        alertChoice('alert-2', 'case-1', 'rule-1', 'Phishing rule'),
        alertChoice('alert-3', 'case-2', 'rule-2', 'Malware rule'),
      ],
      events: [],
      attacks: [],
      observables: [],
      other: [],
    },
  });

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

  const next = () => userEvent.click(screen.getByTestId('merge-cases-next'));
  const keepRadio = (id: string) =>
    within(screen.getByTestId(`merge-cases-destination-${id}`)).getByRole('radio');
  const mergeIntoRadio = (choice: 'new' | 'existing') =>
    within(screen.getByTestId(`merge-cases-merge-into-${choice}`)).getByRole('radio');
  const mergeInto = (choice: 'new' | 'existing') => userEvent.click(mergeIntoRadio(choice));

  beforeEach(() => {
    jest.clearAllMocks();
    useCasesFeaturesMock.mockReturnValue({
      isSyncAlertsEnabled: false,
      caseAssignmentAuthorized: false,
    });
    useBulkGetUserProfilesMock.mockReturnValue({ data: new Map(), isLoading: false });
    useGetCasesMock.mockReturnValue({ data: { cases: [] }, isFetching: false });
    useMergeCasesMock.mockReturnValue({ mutate: mergeCases, isLoading: false });
    getDifferencesSummaryMock.mockImplementation(titleDiffers);
    mockPreview(buildMergePreview());
  });

  it('starts on the Cases step with the four steps', () => {
    renderFlyout();

    expect(screen.getByTestId('merge-cases-cases-step')).toBeInTheDocument();
    expect(screen.getByTestId('merge-step-cases')).toHaveTextContent('Cases');
    expect(screen.getByTestId('merge-step-differences')).toHaveTextContent('Conflicts');
    expect(screen.getByTestId('merge-step-attachments')).toBeInTheDocument();
    expect(screen.getByTestId('merge-step-review')).toBeInTheDocument();
    expect(screen.getByTestId('merge-cases-next')).toHaveTextContent(/^Next$/);
    expect(screen.queryByTestId('merge-cases-back')).not.toBeInTheDocument();
  });

  it('starts on merging into a new case, ready to go on', () => {
    renderFlyout();

    expect(mergeIntoRadio('new')).toBeChecked();
    expect(mergeIntoRadio('existing')).not.toBeChecked();
    expect(screen.getByTestId('merge-cases-next')).toBeEnabled();
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent(/^Merge cases$/);
  });

  it('blocks Next on Differences until every difference is chosen', async () => {
    renderFlyout();
    await next();

    expect(screen.getByTestId('differences-step')).toBeInTheDocument();
    // The conflicts bar counts what is left, so the footer doesn't repeat it.
    expect(screen.getByTestId('merge-cases-footer-status')).toBeEmptyDOMElement();
    expect(screen.getByTestId('merge-cases-next')).toBeDisabled();
    expect(screen.getByTestId('merge-step-review')).toBeDisabled();

    await userEvent.click(screen.getByText('Pick a title'));

    expect(screen.getByTestId('merge-cases-next')).toBeEnabled();
    // Attachments shows even though nothing is over a limit.
    await next();
    expect(screen.getByTestId('merge-cases-attachments-step')).toBeInTheDocument();
    await next();
    expect(screen.getByTestId('merge-cases-review-step')).toBeInTheDocument();
    expect(screen.getByTestId('merge-cases-submit')).toHaveTextContent(/^Merge$/);
  });

  it('pins the conflicts bar above the fields, only on Differences', async () => {
    renderFlyout();
    expect(screen.queryByTestId('merge-conflicts-bar')).not.toBeInTheDocument();

    await next();

    const bar = screen.getByTestId('merge-conflicts-bar');
    // Outside the scrolling body, so it stays in view while the fields scroll.
    expect(screen.getByTestId('differences-step')).not.toContainElement(bar);
    expect(bar.compareDocumentPosition(screen.getByTestId('differences-step'))).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING
    );
  });

  it('skips Conflicts when nothing differs, but always shows Attachments', async () => {
    getDifferencesSummaryMock.mockImplementation(nothingDiffers);
    renderFlyout();
    await next();

    expect(screen.getByTestId('merge-cases-attachments-step')).toBeInTheDocument();
    await next();
    expect(screen.getByTestId('merge-cases-review-step')).toBeInTheDocument();

    await userEvent.click(screen.getByTestId('merge-cases-back'));
    expect(screen.getByTestId('merge-cases-attachments-step')).toBeInTheDocument();
    await userEvent.click(screen.getByTestId('merge-cases-back'));
    expect(screen.getByTestId('merge-cases-cases-step')).toBeInTheDocument();

    await userEvent.click(screen.getByTestId('merge-step-differences'));
    expect(screen.getByTestId('differences-step')).toBeInTheDocument();
  });

  it('announces the footer status to screen readers', () => {
    renderFlyout();

    expect(screen.getByTestId('merge-cases-footer-status')).toHaveAttribute('role', 'status');
  });

  it('shows the cases as cards, and lets the user pick one only when merging into one of them', async () => {
    renderFlyout();

    // The same detailed cards as when picking the case to keep, but nothing to pick.
    const row = within(screen.getByTestId('merge-cases-case-case-1'));
    expect(row.getByText('Alerts')).toBeInTheDocument();
    expect(row.getByText('Open')).toBeInTheDocument();
    expect(row.queryByRole('radio')).not.toBeInTheDocument();
    expect(screen.queryByTestId('merge-cases-destination-case-1')).not.toBeInTheDocument();

    await mergeInto('existing');

    expect(keepRadio('case-1')).not.toBeChecked();
    expect(screen.getByTestId('merge-cases-blocking-reason')).toHaveTextContent(
      'Choose the case to merge into'
    );

    await userEvent.click(keepRadio('case-1'));

    expect(screen.getByTestId('merge-cases-next')).toBeEnabled();
    expect(screen.getByTestId('merge-cases-merge-into-existing')).toHaveTextContent(
      "Adds the others' attachments to the case you choose."
    );
    expect(screen.getByTestId('merge-cases-merge-into-new')).toHaveTextContent(
      'Starts a new case with their attachments.'
    );
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent(/^Merge cases$/);
  });

  it('keeps a closed case as a source but not as the case to keep', async () => {
    useGetMergeCasesPreviewMock.mockImplementation(() => ({
      data: {
        ...buildMergePreview(),
        cases: [
          mergePreviewCase('case-1', 118, 'Phishing'),
          mergePreviewCase('case-2', 119, 'Follow-up', { status: CaseStatuses.closed }),
        ],
      },
      isLoading: false,
      isFetching: false,
    }));

    renderFlyout();
    await mergeInto('existing');

    expect(keepRadio('case-2')).toBeDisabled();
    expect(screen.getByTestId('merge-cases-case-meta-case-2')).toHaveTextContent(
      'Reopen it to merge into it. It can still be merged in.'
    );
  });

  it('describes each case to keep, with its facts beside it', async () => {
    useGetMergeCasesPreviewMock.mockImplementation(() => ({
      data: {
        ...buildMergePreview(),
        cases: [
          mergePreviewCase('case-1', 118, 'Phishing', {
            description: 'Credential phishing against finance.',
            templateName: 'Phishing triage',
            totalAlerts: 12,
          }),
          mergePreviewCase('case-2', 119, 'Follow-up'),
        ],
      },
      isLoading: false,
      isFetching: false,
    }));

    renderFlyout();
    await mergeInto('existing');

    const row = within(screen.getByTestId('merge-cases-case-meta-case-1'));
    expect(row.getByText('#118', { exact: false })).toBeInTheDocument();
    expect(row.getByText('Credential phishing against finance.')).toBeInTheDocument();
    expect(row.getByText('Phishing triage')).toBeInTheDocument();
    for (const fact of ['Status', 'Severity', 'Alerts', 'Opened']) {
      expect(row.getByText(fact)).toBeInTheDocument();
    }
    expect(row.queryByRole('link')).not.toBeInTheDocument();
  });

  it("opens a listed case's card from its number without picking it to keep", async () => {
    renderFlyout();
    await mergeInto('existing');

    await userEvent.click(
      within(screen.getByTestId('merge-cases-list')).getByTestId('merge-case-ref-case-1')
    );

    expect(await screen.findByTestId('merge-case-hover-card-case-1')).toBeInTheDocument();
    expect(keepRadio('case-1')).not.toBeChecked();
  });

  it('shows the merged case on Review', async () => {
    renderFlyout();
    await next();
    await userEvent.click(screen.getByText('Pick a title'));
    await next();
    await next();

    expect(screen.getByTestId('merge-review-title')).toHaveTextContent('Follow-up');
    expect(screen.getByTestId('merge-review-tab-alerts')).toHaveTextContent(/^Alerts\s*3$/);
    expect(screen.getByTestId('merge-review-tab-other')).toHaveTextContent(/^Other\s*2$/);
    expect(
      screen.getByText(
        'The merged case will have 3 alerts, 0 observables, 0 events and 2 other attachments.'
      )
    ).toBeInTheDocument();
  });

  it('labels the preview and shows where values come from only when asked', async () => {
    renderFlyout();
    await next();
    await userEvent.click(screen.getByText('Pick a title'));
    await next();
    await next();

    expect(screen.getByTestId('merge-review-preview')).toHaveTextContent('Preview');
    expect(screen.getByTestId('merge-review-destination')).toHaveTextContent('Cases / New case');
    expect(screen.queryByTestId('merge-review-source-title')).not.toBeInTheDocument();

    await userEvent.click(screen.getByTestId('merge-review-show-origins'));

    expect(screen.getByTestId('merge-review-source-title')).toBeInTheDocument();
  });

  it('sends only the fields the user acted on, with the destination and options', async () => {
    renderFlyout();
    await mergeInto('existing');
    await userEvent.click(keepRadio('case-1'));
    await next();
    await userEvent.click(screen.getByText('Pick a title'));
    await next();
    await next();
    await userEvent.click(screen.getByTestId('merge-cases-close-sources'));
    await userEvent.click(screen.getByTestId('merge-cases-submit'));

    expect(mergeCases).toHaveBeenCalledWith(
      {
        request: {
          caseIds: ['case-1', 'case-2'],
          destinationCaseId: 'case-1',
          fields: { title: 'Follow-up' },
          closeSources: false,
        },
        origin: 'list',
      },
      expect.objectContaining({ onSuccess: onMerged })
    );
  });

  it('counts only the open sources it would close', async () => {
    getDifferencesSummaryMock.mockImplementation(nothingDiffers);
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
    await next();
    await next();

    expect(screen.getByText('Close the source case')).toBeInTheDocument();
    expect(screen.getByTestId('merge-review-sources-summary')).toHaveTextContent(
      '1 will close, 1 is already closed'
    );
    expect(screen.getByTestId('merge-cases-footer-status')).toBeEmptyDOMElement();
  });

  it('shows four source cases and the rest behind Show more', async () => {
    getDifferencesSummaryMock.mockImplementation(nothingDiffers);
    const cases = Array.from({ length: 7 }, (_, index) =>
      mergePreviewCase(`case-${index + 1}`, 118 + index, `Case ${index + 1}`)
    );
    useGetMergeCasesPreviewMock.mockReturnValue({
      data: { ...buildMergePreview({ conflicts: [] }), cases },
      isLoading: false,
      isFetching: false,
    });

    renderWithTestingProviders(
      <MergeCasesFlyout
        initialCases={cases.map(({ id, incrementalId, title }) => ({
          ...basicCase,
          id,
          incrementalId,
          title,
        }))}
        origin="list"
        onClose={onClose}
        onMerged={onMerged}
      />
    );
    await next();
    await next();

    const sources = screen.getByTestId('merge-review-sources');
    expect(within(sources).getAllByTestId(/^merge-review-source-case-/)).toHaveLength(4);
    await userEvent.click(screen.getByTestId('merge-review-show-more-sources'));
    expect(within(sources).getAllByTestId(/^merge-review-source-case-/)).toHaveLength(7);
    expect(screen.getByTestId('merge-review-show-more-sources')).toHaveTextContent('Show fewer');
  });

  describe('attachments over a limit', () => {
    beforeEach(() => {
      getDifferencesSummaryMock.mockImplementation(nothingDiffers);
      mockPreview(overLimitPreview());
    });

    it('stops on Attachments until alerts are left out, by rule', async () => {
      renderFlyout();
      await next();
      expect(screen.getByTestId('merge-cases-attachments-step')).toBeInTheDocument();

      expect(screen.getByTestId('merge-cases-blocking-reason')).toHaveTextContent(
        'Leave out 1 alert to continue'
      );
      expect(screen.getByTestId('merge-cases-next')).toBeDisabled();

      await userEvent.click(screen.getByTestId('merge-choices-rule-rule:rule-2-checkbox'));

      expect(screen.getByTestId('merge-cases-attachments-alerts')).toHaveTextContent(
        '2 to copy · 1 left out'
      );
      expect(screen.getByTestId('merge-cases-attachments-alerts-status')).toHaveTextContent(
        'Within the limit.'
      );
      await next();
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

    it('leaves out a whole case of alerts', async () => {
      renderFlyout();
      await next();
      await userEvent.click(screen.getByTestId('merge-alerts-by-case'));
      await userEvent.click(screen.getByTestId('merge-choices-case-case-2-checkbox'));

      expect(screen.getByTestId('merge-cases-attachments-alerts')).toHaveTextContent(
        '2 to copy · 1 left out'
      );
    });

    it('keeps the newest alerts', async () => {
      renderFlyout();
      await next();
      await userEvent.click(screen.getByTestId('merge-alerts-keep-newest'));

      expect(screen.getByTestId('merge-alerts-keep-newest-result')).toHaveTextContent(
        'Keeps the 2 alerts most recently added to a case. 1 alert stays on the source cases.'
      );
      expect(screen.queryByTestId('merge-cases-blocking-reason')).not.toBeInTheDocument();
    });
  });

  it('reports what the merge leaves out on its own', async () => {
    getDifferencesSummaryMock.mockImplementation(nothingDiffers);
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
    await userEvent.click(screen.getByTestId('merge-step-attachments'));

    expect(screen.getByTestId('merge-cases-attachments-alerts-not-copied')).toHaveTextContent(
      '1 alert is already in 10 cases and stays on the source cases.'
    );
  });

  it('blocks Next when only one case is left', async () => {
    renderFlyout();
    await userEvent.click(screen.getByTestId('merge-cases-remove-case-2'));

    expect(screen.getByTestId('merge-cases-blocking-reason')).toHaveTextContent(
      'Add another case to merge'
    );
    expect(screen.getByTestId('merge-cases-next')).toBeDisabled();
  });

  it('asks before discarding changes', async () => {
    renderFlyout();
    await next();
    await userEvent.click(screen.getByText('Pick a title'));
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

    expect(mergeIntoRadio('new')).toBeDisabled();
    expect(mergeIntoRadio('existing')).toBeChecked();
    expect(keepRadio('case-1')).toBeChecked();
  });

  it('takes the user to the fields the server refused', async () => {
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
    await next();
    await userEvent.click(screen.getByText('Pick a title'));
    await next();
    await next();
    await userEvent.click(screen.getByTestId('merge-cases-submit'));

    expect(screen.getByTestId('merge-cases-changed-callout')).toBeInTheDocument();
    expect(screen.getByTestId('differences-step')).toBeInTheDocument();
    expect(screen.getByTestId('differences-focus')).toHaveTextContent('title');
  });
});
