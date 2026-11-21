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
  EuiSelectable,
  EuiSpacer,
  EuiText,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import type { EuiSelectableOption } from '@elastic/eui';
import { css } from '@emotion/react';
import {
  DEFAULT_DETECTIONS_CLOSE_REASONS_KEY,
  getDefaultClosingReasonLabel,
} from '@kbn/response-ops-detections-close-reason';
import { INVESTIGATION_LIMITS } from '../../../../common/investigations/constants';
import { findStatusByKey, getEffectiveStatuses } from '../../../../common/investigations/statuses';
import {
  CLOSE_REASONS,
  CLOSE_REASON_TO_VERDICT,
  MAX_CLOSE_REASON_LENGTH,
  VERDICT_LABELS,
} from '../../../../common/investigations/types';
import { parseCaseFieldErrors } from '../../../../common/investigations/template_fields';
import type { RecordCounters, TaskItem, Verdict } from '../../../../common/investigations/types';
import {
  getHttpErrorMessage,
  useCloseRecord,
  useInvestigationsNavigation,
  useItems,
  useStatuses,
} from '../../hooks';
import { MarkdownEditor } from '../../../components/markdown_editor';
import { ICONS } from '../../icons';
import { useInvestigationsServices } from '../../services';
import { collectExtendedFieldValues } from '../fields/field_utils';
import type { ExtendedFieldsFormApi } from '../fields/extended_fields_form';
import { ServerErrorsCallout } from '../fields/server_errors_callout';
import { ErrorState } from '../shared/error_state';
import { LoadingState } from '../shared/loading_state';
import { CloseRequiredFields } from './close_required_fields';
import type { InvestigationModalProps } from './modal_props';
import * as i18n from './translations';

const MAX_LISTED_TASKS = 8;
const REASON_ROW_HEIGHT = 32;
/** Lens visualisations are not offered in closing notes. */
const DISABLED_UI_PLUGINS = ['lens'];
const NO_LABELS: string[] = [];

/** One plain sentence per list item, from the single message the server refuses with. */
const toMessageList = (message: string): string[] =>
  message
    .split(/\.\s+/)
    .map((part) => part.trim().replace(/\.$/, ''))
    .filter((part) => part.length > 0)
    .map((part) => `${part}.`);

/** What closing with this reason does to the human verdict, in the words Cases uses. */
export const getVerdictLine = (
  closeReason: string,
  aiVerdict: Verdict | null | undefined
): string => {
  const verdict = CLOSE_REASON_TO_VERDICT[closeReason];
  if (!verdict) {
    return i18n.CLOSE_VERDICT_LINE_NONE;
  }
  if (!aiVerdict) {
    return i18n.CLOSE_VERDICT_LINE_SETS(VERDICT_LABELS[verdict]);
  }
  return aiVerdict === verdict
    ? i18n.CLOSE_VERDICT_LINE_AGREES(VERDICT_LABELS[verdict])
    : i18n.CLOSE_VERDICT_LINE_DIFFERS(VERDICT_LABELS[verdict], VERDICT_LABELS[aiVerdict]);
};

interface RequiredTasksSectionProps {
  recordId: string;
  isLoading: boolean;
  error?: unknown;
  onRetry: () => void;
  tasks: TaskItem[];
  onGoToTask: (taskId: string) => void;
}

