/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useRef, useState } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  EuiFormRow,
  EuiLink,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiSelect,
  EuiSpacer,
  EuiTextArea,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { INVESTIGATION_LIMITS } from '../../../../common/investigations/constants';
import {
  CLOSE_REASONS,
  ROOT_CAUSES,
  VERDICT_LABELS,
} from '../../../../common/investigations/types';
import { parseCaseFieldErrors } from '../../../../common/investigations/template_fields';
import type {
  InvestigationRecord,
  RecordCounters,
  TaskItem,
  Verdict,
} from '../../../../common/investigations/types';
import {
  getHttpErrorMessage,
  useCloseRecord,
  useInvestigationsNavigation,
  useItems,
} from '../../hooks';
import { ICONS } from '../../icons';
import { collectExtendedFieldValues } from '../fields/field_utils';
import type { ExtendedFieldsFormApi } from '../fields/extended_fields_form';
import { ServerErrorsCallout } from '../fields/server_errors_callout';
import { ErrorState } from '../shared/error_state';
import { LoadingState } from '../shared/loading_state';
import { CloseRequiredFields } from './close_required_fields';
import type { InvestigationModalProps } from './modal_props';
import * as i18n from './translations';

const MAX_LISTED_TASKS = 8;
const VERDICTS = Object.keys(VERDICT_LABELS) as Verdict[];

const toOptions = (placeholder: string, values: readonly string[]) => [
  { value: '', text: placeholder },
  ...values.map((value) => ({ value, text: value })),
];

const VERDICT_SELECT_OPTIONS = [
  { value: '', text: i18n.CLOSE_VERDICT_PLACEHOLDER },
  ...VERDICTS.map((verdict) => ({ value: verdict, text: VERDICT_LABELS[verdict] })),
];
const REASON_SELECT_OPTIONS = toOptions(i18n.CLOSE_REASON_PLACEHOLDER, CLOSE_REASONS);
const CAUSE_SELECT_OPTIONS = toOptions(i18n.CLOSE_CAUSE_PLACEHOLDER, ROOT_CAUSES);

const isVerdict = (value: string): value is Verdict =>
  VERDICTS.some((verdict) => verdict === value);

const VERDICT_SENTENCES: Record<Verdict | 'none', string> = {
  true_positive: i18n.CLOSE_DRAFT_TRUE_POSITIVE,
  benign: i18n.CLOSE_DRAFT_BENIGN,
  inconclusive: i18n.CLOSE_DRAFT_INCONCLUSIVE,
  none: i18n.CLOSE_DRAFT_INCONCLUSIVE,
};

/** A starting point for the closing summary, written for readers outside the SOC. */
export const getCloseDraft = (
  record: Pick<InvestigationRecord, 'summary' | 'title'>,
  verdict: Verdict | ''
): string => {
  const lead = (record.summary ?? '').trim() || record.title.trim();
  const leadSentence = /[.!?]$/.test(lead) ? lead : `${lead}.`;
  return `${leadSentence} ${VERDICT_SENTENCES[verdict || 'none']} ${i18n.CLOSE_DRAFT_TAIL}`;
};

interface FormErrors {
  verdict: boolean;
  reason: boolean;
  rootCause: boolean;
  summary: boolean;
}

interface RequiredTasksSectionProps {
  recordId: string;
  isLoading: boolean;
  error?: unknown;
  onRetry: () => void;
  tasks: TaskItem[];
  onGoToTask: (taskId: string) => void;
}

/** Blocks closing while required tasks are open and links to each of them in the Procedure tab. */
const RequiredTasksSection: React.FC<RequiredTasksSectionProps> = ({
  recordId,
  isLoading,
  error,
  onRetry,
  tasks,
  onGoToTask,
}) => {
  const { euiTheme } = useEuiTheme();
  const { getRecordPath, getHref } = useInvestigationsNavigation();
  const listedTasks = tasks.slice(0, MAX_LISTED_TASKS);
  const hiddenTasks = tasks.length - listedTasks.length;

  if (isLoading) {
    return <LoadingState label={i18n.CLOSE_TASKS_LOADING} size="m" />;
  }
  if (error) {
    return <ErrorState title={i18n.CLOSE_TASKS_ERROR} error={error} onRetry={onRetry} />;
  }
  if (tasks.length === 0) {
    return (
      <EuiCallOut
        announceOnMount
        size="s"
        color="success"
        iconType={ICONS.check}
        title={i18n.CLOSE_TASKS_DONE}
        data-test-subj="investigationCloseTasksDone"
      />
    );
  }
  return (
    <EuiCallOut
      color="danger"
      iconType={ICONS.warning}
      title={i18n.CLOSE_TASKS_BLOCKED(tasks.length)}
      data-test-subj="investigationCloseBlocked"
    >
      <ul
        css={css`
          margin: 0;
          padding-inline-start: ${euiTheme.size.base};
          list-style: disc;
        `}
      >
        {listedTasks.map((task) => (
          <li key={task.id}>
            <EuiLink
              href={getHref(getRecordPath(recordId, { tab: 'procedure', itemId: task.id }))}
              onClick={(event: React.MouseEvent) => {
                event.preventDefault();
                onGoToTask(task.id);
              }}
              data-test-subj={`investigationCloseTaskLink-${task.id}`}
            >
              {task.title}
            </EuiLink>
          </li>
        ))}
        {hiddenTasks > 0 ? <li>{i18n.CLOSE_TASKS_MORE(hiddenTasks)}</li> : null}
      </ul>
    </EuiCallOut>
  );
};
RequiredTasksSection.displayName = 'RequiredTasksSection';

