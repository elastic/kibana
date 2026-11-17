/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import type { EuiBasicTableColumn, EuiSuperSelectOption } from '@elastic/eui';
import {
  EuiBasicTable,
  EuiButton,
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiCheckbox,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiFormRow,
  EuiIcon,
  EuiSkeletonText,
  EuiSpacer,
  EuiSuperSelect,
  EuiText,
  EuiTextArea,
  EuiTitle,
  EuiToolTip,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { Status } from '@kbn/cases-components';
import {
  MAX_CASES_TO_MERGE,
  MAX_COMMENT_LENGTH,
  MIN_CASES_TO_MERGE,
} from '../../../common/constants';
import type { MergePreviewCase } from '../../../common/types/api';
import { CaseStatuses } from '../../../common/types/domain';
import type { CaseSeverity } from '../../../common/types/domain';
import { useCasesFeatures } from '../../common/use_cases_features';
import type { CasesUI } from '../../containers/types';
import { useGetMergeCasesPreview } from '../../containers/use_get_merge_cases_preview';
import { CaseDetailsLink } from '../links';
import { SeverityHealth } from '../severity/config';
import { MergeAttachmentsSection } from './merge_attachments_section';
import { MergeCaseDetailsSection } from './merge_case_details_section';
import { MergeSectionTitle } from './merge_section_title';
import { useMergeCases } from './use_merge_cases';
import type { MergeFieldOverrides, MergeFieldValues } from './utils';
import {
  applyExclusions,
  buildMergeRequest,
  getActiveExclusions,
  getAttachmentsToCopyCount,
  getCaseReference,
  getDefaultFieldValues,
  getMergeBlockingReason,
} from './utils';
import * as i18n from './translations';

const NEW_CASE_VALUE = '';

const getDestinationHelpText = (
  destinationRef: string | undefined,
  previewCases: MergePreviewCase[]
): string | undefined => {
  if (destinationRef != null) {
    return i18n.EXISTING_DESTINATION_HELP(destinationRef);
  }

  return previewCases.some(({ status }) => status === CaseStatuses.closed)
    ? i18n.CLOSED_CASES_NOT_OFFERED
    : undefined;
};

const getCloseOriginalsHelpText = (
  destinationRef: string | undefined,
  originalsCount: number,
  isSyncAlertsEnabled: boolean
): string => {
  if (destinationRef == null) {
    return isSyncAlertsEnabled ? i18n.CLOSE_ORIGINALS_HELP_SYNC : i18n.CLOSE_ORIGINALS_HELP;
  }

  return isSyncAlertsEnabled
    ? i18n.CLOSE_ORIGINALS_HELP_SYNC_EXISTING_CASE(destinationRef, originalsCount)
    : i18n.CLOSE_ORIGINALS_HELP_EXISTING_CASE(destinationRef, originalsCount);
};

interface MergeCasesFlyoutFooterProps {
  isLoadingCases: boolean;
  blockingReason?: string;
  summary: string;
  isMerging: boolean;
  isDisabled: boolean;
  onCancel: () => void;
  onMerge: () => void;
}

type MergeCasesFlyoutFooterStatusProps = Pick<
  MergeCasesFlyoutFooterProps,
  'isLoadingCases' | 'blockingReason' | 'summary'
>;

const MergeCasesFlyoutFooterStatus = React.memo<MergeCasesFlyoutFooterStatusProps>(
  ({ isLoadingCases, blockingReason, summary }) => {
    if (isLoadingCases) {
      return (
        <EuiText size="s" color="subdued" data-test-subj="merge-cases-loading">
          {i18n.LOADING_CASES}
        </EuiText>
      );
    }

    if (blockingReason != null) {
      return (
        <EuiText size="s" color="warning" data-test-subj="merge-cases-blocking-reason">
          <EuiIcon type="warning" aria-hidden={true} /> {blockingReason}
        </EuiText>
      );
    }

    return (
      <EuiText size="s" color="subdued" data-test-subj="merge-cases-summary">
        {summary}
      </EuiText>
    );
  }
);
MergeCasesFlyoutFooterStatus.displayName = 'MergeCasesFlyoutFooterStatus';

const MergeCasesFlyoutFooter = React.memo<MergeCasesFlyoutFooterProps>(
  ({ isLoadingCases, blockingReason, summary, isMerging, isDisabled, onCancel, onMerge }) => (
    <EuiFlyoutFooter>
      <EuiFlexGroup justifyContent="spaceBetween" alignItems="center" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty onClick={onCancel} data-test-subj="merge-cases-cancel">
            {i18n.CANCEL}
          </EuiButtonEmpty>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiFlexGroup alignItems="center" gutterSize="m" responsive={false}>
            <EuiFlexItem grow={false}>
              <MergeCasesFlyoutFooterStatus
                isLoadingCases={isLoadingCases}
                blockingReason={blockingReason}
                summary={summary}
              />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButton
                fill
                onClick={onMerge}
                isLoading={isMerging}
                isDisabled={isDisabled}
                data-test-subj="merge-cases-submit"
              >
                {isMerging ? i18n.MERGING : i18n.MERGE_CASES}
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFlyoutFooter>
  )
);
MergeCasesFlyoutFooter.displayName = 'MergeCasesFlyoutFooter';

interface MergeCasesFlyoutProps {
  selectedCases: CasesUI;
  onClose: () => void;
  onMerged: () => void;
}

export const MergeCasesFlyout = React.memo<MergeCasesFlyoutProps>(
  ({ selectedCases, onClose, onMerged }) => {
    const flyoutTitleId = useGeneratedHtmlId({ prefix: 'mergeCasesFlyoutTitle' });
    const { isSyncAlertsEnabled, caseAssignmentAuthorized } = useCasesFeatures();

    const [caseIds, setCaseIds] = useState<string[]>(() => selectedCases.map(({ id }) => id));
    const [destinationCaseId, setDestinationCaseId] = useState<string | undefined>();
    const [overrides, setOverrides] = useState<MergeFieldOverrides>({});
    const [closeOriginals, setCloseOriginals] = useState(true);
    const [isNoteOpen, setIsNoteOpen] = useState(false);
    const [note, setNote] = useState('');
    const [excludedKeys, setExcludedKeys] = useState<ReadonlySet<string>>(new Set());

    const {
      data: preview,
      isLoading: isLoadingPreview,
      isFetching: isFetchingPreview,
    } = useGetMergeCasesPreview({ caseIds, destinationCaseId });
    const { mutate: mergeCases, isLoading: isMerging } = useMergeCases();

    const casesById = useMemo(
      () => new Map((preview?.cases ?? []).map((theCase) => [theCase.id, theCase])),
      [preview?.cases]
    );
    const previewCases = useMemo(
      () => (preview?.cases ?? []).filter(({ id }) => caseIds.includes(id)),
      [caseIds, preview?.cases]
    );
    const values = useMemo<MergeFieldValues | undefined>(
      () => (preview != null ? { ...getDefaultFieldValues(preview), ...overrides } : undefined),
      [overrides, preview]
    );
    const selectedAttachments = useMemo(
      () => (preview != null ? applyExclusions(preview, excludedKeys) : undefined),
      [excludedKeys, preview]
    );
    const activeExclusions = useMemo(
      () => getActiveExclusions(preview?.choices ?? null, excludedKeys),
      [excludedKeys, preview?.choices]
    );

    const destinationCase =
      destinationCaseId != null ? casesById.get(destinationCaseId) : undefined;
    const destinationRef = destinationCase != null ? getCaseReference(destinationCase) : undefined;
    const originals = previewCases.filter(({ id }) => id !== destinationCaseId);
    const casesToClose = originals.filter(({ status }) => status !== CaseStatuses.closed);

    const setOverride = useCallback(
      <K extends keyof MergeFieldValues>(field: K, value: MergeFieldValues[K]) =>
        setOverrides((current) => ({ ...current, [field]: value })),
      []
    );

    const onRemoveCase = useCallback(
      (caseId: string) => {
        setCaseIds((current) => current.filter((id) => id !== caseId));
        if (caseId === destinationCaseId) {
          setDestinationCaseId(undefined);
        }
      },
      [destinationCaseId]
    );

    const isLoadingCases = caseIds.length >= MIN_CASES_TO_MERGE && preview == null;

    const blockingReason = useMemo(() => {
      if (caseIds.length < MIN_CASES_TO_MERGE) {
        return i18n.BLOCKED_ADD_ANOTHER_CASE;
      }

      if (preview == null || selectedAttachments == null || values == null) {
        return undefined;
      }

      return getMergeBlockingReason({
        preview,
        attachments: selectedAttachments,
        values,
        includeAssignees: caseAssignmentAuthorized,
      });
    }, [caseAssignmentAuthorized, caseIds.length, preview, selectedAttachments, values]);

    const summary = useMemo(() => {
      if (selectedAttachments == null) {
        return '';
      }

      const attachmentsToCopy = getAttachmentsToCopyCount(selectedAttachments);
      const copies =
        destinationRef != null
          ? i18n.SUMMARY_COPIES_EXISTING_CASE(attachmentsToCopy, destinationRef)
          : i18n.SUMMARY_COPIES_NEW_CASE(attachmentsToCopy);

      return closeOriginals && casesToClose.length > 0
        ? `${copies} ${i18n.SUMMARY_CLOSES(casesToClose.length)}`
        : copies;
    }, [casesToClose.length, closeOriginals, destinationRef, selectedAttachments]);

    const onMerge = useCallback(() => {
      if (values == null) {
        return;
      }

      mergeCases(
        buildMergeRequest({
          caseIds,
          destinationCaseId,
          values,
          includeAssignees: caseAssignmentAuthorized,
          closeOriginals,
          note,
          excludedAttachments: activeExclusions,
        }),
        { onSuccess: onMerged }
      );
    }, [
      activeExclusions,
      caseAssignmentAuthorized,
      caseIds,
      closeOriginals,
      destinationCaseId,
      mergeCases,
      note,
      onMerged,
      values,
    ]);

    const destinationOptions = useMemo<Array<EuiSuperSelectOption<string>>>(
      () => [
        {
          value: NEW_CASE_VALUE,
          inputDisplay: i18n.NEW_CASE,
          'data-test-subj': 'merge-cases-destination-new',
        },
        ...previewCases
          .filter(({ status }) => status !== CaseStatuses.closed)
          .map((theCase) => ({
            value: theCase.id,
            inputDisplay: (
              <EuiText size="s" className="eui-textTruncate">
                {theCase.incrementalId != null
                  ? `${getCaseReference(theCase)} ${theCase.title}`
                  : theCase.title}
              </EuiText>
            ),
            dropdownDisplay: (
              <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
                <EuiFlexItem
                  css={css`
                    min-width: 0;
                  `}
                >
                  <EuiText size="s" className="eui-textTruncate">
                    {theCase.incrementalId != null
                      ? `${getCaseReference(theCase)} ${theCase.title}`
                      : theCase.title}
                  </EuiText>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <Status status={theCase.status} />
                </EuiFlexItem>
              </EuiFlexGroup>
            ),
            'data-test-subj': `merge-cases-destination-${theCase.id}`,
          })),
      ],
      [previewCases]
    );

    const caseColumns = useMemo<Array<EuiBasicTableColumn<MergePreviewCase>>>(
      () => [
        {
          name: i18n.CASE_COLUMN,
          truncateText: true,
          render: (theCase: MergePreviewCase) => (
            <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
              <EuiFlexItem grow={false}>
                <CaseDetailsLink detailName={theCase.id} title={theCase.title} target="_blank">
                  {getCaseReference(theCase)}
                </CaseDetailsLink>
              </EuiFlexItem>
              {theCase.incrementalId != null ? (
                <EuiFlexItem
                  css={css`
                    min-width: 0;
                  `}
                >
                  <EuiText size="s" className="eui-textTruncate" title={theCase.title}>
                    {theCase.title}
                  </EuiText>
                </EuiFlexItem>
              ) : null}
            </EuiFlexGroup>
          ),
        },
        {
          field: 'status',
          name: i18n.STATUS_COLUMN,
          width: '110px',
          render: (status: MergePreviewCase['status']) => <Status status={status} />,
        },
        {
          field: 'severity',
          name: i18n.SEVERITY_COLUMN,
          width: '100px',
          render: (severity: CaseSeverity) => <SeverityHealth severity={severity} />,
        },
        {
          field: 'totalAlerts',
          name: i18n.ALERTS_COLUMN,
          width: '70px',
          align: 'right',
        },
        {
          width: '40px',
          actions: [
            {
              name: (theCase: MergePreviewCase) => i18n.REMOVE_CASE(getCaseReference(theCase)),
              description: (theCase: MergePreviewCase) =>
                i18n.REMOVE_CASE(getCaseReference(theCase)),
              render: (theCase: MergePreviewCase) => (
                <EuiToolTip
                  content={i18n.REMOVE_CASE(getCaseReference(theCase))}
                  disableScreenReaderOutput
                >
                  <EuiButtonIcon
                    iconType="cross"
                    color="text"
                    isDisabled={isMerging}
                    onClick={() => onRemoveCase(theCase.id)}
                    aria-label={i18n.REMOVE_CASE(getCaseReference(theCase))}
                    data-test-subj={`merge-cases-remove-${theCase.id}`}
                  />
                </EuiToolTip>
              ),
            },
          ],
        },
      ],
      [isMerging, onRemoveCase]
    );

    const isControlsDisabled = isMerging;
    return (
      <EuiFlyout
        ownFocus
        size="m"
        onClose={onClose}
        aria-labelledby={flyoutTitleId}
        data-test-subj="merge-cases-flyout"
      >
        <EuiFlyoutHeader hasBorder>
          <EuiTitle size="m">
            <h2 id={flyoutTitleId}>{i18n.FLYOUT_TITLE(caseIds.length)}</h2>
          </EuiTitle>
          <EuiSpacer size="xs" />
          <EuiText size="s" color="subdued">
            {i18n.FLYOUT_DESCRIPTION}
          </EuiText>
        </EuiFlyoutHeader>
        <EuiFlyoutBody>
          <EuiFormRow
            fullWidth
            label={i18n.MERGE_INTO}
            helpText={getDestinationHelpText(destinationRef, previewCases)}
          >
            <EuiSuperSelect
              fullWidth
              options={destinationOptions}
              valueOfSelected={destinationCaseId ?? NEW_CASE_VALUE}
              onChange={(value) =>
                setDestinationCaseId(value === NEW_CASE_VALUE ? undefined : value)
              }
              disabled={isControlsDisabled || preview == null}
              data-test-subj="merge-cases-destination"
            />
          </EuiFormRow>

          <EuiSpacer size="l" />
          <MergeSectionTitle
            title={i18n.CASES_SECTION}
            badge={
              <EuiText size="xs" color="subdued">
                {i18n.CASES_COUNTER(caseIds.length, MAX_CASES_TO_MERGE)}
              </EuiText>
            }
          />
          <EuiSpacer size="s" />
          {isLoadingPreview ? (
            <EuiSkeletonText lines={3} />
          ) : (
            <EuiBasicTable
              compressed
              tableCaption={i18n.CASES_SECTION}
              items={previewCases}
              itemId="id"
              columns={caseColumns}
              data-test-subj="merge-cases-table"
            />
          )}

          <EuiSpacer size="l" />
          {preview != null && values != null ? (
            <MergeCaseDetailsSection
              preview={preview}
              values={values}
              overrides={overrides}
              onChange={setOverride}
              destinationRef={destinationRef}
              showAssignees={caseAssignmentAuthorized}
              isDisabled={isControlsDisabled}
            />
          ) : (
            <>
              <MergeSectionTitle title={i18n.CASE_DETAILS_SECTION} />
              <EuiSpacer size="s" />
              <EuiSkeletonText lines={5} />
            </>
          )}

          <EuiSpacer size="l" />
          <MergeSectionTitle title={i18n.ATTACHMENTS_SECTION} />
          <EuiSpacer size="s" />
          {preview != null && selectedAttachments != null ? (
            <MergeAttachmentsSection
              preview={preview}
              attachments={selectedAttachments}
              casesById={casesById}
              excludedKeys={excludedKeys}
              onChangeExclusions={setExcludedKeys}
              destinationRef={destinationRef}
              isDisabled={isControlsDisabled}
            />
          ) : (
            <EuiSkeletonText lines={3} />
          )}

          <EuiSpacer size="l" />
          <MergeSectionTitle title={i18n.AFTER_MERGING_SECTION} />
          <EuiSpacer size="s" />
          <EuiFormRow
            fullWidth
            helpText={getCloseOriginalsHelpText(
              destinationRef,
              originals.length,
              isSyncAlertsEnabled
            )}
          >
            <EuiCheckbox
              id={`${flyoutTitleId}-close-originals`}
              label={i18n.CLOSE_ORIGINALS(originals.length)}
              checked={closeOriginals}
              disabled={isControlsDisabled}
              onChange={(event) => setCloseOriginals(event.target.checked)}
              data-test-subj="merge-cases-close-originals"
            />
          </EuiFormRow>
          <EuiSpacer size="s" />
          {isNoteOpen ? (
            <EuiFormRow
              fullWidth
              label={i18n.NOTE}
              helpText={
                destinationRef != null
                  ? i18n.NOTE_HELP_EXISTING_CASE(destinationRef)
                  : i18n.NOTE_HELP_NEW_CASE
              }
            >
              <EuiTextArea
                fullWidth
                rows={3}
                value={note}
                maxLength={MAX_COMMENT_LENGTH}
                disabled={isControlsDisabled}
                onChange={(event) => setNote(event.target.value)}
                data-test-subj="merge-cases-note"
              />
            </EuiFormRow>
          ) : (
            <EuiButtonEmpty
              size="s"
              flush="left"
              iconType="plusCircle"
              onClick={() => setIsNoteOpen(true)}
              isDisabled={isControlsDisabled}
              data-test-subj="merge-cases-add-note"
            >
              {i18n.ADD_NOTE}
            </EuiButtonEmpty>
          )}
        </EuiFlyoutBody>
        <MergeCasesFlyoutFooter
          isLoadingCases={isLoadingCases}
          blockingReason={blockingReason}
          summary={summary}
          isMerging={isMerging}
          isDisabled={isLoadingCases || blockingReason != null || isFetchingPreview || isMerging}
          onCancel={onClose}
          onMerge={onMerge}
        />
      </EuiFlyout>
    );
  }
);
MergeCasesFlyout.displayName = 'MergeCasesFlyout';
