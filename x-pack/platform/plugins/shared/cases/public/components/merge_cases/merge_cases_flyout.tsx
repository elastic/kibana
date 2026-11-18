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
import { KbnWarningCallout } from '@kbn/ui-callout';
import {
  MAX_CASES_TO_MERGE,
  MAX_COMMENT_LENGTH,
  MIN_CASES_TO_MERGE,
} from '../../../common/constants';
import type { MergeCasesResponse } from '../../../common/types/api';
import type { CaseSeverity } from '../../../common/types/domain';
import { CaseStatuses } from '../../../common/types/domain';
import { useCasesFeatures } from '../../common/use_cases_features';
import type { CasesUI } from '../../containers/types';
import { useGetMergeCasesPreview } from '../../containers/use_get_merge_cases_preview';
import { useCasesContext } from '../cases_context/use_cases_context';
import { CancelCreationConfirmationModal } from '../create/cancel_creation_confirmation_modal';
import { CaseDetailsLink } from '../links';
import { SeverityHealth } from '../severity/config';
import { MergeAddCases } from './merge_add_cases';
import { MergeAttachmentsSection } from './merge_attachments_section';
import { MergeCaseDetailsSection } from './merge_case_details_section';
import { MergeSectionTitle } from './merge_section_title';
import type { MergeOrigin } from './use_merge_cases';
import { getMergeBlockedAttributes, useMergeCases } from './use_merge_cases';
import type { MergeCaseSummary } from './use_merge_flyout_state';
import { toMergeCaseSummary, useMergeFlyoutState } from './use_merge_flyout_state';
import {
  applyExclusions,
  buildAttachmentsRequest,
  buildMergeRequest,
  buildPreviewFields,
  getAttachmentsToCopyCount,
  getCaseReference,
  getConflictKey,
  getFieldValues,
  getMergeBlockingReason,
  getUnresolvedConflicts,
} from './utils';
import * as i18n from './translations';

const NEW_CASE_VALUE = '';

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
          <EuiButtonEmpty
            onClick={onCancel}
            isDisabled={isMerging}
            data-test-subj="merge-cases-cancel"
          >
            {i18n.CANCEL}
          </EuiButtonEmpty>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiFlexGroup alignItems="center" gutterSize="m" responsive={false}>
            <EuiFlexItem grow={false}>
              {/* Announces why the merge is blocked, or what it will do, as it changes. */}
              <div
                role="status"
                aria-live="polite"
                aria-atomic="true"
                data-test-subj="merge-cases-footer-status"
              >
                <MergeCasesFlyoutFooterStatus
                  isLoadingCases={isLoadingCases}
                  blockingReason={blockingReason}
                  summary={summary}
                />
              </div>
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

export interface MergeCasesFlyoutProps {
  initialCases: CasesUI;
  /** Where the flyout was opened: the case list, or a case page (with that case added). */
  origin: MergeOrigin;
  onClose: () => void;
  onMerged: (response: MergeCasesResponse) => void;
}

