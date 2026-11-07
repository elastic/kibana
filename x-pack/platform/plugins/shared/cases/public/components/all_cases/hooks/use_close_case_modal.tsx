/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { i18n } from '@kbn/i18n';
import type { EuiSelectableOption } from '@elastic/eui';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { IUiSettingsClient } from '@kbn/core-ui-settings-browser';
import {
  DEFAULT_CLOSING_REASON_OPTIONS,
  DEFAULT_DETECTIONS_CLOSE_REASONS_KEY,
} from '@kbn/response-ops-detections-close-reason';

import { CloseCaseModal } from '../components/close_case_modal';
import type { CloseReasonOption } from '../components/close_case_modal';
import type { CaseUI } from '../../../../common/ui/types';
import { useCasesConfig, useToasts } from '../../../common/lib/kibana';
import { createAttachments, getCase } from '../../../containers/api';
import { COMMENT_ATTACHMENT_TYPE } from '../../../../common/constants/attachments';
import { useGetCaseConfiguration } from '../../../containers/configure/use_get_case_configuration';
import { CloseOutcome } from '../components/close_outcome';
import { useCasesFeatures } from '../../../common/use_cases_features';
import { useGetCaseTasks } from '../../../containers/use_case_tasks';
import { useCasesContext } from '../../cases_context/use_cases_context';
import {
  REQUIRED_TASKS_MISSING,
  RequiredTasksCallout,
  isOpenRequiredTask,
} from '../components/required_tasks_callout';

const closeCaseTitle = (incrementalId?: number | null) =>
  incrementalId != null
    ? i18n.translate('xpack.cases.closeCaseModal.titleWithNumber', {
        defaultMessage: 'Close case #{number}',
        values: { number: incrementalId },
      })
    : i18n.translate('xpack.cases.closeCaseModal.title', { defaultMessage: 'Close case' });

const NOTES_SAVING = i18n.translate('xpack.cases.closeCaseModal.notesSaving', {
  defaultMessage: 'Adding the closing notes...',
});

const NOTES_FAILED = i18n.translate('xpack.cases.closeCaseModal.notesFailed', {
  defaultMessage: "Couldn't add the closing notes. The case is still open.",
});

const CLOSE_REASON_PLACEHOLDER = i18n.translate('xpack.cases.closeCaseModal.reasonPlaceholder', {
  defaultMessage: 'Select a close reason',
});

export interface CloseCaseOptions {
  closeLinkedInvestigations?: boolean;
  /** The case's version after the modal's own writes (closing notes), when it made any. */
  version?: string;
}

interface UseCloseCaseModalProps {
  canSyncCloseReasonToAlerts: boolean;
  onCloseCase: (closeReason?: string, options?: CloseCaseOptions) => void;
  /**
   * The case being closed, when there is exactly one. With agentic cases on it shows the verdict
   * the reason sets and the sections plugins add (linked investigations).
   */
  caseData?: CaseUI;
}

interface UseCloseCaseModalReturnValue {
  openCloseCaseModal: () => void;
  closeCaseModal: JSX.Element | null;
}

