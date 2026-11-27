/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { css } from '@emotion/react';
import type { EuiStepsHorizontalProps, EuiStepStatus } from '@elastic/eui';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiIcon,
  EuiSkeletonText,
  EuiSpacer,
  EuiStepsHorizontal,
  EuiText,
  EuiTitle,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { KbnWarningCallout } from '@kbn/ui-callout';
import type { MergeCasesResponse } from '../../../common/types/api';
import { useCasesFeatures } from '../../common/use_cases_features';
import type { CasesUI } from '../../containers/types';
import { useGetMergeCasesPreview } from '../../containers/use_get_merge_cases_preview';
import { useCasesContext } from '../cases_context/use_cases_context';
import { CancelCreationConfirmationModal } from '../create/cancel_creation_confirmation_modal';
import { AttachmentsStep } from './steps/attachments_step';
import { CasesStep, CasesStepBar } from './steps/cases_step';
import { MERGE_INTO_COMPACT_SAVING } from './steps/merge_into_choice';
import { useCompactOnScroll } from './steps/use_compact_on_scroll';
import { ConflictsBar } from './steps/conflicts_bar';
import { DifferencesStep } from './steps/differences_step';
import { ReviewStep } from './steps/review_step';
import type { MergeOrigin } from './use_merge_cases';
import { getMergeBlockedAttributes, useMergeCases } from './use_merge_cases';
import type { MergeCaseSummary } from './use_merge_flyout_state';
import { toMergeCaseSummary, useMergeFlyoutState } from './use_merge_flyout_state';
import { useMergeAiAvailability } from './use_merge_ai_availability';
import type { MergeFieldKey, MergeStep, MergeStepStates } from './utils';
import {
  MERGE_STEPS,
  applyExclusions,
  buildAttachmentsRequest,
  buildMergeRequest,
  buildPreviewFields,
  canOpenStep,
  getAttachmentsStepBlocker,
  getCaseReference,
  getCasesStepBlocker,
  getConflictKey,
  getDifferencesStepBlocker,
  getFirstBlockedStep,
  getNextStep,
  getPreviousStep,
  isDifferencesStepSkippable,
} from './utils';
import { focusFieldRow } from './value_cards/field_row';
import { getDifferencesSummary } from './value_cards/field_state';
import * as i18n from './translations';

const STEP_TITLES: Record<MergeStep, string> = {
  cases: i18n.STEP_CASES,
  differences: i18n.STEP_DIFFERENCES,
  attachments: i18n.STEP_ATTACHMENTS,
  review: i18n.STEP_REVIEW,
};

const ATTACHMENT_LIMIT_KINDS = new Set(['alerts', 'observables', 'other']);

const scrollToField = (fieldKey: MergeFieldKey) => focusFieldRow(fieldKey, { smooth: true });

interface MergeCasesFlyoutFooterProps {
  step: MergeStep;
  status: string;
  isBlocked: boolean;
  isMerging: boolean;
  nextLabel?: string;
  mergeLabel: string;
  isNextDisabled: boolean;
  onCancel: () => void;
  onBack: () => void;
  onNext: () => void;
  onMerge: () => void;
}