/** Warns while required tasks are open and links to each of them in the Procedure tab. */
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
    return null;
  }
  return (
    <EuiCallOut
      color="warning"
      iconType={ICONS.warning}
      title={i18n.CLOSE_TASKS_BLOCKED(tasks.length)}
      data-test-subj="investigationCloseBlocked"
    >
      <p>{i18n.CLOSE_TASKS_BLOCKED_BODY}</p>
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

/** What still blocks the confirm button, one plain sentence each. */
const getMissingItems = ({
  hasReason,
  openTasks,
  emptyFields,
}: {
  hasReason: boolean;
  openTasks: number;
  emptyFields: string[];
}): string[] => [
  ...(hasReason ? [] : [i18n.CLOSE_MISSING_REASON]),
  ...(openTasks > 0 ? [i18n.CLOSE_MISSING_TASKS(openTasks)] : []),
  ...emptyFields.map((label) => i18n.CLOSE_MISSING_FIELD(label)),
];

interface CloseReasonSectionProps {
  selectedReason: string | null;
  closeReason: string;
  aiVerdict: Verdict | null | undefined;
  onReasonChange: (reason: string | null) => void;
}

/**
 * Cases' close reasons plus the ones the space adds in the `securitySolution:detectionsCloseReasons`
 * setting (Cases rejects any other custom reason for this owner).
 */
const useCloseReasons = (): string[] => {
  const { uiSettings } = useInvestigationsServices();
  return useMemo(() => {
    const spaceReasons = (uiSettings.get<string[]>(DEFAULT_DETECTIONS_CLOSE_REASONS_KEY) ?? [])
      .map((reason) => reason.trim())
      .filter((reason) => reason && reason.length <= MAX_CLOSE_REASON_LENGTH);
    return Array.from(new Set([...CLOSE_REASONS, ...spaceReasons]));
  }, [uiSettings]);
};

/** The reason picker and the line saying what the reason does. */
const CloseReasonSection: React.FC<CloseReasonSectionProps> = ({
  selectedReason,
  closeReason,
  aiVerdict,
  onReasonChange,
}) => {
  const { euiTheme } = useEuiTheme();
  const listId = useGeneratedHtmlId({ prefix: 'investigationCloseReasons' });
  const reasons = useCloseReasons();
  const options = useMemo<EuiSelectableOption[]>(
    () =>
      reasons.map((reason) => ({
        key: reason,
        label: getDefaultClosingReasonLabel(reason),
        checked: selectedReason === reason ? ('on' as const) : undefined,
        'data-test-subj': `investigationCloseReason-${reason}`,
      })),
    [reasons, selectedReason]
  );

  return (
    <>
      <EuiFormRow label={i18n.CLOSE_REASON_LABEL} fullWidth>
        <EuiSelectable
          id={listId}
          aria-label={i18n.CLOSE_REASON_LABEL}
          singleSelection="always"
          searchable
          searchProps={{
            placeholder: i18n.CLOSE_REASON_SEARCH_PLACEHOLDER,
            compressed: true,
            'data-test-subj': 'investigationCloseReasonSearch',
          }}
          options={options}
          onChange={(next) => {
            const selected = next.find((option) => option.checked === 'on');
            onReasonChange(selected?.key ?? null);
          }}
          listProps={{ bordered: true, rowHeight: REASON_ROW_HEIGHT }}
          height={REASON_ROW_HEIGHT * Math.min(options.length, 5)}
          data-test-subj="investigationCloseReason"
        >
          {(list, search) => (
            <>
              {search}
              {list}
            </>
          )}
        </EuiSelectable>
      </EuiFormRow>
      {selectedReason !== null ? (
        <div
          aria-live="polite"
          css={css`
            margin-block-start: ${euiTheme.size.s};
          `}
          data-test-subj="investigationCloseVerdictLine"
        >
          <EuiText size="s" color="subdued">
            {getVerdictLine(closeReason, aiVerdict)}
          </EuiText>
        </div>
      ) : null}
    </>
  );
};
CloseReasonSection.displayName = 'CloseReasonSection';

/** A plain list of what still has to be done before the confirm button works. */
const MissingList: React.FC<{ items: string[]; isChecking: boolean }> = ({ items, isChecking }) => (
  <EuiText size="s" data-test-subj="investigationCloseMissing">
    <p>
      <strong>{i18n.CLOSE_MISSING_TITLE}</strong>
    </p>
    <ul>
      {isChecking && items.length === 0 ? (
        <li>{i18n.CLOSE_MISSING_CHECKING}</li>
      ) : (
        items.map((item) => <li key={item}>{item}</li>)
      )}
    </ul>
  </EuiText>
);
MissingList.displayName = 'MissingList';

/**
 * Closes the investigation the way Cases closes a case: a reason (a Cases one or a custom one),
 * the human verdict the reason implies, optional closing notes and the fields the type requires.
 */
export const CloseModal: React.FC<InvestigationModalProps> = ({ record, onClose, statusKey }) => {
  const titleId = useGeneratedHtmlId();
  const formId = useGeneratedHtmlId({ prefix: 'investigationCloseForm' });
  const { getRecordPath, navigate } = useInvestigationsNavigation();
  const { mutate: closeRecord, isLoading: isClosing } = useCloseRecord(record.id, {
    silentErrors: true,
  });
  const { data: statusesConfiguration } = useStatuses();
  const requiredFieldsRef = useRef<ExtendedFieldsFormApi | null>(null);
  const [areFieldsLoading, setAreFieldsLoading] = useState(true);
  const [missingFields, setMissingFields] = useState<string[]>(NO_LABELS);

  const [selectedReason, setSelectedReason] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const notesEditorId = useGeneratedHtmlId({ prefix: 'investigationCloseNotes' });
  const [serverErrors, setServerErrors] = useState<string[]>([]);

  const tasksQuery = useItems(record.id, {
    kind: ['task'],
    status: ['open', 'in_progress'],
    per_page: INVESTIGATION_LIMITS.maxPerPage,
  });
  const openRequiredTasks = useMemo(
    () =>
      (tasksQuery.data?.items ?? []).filter(
        (item): item is TaskItem =>
          item.kind === 'task' &&
          item.task.required &&
          (item.status === 'open' || item.status === 'in_progress')
      ),
    [tasksQuery.data]
  );
  const isCheckingTasks = tasksQuery.isLoading;
  const hasTasksError = tasksQuery.isError;

  const targetStatus = statusKey
    ? findStatusByKey(getEffectiveStatuses(statusesConfiguration?.statuses), statusKey)
    : undefined;

  const closeReason = selectedReason ?? '';
  const aiVerdict = record.ai_verdict?.verdict ?? record.agent_verdict?.classification;

  const missing = getMissingItems({
    hasReason: selectedReason !== null,
    openTasks: openRequiredTasks.length,
    emptyFields: missingFields,
  });
  const isChecking = isCheckingTasks || areFieldsLoading;
  const isConfirmDisabled = missing.length > 0 || isChecking || hasTasksError || isClosing;

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setServerErrors([]);
    // Validate the fields the type needs too, so every problem is marked at once.
    const areFieldsValid = (await requiredFieldsRef.current?.trigger()) ?? true;
    if (isConfirmDisabled || !areFieldsValid) {
      return;
    }
    const extendedFields = collectExtendedFieldValues(requiredFieldsRef.current?.getValues() ?? {});
    const closingNotes = notes.trim();
    closeRecord(
      {
        close_reason: closeReason,
        ...(closingNotes ? { summary: closingNotes } : {}),
        ...(statusKey ? { status_key: statusKey } : {}),
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
              : toMessageList(message)
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
        {targetStatus ? (
          <>
            <EuiSpacer size="s" />
            <EuiText size="s" color="subdued" data-test-subj="investigationCloseStatusAfter">
              {i18n.CLOSE_STATUS_AFTER(targetStatus.label)}
            </EuiText>
          </>
        ) : null}
        <EuiSpacer size="m" />
        <EuiForm
          component="form"
          id={formId}
          onSubmit={onSubmit}
          noValidate
          data-test-subj="investigationCloseForm"
        >
          <CloseReasonSection
            selectedReason={selectedReason}
            closeReason={closeReason}
            aiVerdict={aiVerdict}
            onReasonChange={setSelectedReason}
          />
          <EuiSpacer size="m" />
          <EuiFormRow
            label={i18n.CLOSE_NOTES_LABEL}
            labelAppend={
              <EuiText size="xs" color="subdued">
                {i18n.OPTIONAL}
              </EuiText>
            }
            helpText={i18n.CLOSE_NOTES_HELP}
            fullWidth
          >
            <MarkdownEditor
              ariaLabel={i18n.CLOSE_NOTES_LABEL}
              editorId={notesEditorId}
              value={notes}
              onChange={(value) => setNotes(value.slice(0, INVESTIGATION_LIMITS.maxTextLength))}
              height={120}
              disabledUiPlugins={DISABLED_UI_PLUGINS}
              data-test-subj="investigationCloseNotes"
            />
          </EuiFormRow>
        </EuiForm>
        <EuiSpacer size="m" />
        <CloseRequiredFields
          recordId={record.id}
          formApiRef={requiredFieldsRef}
          onLoadingChange={setAreFieldsLoading}
          onMissingChange={setMissingFields}
        />
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
        {isConfirmDisabled && !isClosing ? (
          <>
            <EuiSpacer size="m" />
            <MissingList items={missing} isChecking={isChecking} />
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
              isDisabled={isConfirmDisabled}
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