export const MergeCasesFlyout = React.memo<MergeCasesFlyoutProps>(
  ({ initialCases, origin, onClose, onMerged }) => {
    const flyoutTitleId = useGeneratedHtmlId({ prefix: 'mergeCasesFlyoutTitle' });
    const { permissions } = useCasesContext();
    const { caseAssignmentAuthorized } = useCasesFeatures();
    const [isDiscardModalOpen, setIsDiscardModalOpen] = useState(false);

    const initialSummaries = useMemo(() => initialCases.map(toMergeCaseSummary), [initialCases]);
    const {
      state,
      isDirty,
      setField,
      setCustomField,
      setExtendedField,
      addCase,
      removeCase,
      setDestination,
      setExclusions,
      setCloseSources,
      setNote,
      markForReview,
      dismissChangedNotice,
    } = useMergeFlyoutState({ initialCases: initialSummaries, canCreate: permissions.create });
    const { choices, needsReview, excludedKeys, closeSources, note, destinationCaseId } = state;

    const caseIds = useMemo(() => state.cases.map(({ id }) => id), [state.cases]);
    const previewFields = useMemo(
      () =>
        buildPreviewFields({
          template: choices.template,
          customFields: choices.customFields,
          extendedFields: choices.extendedFields,
        }),
      [choices.customFields, choices.extendedFields, choices.template]
    );

    const {
      data: preview,
      isLoading: isLoadingPreview,
      isFetching: isFetchingPreview,
    } = useGetMergeCasesPreview({ caseIds, destinationCaseId, fields: previewFields });
    const { mutate: mergeCases, isLoading: isMerging } = useMergeCases();

    // The preview has the cases' current status and counts; until it arrives, show the selection.
    const tableCases = useMemo<MergeCaseSummary[]>(() => {
      const previewCasesById = new Map(
        (preview?.cases ?? []).map((theCase) => [theCase.id, theCase])
      );
      return state.cases.map((theCase) => {
        const previewCase = previewCasesById.get(theCase.id);
        return previewCase != null ? { ...theCase, ...previewCase } : theCase;
      });
    }, [preview?.cases, state.cases]);
    const casesById = useMemo(
      () => new Map((preview?.cases ?? []).map((theCase) => [theCase.id, theCase])),
      [preview?.cases]
    );

    const values = useMemo(
      () => (preview != null ? getFieldValues(preview, choices) : undefined),
      [choices, preview]
    );
    const unresolvedConflicts = useMemo(
      () => (preview != null ? getUnresolvedConflicts(preview, choices, needsReview) : []),
      [choices, needsReview, preview]
    );
    const unresolvedKeys = useMemo(
      () => new Set(unresolvedConflicts.map((conflict) => getConflictKey(conflict))),
      [unresolvedConflicts]
    );
    const selectedAttachments = useMemo(
      () => (preview != null ? applyExclusions(preview, excludedKeys) : undefined),
      [excludedKeys, preview]
    );

    const destinationCase =
      destinationCaseId != null ? tableCases.find(({ id }) => id === destinationCaseId) : undefined;
    const destinationRef = destinationCase != null ? getCaseReference(destinationCase) : undefined;
    const sources = tableCases.filter(({ id }) => id !== destinationCaseId);
    const sourcesToClose = sources.filter(({ status }) => status !== CaseStatuses.closed);
    const openCases = tableCases.filter(({ status }) => status !== CaseStatuses.closed);
    const canChooseDestination = permissions.create || destinationCaseId != null;
    const includeAssignees =
      caseAssignmentAuthorized && (preview?.fields.assignees.canChange ?? false);

    const isLoadingCases = caseIds.length >= MIN_CASES_TO_MERGE && preview == null;

    const blockingReason = useMemo(() => {
      if (caseIds.length < MIN_CASES_TO_MERGE) {
        return i18n.BLOCKED_ADD_ANOTHER_CASE;
      }

      if (preview == null || selectedAttachments == null || values == null) {
        return undefined;
      }

      return getMergeBlockingReason({
        caseCount: caseIds.length,
        canChooseDestination,
        preview,
        attachments: selectedAttachments,
        values,
        unresolvedConflicts,
        includeAssignees,
      });
    }, [
      canChooseDestination,
      caseIds.length,
      includeAssignees,
      preview,
      selectedAttachments,
      unresolvedConflicts,
      values,
    ]);

    const summary = useMemo(() => {
      if (selectedAttachments == null) {
        return '';
      }

      const attachmentsToCopy = getAttachmentsToCopyCount(selectedAttachments);
      const copies =
        destinationRef != null
          ? i18n.SUMMARY_COPIES_EXISTING_CASE(attachmentsToCopy, destinationRef)
          : i18n.SUMMARY_COPIES_NEW_CASE(attachmentsToCopy);

      return closeSources && sourcesToClose.length > 0
        ? `${copies} ${i18n.SUMMARY_CLOSES(sourcesToClose.length)}`
        : copies;
    }, [closeSources, destinationRef, selectedAttachments, sourcesToClose.length]);

    const requestClose = useCallback(() => {
      if (isMerging) {
        return;
      }
      if (isDirty) {
        setIsDiscardModalOpen(true);
        return;
      }
      onClose();
    }, [isDirty, isMerging, onClose]);

    const onMerge = useCallback(() => {
      if (preview == null) {
        return;
      }

      mergeCases(
        {
          request: buildMergeRequest({
            caseIds,
            destinationCaseId,
            choices,
            includeAssignees,
            closeSources,
            note,
            attachments: buildAttachmentsRequest(preview.choices, excludedKeys),
          }),
          origin,
        },
        {
          onSuccess: onMerged,
          onError: (error) => {
            const blocked = getMergeBlockedAttributes(error);
            if (blocked != null) {
              // The preview refetches on its own; ask the user to look at what the server named.
              markForReview(blocked.conflicts.map((conflict) => getConflictKey(conflict)));
            }
          },
        }
      );
    }, [
      caseIds,
      choices,
      closeSources,
      destinationCaseId,
      excludedKeys,
      includeAssignees,
      markForReview,
      mergeCases,
      note,
      onMerged,
      origin,
      preview,
    ]);

    const destinationOptions = useMemo<Array<EuiSuperSelectOption<string>>>(
      () => [
        {
          value: NEW_CASE_VALUE,
          inputDisplay: i18n.NEW_CASE,
          disabled: !permissions.create,
          // Without create, the row's help text says why "New case" is disabled.
          dropdownDisplay: (
            <EuiText size="s" color={permissions.create ? 'default' : 'subdued'}>
              {i18n.NEW_CASE}
            </EuiText>
          ),
          'data-test-subj': 'merge-cases-destination-new',
        },
        ...openCases.map((theCase) => ({
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
      [openCases, permissions.create]
    );

    const caseColumns = useMemo<Array<EuiBasicTableColumn<MergeCaseSummary>>>(
      () => [
        {
          name: i18n.CASE_COLUMN,
          truncateText: true,
          render: (theCase: MergeCaseSummary) => (
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
          render: (status: MergeCaseSummary['status']) => <Status status={status} />,
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
              name: (theCase: MergeCaseSummary) => i18n.REMOVE_CASE(getCaseReference(theCase)),
              description: (theCase: MergeCaseSummary) =>
                i18n.REMOVE_CASE(getCaseReference(theCase)),
              render: (theCase: MergeCaseSummary) => (
                <EuiToolTip
                  content={i18n.REMOVE_CASE(getCaseReference(theCase))}
                  disableScreenReaderOutput
                >
                  <EuiButtonIcon
                    iconType="cross"
                    color="text"
                    isDisabled={isMerging}
                    onClick={() => removeCase(theCase.id)}
                    aria-label={i18n.REMOVE_CASE(getCaseReference(theCase))}
                    data-test-subj={`merge-cases-remove-${theCase.id}`}
                  />
                </EuiToolTip>
              ),
            },
          ],
        },
      ],
      [isMerging, removeCase]
    );

    const isControlsDisabled = isMerging;
    return (
      <>
        <EuiFlyout
          ownFocus
          size="m"
          onClose={requestClose}
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
            {state.showChangedNotice ? (
              <>
                <KbnWarningCallout
                  size="s"
                  title={i18n.CASES_CHANGED_TITLE}
                  text={i18n.CASES_CHANGED_BODY}
                  onDismiss={dismissChangedNotice}
                  data-test-subj="merge-cases-changed-callout"
                />
                <EuiSpacer size="m" />
              </>
            ) : null}
            <EuiFormRow
              fullWidth
              label={i18n.MERGE_INTO}
              helpText={
                destinationRef != null
                  ? i18n.EXISTING_DESTINATION_HELP(destinationRef)
                  : !permissions.create
                  ? i18n.NEW_CASE_NO_PERMISSION
                  : tableCases.some(({ status }) => status === CaseStatuses.closed)
                  ? i18n.CLOSED_CASES_NOT_OFFERED
                  : undefined
              }
            >
              <EuiSuperSelect
                fullWidth
                options={destinationOptions}
                valueOfSelected={destinationCaseId ?? NEW_CASE_VALUE}
                onChange={(value) => setDestination(value === NEW_CASE_VALUE ? undefined : value)}
                disabled={isControlsDisabled}
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
            <EuiBasicTable
              compressed
              tableCaption={i18n.CASES_SECTION}
              items={tableCases}
              itemId="id"
              columns={caseColumns}
              data-test-subj="merge-cases-table"
            />
            <EuiSpacer size="s" />
            <MergeAddCases
              selectedCases={state.cases}
              owner={state.cases[0]?.owner}
              onAddCase={addCase}
              isDisabled={isControlsDisabled}
            />

            <EuiSpacer size="l" />
            {preview != null && values != null ? (
              <MergeCaseDetailsSection
                preview={preview}
                values={values}
                choices={choices}
                unresolvedKeys={unresolvedKeys}
                onSetField={setField}
                onSetCustomField={setCustomField}
                onSetExtendedField={setExtendedField}
                destinationRef={destinationRef}
                showAssignees={caseAssignmentAuthorized}
                isDisabled={isControlsDisabled}
              />
            ) : (
              <>
                <MergeSectionTitle title={i18n.CASE_DETAILS_SECTION} />
                <EuiSpacer size="s" />
                {isLoadingPreview || isLoadingCases ? <EuiSkeletonText lines={5} /> : null}
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
                onChangeExclusions={setExclusions}
                destinationRef={destinationRef}
                isDisabled={isControlsDisabled}
              />
            ) : isLoadingPreview || isLoadingCases ? (
              <EuiSkeletonText lines={3} />
            ) : null}

            <EuiSpacer size="l" />
            <MergeSectionTitle title={i18n.AFTER_MERGING_SECTION} />
            <EuiSpacer size="s" />
            {sourcesToClose.length > 0 ? (
              <EuiFormRow
                fullWidth
                helpText={
                  destinationRef != null
                    ? i18n.CLOSE_SOURCES_HELP_EXISTING_CASE(destinationRef, sourcesToClose.length)
                    : i18n.CLOSE_SOURCES_HELP
                }
              >
                <EuiCheckbox
                  id={`${flyoutTitleId}-close-sources`}
                  label={i18n.CLOSE_SOURCES(sourcesToClose.length)}
                  checked={closeSources}
                  disabled={isControlsDisabled}
                  onChange={(event) => setCloseSources(event.target.checked)}
                  data-test-subj="merge-cases-close-sources"
                />
              </EuiFormRow>
            ) : sources.length > 0 ? (
              <EuiText size="s" color="subdued" data-test-subj="merge-cases-no-sources-to-close">
                {i18n.NO_SOURCES_TO_CLOSE}
              </EuiText>
            ) : null}
            <EuiSpacer size="s" />
            {note != null ? (
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
                onClick={() => setNote('')}
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
            onCancel={requestClose}
            onMerge={onMerge}
          />
        </EuiFlyout>
        {isDiscardModalOpen ? (
          <CancelCreationConfirmationModal
            title={i18n.DISCARD_TITLE}
            confirmButtonText={i18n.DISCARD_CONFIRM}
            cancelButtonText={i18n.KEEP_EDITING}
            onConfirm={() => {
              setIsDiscardModalOpen(false);
              onClose();
            }}
            onCancel={() => setIsDiscardModalOpen(false)}
          />
        ) : null}
      </>
    );
  }
);
MergeCasesFlyout.displayName = 'MergeCasesFlyout';