const MergeCasesFlyoutFooter = React.memo<MergeCasesFlyoutFooterProps>(
  ({
    step,
    status,
    isBlocked,
    isMerging,
    nextLabel,
    mergeLabel,
    isNextDisabled,
    onCancel,
    onBack,
    onNext,
    onMerge,
  }) => (
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
              {/* Announces why the user can't go on, as it changes. */}
              <div
                role="status"
                aria-live="polite"
                aria-atomic="true"
                data-test-subj="merge-cases-footer-status"
              >
                {status.length > 0 ? (
                  <EuiText
                    size="s"
                    color={isBlocked ? 'warning' : 'subdued'}
                    data-test-subj={
                      isBlocked ? 'merge-cases-blocking-reason' : 'merge-cases-footer-message'
                    }
                  >
                    {isBlocked ? <EuiIcon type="warning" aria-hidden={true} /> : null} {status}
                  </EuiText>
                ) : null}
              </div>
            </EuiFlexItem>
            {step !== 'cases' ? (
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty
                  onClick={onBack}
                  isDisabled={isMerging}
                  data-test-subj="merge-cases-back"
                >
                  {i18n.BACK}
                </EuiButtonEmpty>
              </EuiFlexItem>
            ) : null}
            <EuiFlexItem grow={false}>
              {step === 'review' ? (
                <EuiButton
                  fill
                  onClick={onMerge}
                  isLoading={isMerging}
                  isDisabled={isNextDisabled || isMerging}
                  data-test-subj="merge-cases-submit"
                >
                  {isMerging ? i18n.MERGING : mergeLabel}
                </EuiButton>
              ) : (
                <EuiButton
                  fill
                  onClick={onNext}
                  isDisabled={isNextDisabled}
                  data-test-subj="merge-cases-next"
                >
                  {nextLabel}
                </EuiButton>
              )}
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
    const { euiTheme } = useEuiTheme();
    const { permissions } = useCasesContext();
    const { caseAssignmentAuthorized } = useCasesFeatures();
    const [isDiscardModalOpen, setIsDiscardModalOpen] = useState(false);
    const [minWidth, setMinWidth] = useState<number>();
    const [bodyScroller, setBodyScroller] = useState<HTMLDivElement | null>(null);
    // The width it opens at is the narrowest the steps are laid out for, so it can only grow.
    const keepOpeningWidth = useCallback((flyout: HTMLElement | null) => {
      if (flyout != null) {
        setMinWidth((current) => current ?? flyout.offsetWidth);
      }
    }, []);

    const initialSummaries = useMemo(() => initialCases.map(toMergeCaseSummary), [initialCases]);
    const {
      state,
      isDirty,
      setField,
      setCustomField,
      setExtendedField,
      clearField,
      addCase,
      removeCase,
      setMergeInto,
      setDestination,
      setExclusions,
      setCloseSources,
      markForReview,
      dismissChangedNotice,
      applyChoices,
      applyAiResolution,
      goTo,
    } = useMergeFlyoutState({ initialCases: initialSummaries, canCreate: permissions.create });
    const isAiAvailable = useMergeAiAvailability();
    const {
      choices,
      needsReview,
      aiReasons,
      excludedKeys,
      closeSources,
      mergeInto,
      destinationCaseId,
      step,
    } = state;
    const isCasesBarCompact = useCompactOnScroll(
      step === 'cases' ? bodyScroller : null,
      MERGE_INTO_COMPACT_SAVING
    );

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

    const { data: preview, isFetching: isFetchingPreview } = useGetMergeCasesPreview({
      caseIds,
      destinationCaseId,
      fields: previewFields,
    });
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

    const selectedAttachments = useMemo(
      () => (preview != null ? applyExclusions(preview, excludedKeys) : undefined),
      [excludedKeys, preview]
    );
    const differencesSummary = useMemo(
      () => (preview != null ? getDifferencesSummary(preview, choices, needsReview) : undefined),
      [choices, needsReview, preview]
    );

    const destinationCase =
      destinationCaseId != null ? tableCases.find(({ id }) => id === destinationCaseId) : undefined;
    const destinationRef = destinationCase != null ? getCaseReference(destinationCase) : undefined;
    const canChooseDestination = permissions.create || destinationCaseId != null;
    const includeAssignees =
      caseAssignmentAuthorized && (preview?.fields.assignees.canChange ?? false);

    const stepStates = useMemo<MergeStepStates>(() => {
      const casesBlocker =
        getCasesStepBlocker({
          caseCount: caseIds.length,
          canChooseDestination,
          mergeInto,
          hasDestination: destinationCaseId != null,
        }) ?? (preview == null ? i18n.LOADING_CASES : undefined);
      const attachmentsBlocker =
        selectedAttachments != null
          ? getAttachmentsStepBlocker(selectedAttachments)
          : i18n.LOADING_CASES;
      return {
        cases: { isBlocked: casesBlocker != null, blocker: casesBlocker, isSkippable: false },
        differences:
          differencesSummary != null
            ? {
                isBlocked: differencesSummary.blocking.length > 0,
                blocker: getDifferencesStepBlocker(differencesSummary),
                isSkippable: isDifferencesStepSkippable(differencesSummary),
              }
            : { isBlocked: true, blocker: i18n.LOADING_CASES, isSkippable: false },
        attachments: {
          isBlocked: attachmentsBlocker != null,
          blocker: attachmentsBlocker,
          // Always shown, even with nothing to leave out, so the user sees what gets copied.
          isSkippable: false,
        },
        review: { isBlocked: false, isSkippable: false },
      };
    }, [
      canChooseDestination,
      caseIds.length,
      destinationCaseId,
      differencesSummary,
      mergeInto,
      preview,
      selectedAttachments,
    ]);

    const next = step !== 'review' ? getNextStep(step, stepStates) : undefined;
    const firstBlockedStep = getFirstBlockedStep(stepStates);
    const currentBlocker = stepStates[step].blocker;

    const footerStatus = (() => {
      if (step === 'review') {
        return firstBlockedStep != null
          ? { text: i18n.BLOCKED_ON_STEP(STEP_TITLES[firstBlockedStep]), isBlocked: true }
          : { text: '', isBlocked: false };
      }
      if (currentBlocker != null) {
        return { text: currentBlocker, isBlocked: currentBlocker !== i18n.LOADING_CASES };
      }
      return { text: '', isBlocked: false };
    })();

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

    const onNext = useCallback(() => {
      if (step === 'review') {
        return;
      }
      const { step: nextStep, passed } = getNextStep(step, stepStates);
      goTo(nextStep, { passed });
    }, [goTo, step, stepStates]);

    const onBack = useCallback(
      () => goTo(getPreviousStep(step, stepStates)),
      [goTo, step, stepStates]
    );

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
            attachments: buildAttachmentsRequest(preview.choices, excludedKeys),
          }),
          origin,
        },
        {
          onSuccess: onMerged,
          onError: (error) => {
            const blocked = getMergeBlockedAttributes(error);
            if (blocked == null) {
              return;
            }
            // The preview refetches on its own; take the user to what the server named.
            const keys = blocked.conflicts.map((conflict) => getConflictKey(conflict));
            if (keys.length > 0) {
              markForReview(keys);
              goTo('differences', { focusField: keys[0] });
            } else if (blocked.limits.some(({ kind }) => ATTACHMENT_LIMIT_KINDS.has(kind))) {
              goTo('attachments');
            } else if (blocked.limits.length > 0) {
              goTo('differences');
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
      goTo,
      includeAssignees,
      markForReview,
      mergeCases,
      onMerged,
      origin,
      preview,
    ]);

    const steps = useMemo<EuiStepsHorizontalProps['steps']>(
      () =>
        MERGE_STEPS.map((stepId) => {
          const { isBlocked, isSkippable } = stepStates[stepId];
          const isOpenable = canOpenStep(stepId, stepStates);
          const status: EuiStepStatus =
            stepId === step
              ? 'current'
              : !isOpenable
              ? 'disabled'
              : state.visitedSteps.has(stepId) && isBlocked
              ? 'warning'
              : state.visitedSteps.has(stepId) || isSkippable
              ? 'complete'
              : 'incomplete';
          return {
            title: STEP_TITLES[stepId],
            status,
            disabled: !isOpenable || isMerging,
            onClick: () => goTo(stepId),
            'data-test-subj': `merge-step-${stepId}`,
          };
        }),
      [goTo, isMerging, state.visitedSteps, step, stepStates]
    );

    const isPreviewMissing = preview == null || selectedAttachments == null;

    const renderStepBar = () => {
      if (step === 'cases') {
        return (
          <CasesStepBar
            cases={tableCases}
            mergeInto={mergeInto}
            canCreate={permissions.create}
            onSetMergeInto={setMergeInto}
            isCompact={isCasesBarCompact}
            isDisabled={isMerging}
          />
        );
      }

      if (
        step === 'differences' &&
        preview != null &&
        differencesSummary != null &&
        differencesSummary.total > 0
      ) {
        return (
          <ConflictsBar
            preview={preview}
            caseIds={caseIds}
            destinationCaseId={destinationCaseId}
            choices={choices}
            summary={differencesSummary}
            isAiAvailable={isAiAvailable}
            isDisabled={isMerging}
            onApplyChoices={applyChoices}
            onApplyAiResolution={applyAiResolution}
            onGoToField={scrollToField}
          />
        );
      }

      return null;
    };

    const renderStep = () => {
      if (step === 'cases') {
        return (
          <CasesStep
            cases={tableCases}
            previewCases={preview?.cases ?? []}
            mergeInto={mergeInto}
            destinationCaseId={destinationCaseId}
            onSetDestination={setDestination}
            onAddCase={addCase}
            onRemoveCase={removeCase}
            isDisabled={isMerging}
          />
        );
      }

      if (isPreviewMissing) {
        return <EuiSkeletonText lines={6} />;
      }

      if (step === 'differences') {
        return (
          <DifferencesStep
            preview={preview}
            choices={choices}
            needsReview={needsReview}
            aiReasons={aiReasons}
            destinationCaseId={destinationCaseId}
            caseAssignmentAuthorized={caseAssignmentAuthorized}
            isDisabled={isMerging}
            focusField={state.focusField}
            onSetField={setField}
            onSetCustomField={setCustomField}
            onSetExtendedField={setExtendedField}
            onClearField={clearField}
          />
        );
      }

      if (step === 'attachments') {
        return (
          <AttachmentsStep
            preview={preview}
            attachments={selectedAttachments}
            excludedKeys={excludedKeys}
            onChangeExclusions={setExclusions}
            destinationRef={destinationRef}
            isDisabled={isMerging}
          />
        );
      }

      return (
        <ReviewStep
          preview={preview}
          choices={choices}
          aiReasons={aiReasons}
          attachments={selectedAttachments}
          destinationCaseId={destinationCaseId}
          closeSources={closeSources}
          onSetCloseSources={setCloseSources}
          showAssignees={caseAssignmentAuthorized}
          isDisabled={isMerging}
        />
      );
    };

    return (
      <>
        <EuiFlyout
          ref={keepOpeningWidth}
          ownFocus
          // One width for every step, so the flyout doesn't jump between them.
          size="m"
          resizable
          minWidth={minWidth}
          // A merge in progress shouldn't be lost to a stray click on the page behind it.
          outsideClickCloses={false}
          onClose={requestClose}
          aria-labelledby={flyoutTitleId}
          data-test-subj="merge-cases-flyout"
        >
          <EuiFlyoutHeader hasBorder>
            <EuiTitle size="s">
              <h2 id={flyoutTitleId}>{i18n.FLYOUT_TITLE}</h2>
            </EuiTitle>
            <EuiSpacer size="m" />
            <EuiStepsHorizontal
              size="s"
              steps={steps}
              aria-label={i18n.STEPS_ARIA_LABEL}
              data-test-subj="merge-cases-steps"
            />
          </EuiFlyoutHeader>
          {/* Between the header and the body, so it stays put while the cases or fields scroll. */}
          {renderStepBar()}
          <EuiFlyoutBody
            scrollContainerRef={setBodyScroller}
            css={
              step === 'differences'
                ? css`
                    background: ${euiTheme.colors.backgroundBaseSubdued};
                  `
                : undefined
            }
          >
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
            {renderStep()}
          </EuiFlyoutBody>
          <MergeCasesFlyoutFooter
            step={step}
            status={footerStatus.text}
            isBlocked={footerStatus.isBlocked}
            isMerging={isMerging}
            nextLabel={next != null ? i18n.NEXT : undefined}
            mergeLabel={i18n.MERGE}
            isNextDisabled={
              step === 'review'
                ? firstBlockedStep != null || isFetchingPreview
                : stepStates[step].isBlocked
            }
            onCancel={requestClose}
            onBack={onBack}
            onNext={onNext}
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