export const useCloseCaseModal = ({
  canSyncCloseReasonToAlerts,
  onCloseCase,
  caseData,
}: UseCloseCaseModalProps): UseCloseCaseModalReturnValue => {
  const {
    services: { uiSettings },
  } = useKibana<{ uiSettings: IUiSettingsClient }>();
  const { agenticEnabled } = useCasesConfig();
  const {
    data: { closeReason: closeReasonConfig },
  } = useGetCaseConfiguration();
  // Agentic cases keep the close reason on the case, so the modal asks for it even when no alert
  // would be closed, unless the space's close reason setting hides it.
  const asksForCloseReason =
    canSyncCloseReasonToAlerts || (agenticEnabled && (closeReasonConfig?.show ?? true));
  const reasonSource = agenticEnabled ? closeReasonConfig?.source ?? 'both' : 'alerts';
  const [closeLinkedInvestigations, setCloseLinkedInvestigations] = useState(true);
  const [closingNotes, setClosingNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const toasts = useToasts();

  const initialCloseReasonOptions = useMemo(() => {
    const customCloseReasons = uiSettings.get<string[]>(DEFAULT_DETECTIONS_CLOSE_REASONS_KEY, []);
    const alertReasons =
      reasonSource === 'cases'
        ? DEFAULT_CLOSING_REASON_OPTIONS.filter((option) => option.key == null)
        : [
            ...DEFAULT_CLOSING_REASON_OPTIONS,
            ...customCloseReasons.map((reason) => ({ label: reason, key: reason })),
          ];
    const caseReasons =
      reasonSource === 'alerts'
        ? []
        : (closeReasonConfig?.values ?? [])
            .filter((reason) => !alertReasons.some((option) => option.key === reason))
            .map((reason) => ({ label: reason, key: reason }));

    return [...alertReasons, ...caseReasons];
  }, [uiSettings, reasonSource, closeReasonConfig?.values]);

  const createCloseReasonOptions = useCallback(
    () =>
      initialCloseReasonOptions.map((closeReasonOption) => ({
        ...closeReasonOption,
        checked: closeReasonOption.key == null ? ('on' as const) : undefined,
      })),
    [initialCloseReasonOptions]
  );
  const [isCloseCaseModalVisible, setIsCloseCaseModalVisible] = useState(false);
  const { tasksAuthorized } = useCasesFeatures();
  const { permissions } = useCasesContext();
  // The server refuses to close with an open required task; the modal says which ones up front.
  const { data: caseTasks } = useGetCaseTasks(caseData?.id ?? '', {
    enabled: isCloseCaseModalVisible && tasksAuthorized && caseData != null,
  });
  const openRequiredTasks = useMemo(
    () => (caseData ? (caseTasks?.tasks ?? []).filter(isOpenRequiredTask) : []),
    [caseData, caseTasks?.tasks]
  );
  const [closeReasonOptions, setCloseReasonOptions] = useState<
    Array<EuiSelectableOption<CloseReasonOption>>
  >(() => createCloseReasonOptions());
  const selectedCloseReason = useMemo(
    () => closeReasonOptions.find((option) => option.checked === 'on'),
    [closeReasonOptions]
  );
  const onCloseReasonOptionsChange = useCallback(
    (
      options: Array<EuiSelectableOption<CloseReasonOption>>,
      _event?: unknown,
      _changedOption?: EuiSelectableOption<CloseReasonOption>
    ) => {
      setCloseReasonOptions(options);
    },
    []
  );

  const closeCloseCaseModal = useCallback(() => {
    setIsCloseCaseModalVisible(false);
  }, []);

  const onSubmit = useCallback(async () => {
    // Close case is disabled while the notes are saved; this catches a click already in flight.
    if (isSubmitting) {
      return;
    }
    const notes = closingNotes.trim();
    const options: CloseCaseOptions | undefined =
      agenticEnabled && caseData ? { closeLinkedInvestigations } : undefined;
    // The notes are a comment by the closer, written just before the close; the published outcome
    // reads them from there. Posting changes the case's version, so the close uses the new one.
    if (options && caseData && notes.length > 0) {
      setIsSubmitting(true);
      try {
        await createAttachments({
          caseId: caseData.id,
          attachments: [
            { type: COMMENT_ATTACHMENT_TYPE, data: { content: notes }, owner: caseData.owner },
          ],
        });
        options.version = (await getCase({ caseId: caseData.id })).version;
      } catch (error) {
        toasts.addError(error, { title: NOTES_FAILED });
        return;
      } finally {
        setIsSubmitting(false);
      }
    }
    closeCloseCaseModal();
    onCloseCase(selectedCloseReason?.key, options);
  }, [
    closeCloseCaseModal,
    onCloseCase,
    selectedCloseReason?.key,
    agenticEnabled,
    caseData,
    closeLinkedInvestigations,
    closingNotes,
    toasts,
    isSubmitting,
  ]);

  const openCloseCaseModal = useCallback(() => {
    if (asksForCloseReason) {
      const nextCloseReasonOptions = createCloseReasonOptions();
      setCloseReasonOptions(nextCloseReasonOptions);
      setCloseLinkedInvestigations(true);
      setClosingNotes('');
      setIsCloseCaseModalVisible(true);
    } else {
      // Should automatically close without reason when case sync to alerts is disabled
      onCloseCase();
    }
  }, [asksForCloseReason, createCloseReasonOptions, onCloseCase]);

  return {
    openCloseCaseModal,
    closeCaseModal: isCloseCaseModalVisible ? (
      <CloseCaseModal
        closeReasonOptions={closeReasonOptions}
        onClose={closeCloseCaseModal}
        onSubmit={onSubmit}
        onCloseReasonOptionsChange={onCloseReasonOptionsChange}
        showAlertsDisclaimer={canSyncCloseReasonToAlerts}
        header={
          caseData ? (
            <RequiredTasksCallout
              caseId={caseData.id}
              tasks={openRequiredTasks}
              canUpdate={permissions.update}
            />
          ) : undefined
        }
        confirmDisabledReason={
          isSubmitting
            ? NOTES_SAVING
            : openRequiredTasks.length > 0
            ? REQUIRED_TASKS_MISSING(openRequiredTasks.length)
            : undefined
        }
        {...(agenticEnabled && !canSyncCloseReasonToAlerts
          ? {
              // From the case view, list rows, and bulk actions alike: no alerts are involved.
              title: closeCaseTitle(caseData?.incrementalId),
              searchPlaceholder: CLOSE_REASON_PLACEHOLDER,
            }
          : {})}
      >
        {agenticEnabled && caseData ? (
          <CloseOutcome
            caseData={caseData}
            closeReason={selectedCloseReason?.key}
            closeLinkedInvestigations={closeLinkedInvestigations}
            setCloseLinkedInvestigations={setCloseLinkedInvestigations}
            closingNotes={closingNotes}
            setClosingNotes={setClosingNotes}
          />
        ) : null}
      </CloseCaseModal>
    ) : null,
  };
};