/** What closing does besides closing: unreviewed conclusions, withdrawn proposals, closed alerts. */
const CloseNotices: React.FC<{ counters: RecordCounters }> = ({ counters }) => {
  const {
    claims_needs_review: unreviewedClaims,
    proposals_pending: pendingProposals,
    alerts,
  } = counters;

  return (
    <>
      {unreviewedClaims > 0 ? (
        <>
          <EuiSpacer size="s" />
          <EuiCallOut
            announceOnMount
            size="s"
            color="warning"
            iconType={ICONS.warning}
            title={i18n.CLOSE_CLAIMS_UNREVIEWED(unreviewedClaims)}
            data-test-subj="investigationCloseClaimsWarning"
          />
        </>
      ) : null}
      {pendingProposals > 0 ? (
        <>
          <EuiSpacer size="s" />
          <EuiCallOut
            announceOnMount
            size="s"
            iconType={ICONS.info}
            title={i18n.CLOSE_PROPOSALS_PENDING(pendingProposals)}
            data-test-subj="investigationCloseProposalsWarning"
          />
        </>
      ) : null}
      {alerts > 0 ? (
        <>
          <EuiSpacer size="s" />
          <EuiCallOut
            announceOnMount
            size="s"
            iconType={ICONS.info}
            title={i18n.CLOSE_ALERTS_NOTE(alerts)}
            data-test-subj="investigationCloseAlertsNote"
          />
        </>
      ) : null}
    </>
  );
};
CloseNotices.displayName = 'CloseNotices';

/** Closes the investigation with a verdict, reason, root cause and summary. */
export const CloseModal: React.FC<InvestigationModalProps> = ({ record, onClose }) => {
  const titleId = useGeneratedHtmlId();
  const formId = useGeneratedHtmlId({ prefix: 'investigationCloseForm' });
  const { getRecordPath, navigate } = useInvestigationsNavigation();
  const { mutate: closeRecord, isLoading: isClosing } = useCloseRecord(record.id, {
    silentErrors: true,
  });
  const requiredFieldsRef = useRef<ExtendedFieldsFormApi | null>(null);
  const [areFieldsLoading, setAreFieldsLoading] = useState(true);

  const initialVerdict = record.analyst_verdict?.verdict ?? '';
  const [verdict, setVerdict] = useState<Verdict | ''>(initialVerdict);
  const [reason, setReason] = useState('');
  const [rootCause, setRootCause] = useState('');
  const [summary, setSummary] = useState(() => getCloseDraft(record, initialVerdict));
  const [isSummaryEdited, setIsSummaryEdited] = useState(false);
  const [showErrors, setShowErrors] = useState(false);
  const [serverErrors, setServerErrors] = useState<string[]>([]);

  const tasksQuery = useItems(record.id, {
    kind: ['task'],
    status: ['todo', 'doing'],
    per_page: INVESTIGATION_LIMITS.maxPerPage,
  });
  const openRequiredTasks = useMemo(
    () =>
      (tasksQuery.data?.items ?? []).filter(
        (item): item is TaskItem =>
          item.kind === 'task' &&
          item.task.required &&
          item.status !== 'done' &&
          item.status !== 'skipped'
      ),
    [tasksQuery.data]
  );
  const isBlocked = openRequiredTasks.length > 0;
  const isCheckingTasks = tasksQuery.isLoading;
  const hasTasksError = tasksQuery.isError;

  const errors: FormErrors = {
    verdict: verdict === '',
    reason: reason === '',
    rootCause: rootCause === '',
    summary: summary.trim() === '',
  };
  const hasErrors = Object.values(errors).some(Boolean);

  const onVerdictChange = (value: string) => {
    const next = isVerdict(value) ? value : '';
    setVerdict(next);
    if (!isSummaryEdited) {
      setSummary(getCloseDraft(record, next));
    }
  };

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setServerErrors([]);
    // Validate the fields the type needs too, so every problem is marked at once.
    const areFieldsValid = (await requiredFieldsRef.current?.trigger()) ?? true;
    if (hasErrors || verdict === '') {
      setShowErrors(true);
      return;
    }
    if (!areFieldsValid) {
      return;
    }
    const extendedFields = collectExtendedFieldValues(requiredFieldsRef.current?.getValues() ?? {});
    closeRecord(
      {
        verdict,
        reason,
        root_cause: rootCause,
        summary: summary.trim(),
        ...(Object.keys(extendedFields).length > 0 ? { extended_fields: extendedFields } : {}),
      },
      {
        onSuccess: onClose,
        onError: (error) => {
          // Errors that name a field are shown at it; the rest are listed in the modal.
          const message = getHttpErrorMessage(error);
          const fieldErrors = parseCaseFieldErrors(message);
          setServerErrors(
            fieldErrors.length > 0
              ? requiredFieldsRef.current?.showServerErrors(fieldErrors) ??
                  fieldErrors.map((fieldError) => fieldError.message)
              : [message]
          );
        },
      }
    );
  };

  const goToTask = (taskId: string) => {
    navigate(getRecordPath(record.id, { tab: 'procedure', itemId: taskId }));
    onClose();
  };

  return (
    <EuiModal
      onClose={onClose}
      aria-labelledby={titleId}
      css={css`
        width: min(680px, 100%);
      `}
      data-test-subj="investigationCloseModal"
    >
      <EuiModalHeader>
        <EuiModalHeaderTitle id={titleId}>{i18n.CLOSE_TITLE}</EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody>
        <RequiredTasksSection
          recordId={record.id}
          isLoading={isCheckingTasks}
          error={hasTasksError ? tasksQuery.error : undefined}
          onRetry={() => tasksQuery.refetch()}
          tasks={openRequiredTasks}
          onGoToTask={goToTask}
        />
        <CloseNotices counters={record.counters} />
        <EuiSpacer size="m" />
        <CloseRequiredFields
          recordId={record.id}
          formApiRef={requiredFieldsRef}
          onLoadingChange={setAreFieldsLoading}
        />
        <EuiForm
          component="form"
          id={formId}
          onSubmit={onSubmit}
          noValidate
          isInvalid={showErrors && hasErrors}
          error={showErrors && hasErrors ? i18n.CLOSE_FORM_INCOMPLETE : undefined}
          data-test-subj="investigationCloseForm"
        >
          <EuiFormRow
            label={i18n.CLOSE_VERDICT_LABEL}
            isInvalid={showErrors && errors.verdict}
            error={i18n.CLOSE_REQUIRED_FIELD}
            fullWidth
          >
            <EuiSelect
              fullWidth
              options={VERDICT_SELECT_OPTIONS}
              value={verdict}
              onChange={(event) => onVerdictChange(event.target.value)}
              isInvalid={showErrors && errors.verdict}
              data-test-subj="investigationCloseVerdict"
            />
          </EuiFormRow>
          <EuiFormRow
            label={i18n.CLOSE_REASON_LABEL}
            isInvalid={showErrors && errors.reason}
            error={i18n.CLOSE_REQUIRED_FIELD}
            fullWidth
          >
            <EuiSelect
              fullWidth
              options={REASON_SELECT_OPTIONS}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              isInvalid={showErrors && errors.reason}
              data-test-subj="investigationCloseReason"
            />
          </EuiFormRow>
          <EuiFormRow
            label={i18n.CLOSE_CAUSE_LABEL}
            isInvalid={showErrors && errors.rootCause}
            error={i18n.CLOSE_REQUIRED_FIELD}
            fullWidth
          >
            <EuiSelect
              fullWidth
              options={CAUSE_SELECT_OPTIONS}
              value={rootCause}
              onChange={(event) => setRootCause(event.target.value)}
              isInvalid={showErrors && errors.rootCause}
              data-test-subj="investigationCloseRootCause"
            />
          </EuiFormRow>
          <EuiFormRow
            label={i18n.CLOSE_SUMMARY_LABEL}
            helpText={i18n.CLOSE_SUMMARY_HELP}
            isInvalid={showErrors && errors.summary}
            error={i18n.CLOSE_REQUIRED_FIELD}
            fullWidth
          >
            <EuiTextArea
              fullWidth
              rows={5}
              maxLength={INVESTIGATION_LIMITS.maxTextLength}
              value={summary}
              onChange={(event) => {
                setSummary(event.target.value);
                setIsSummaryEdited(true);
              }}
              isInvalid={showErrors && errors.summary}
              data-test-subj="investigationCloseSummary"
            />
          </EuiFormRow>
        </EuiForm>
        {serverErrors.length > 0 ? (
          <>
            <EuiSpacer size="m" />
            <ServerErrorsCallout
              messages={serverErrors}
              title={i18n.CLOSE_SERVER_ERROR_TITLE}
              data-test-subj="investigationCloseServerError"
            />
          </>
        ) : null}
      </EuiModalBody>
      <EuiModalFooter>
        <EuiFlexGroup justifyContent="flexEnd" gutterSize="s" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty onClick={onClose} isDisabled={isClosing}>
              {i18n.CANCEL}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              fill
              type="submit"
              form={formId}
              isLoading={isClosing}
              isDisabled={
                isBlocked || isCheckingTasks || hasTasksError || isClosing || areFieldsLoading
              }
              data-test-subj="investigationCloseConfirm"
            >
              {i18n.CLOSE_CONFIRM}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiModalFooter>
    </EuiModal>
  );
};
CloseModal.displayName = 'CloseModal';
