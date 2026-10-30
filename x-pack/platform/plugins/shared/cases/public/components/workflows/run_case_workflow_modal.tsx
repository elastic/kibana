/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiCallOut,
  EuiModal,
  EuiModalBody,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiSkeletonText,
} from '@elastic/eui';
import { RunWorkflowPanel } from '@kbn/workflows-ui';
import type { RunWorkflowExecutor, RunWorkflowPanelProps } from '@kbn/workflows-ui';
import { useFocusButtonTrap } from '../use_focus_button';
import { useCaseWorkflowTags } from './use_run_case_workflow';
import * as i18n from './translations';

interface RunCaseWorkflowModalProps
  extends Pick<
    RunWorkflowPanelProps,
    'inputs' | 'sortWorkflow' | 'filterWorkflow' | 'onExecute' | 'onExecutionSettled' | 'telemetry'
  > {
  /** Required: the panel's success toast is suppressed, so the executor must raise its own. */
  runWorkflow: RunWorkflowExecutor;
  onClose: () => void;
  /** Ref to the button that opened this modal; when set, focus is returned to it on close. */
  focusButtonRef?: React.Ref<HTMLButtonElement | HTMLAnchorElement>;
}

/**
 * Modal wrapper around `RunWorkflowPanel` for the case detail view and the
 * cases list page. Provides a standard "Select workflow" header and returns
 * focus to the trigger button on close when `focusButtonRef` is supplied.
 * Every Cases executor raises its own success toast, so the panel's is always suppressed.
 * The workflow list is withheld until the case configuration (and its workflow tags) has loaded.
 */
export const RunCaseWorkflowModal: React.FC<RunCaseWorkflowModalProps> = ({
  inputs,
  runWorkflow,
  sortWorkflow,
  filterWorkflow,
  onClose,
  onExecute,
  onExecutionSettled,
  telemetry,
  focusButtonRef,
}) => {
  const focusTrapProps = useFocusButtonTrap(focusButtonRef);
  const { isLoading, isError } = useCaseWorkflowTags();

  const renderBody = () => {
    if (isLoading) {
      return <EuiSkeletonText data-test-subj="cases-run-workflow-modal-loading" lines={3} />;
    }

    if (isError) {
      return (
        <EuiCallOut
          announceOnMount
          color="danger"
          iconType="warning"
          size="s"
          title={i18n.WORKFLOW_SETTINGS_LOAD_ERROR}
          data-test-subj="cases-run-workflow-modal-error"
        />
      );
    }

    return (
      <RunWorkflowPanel
        inputs={inputs}
        runWorkflow={runWorkflow}
        sortWorkflow={sortWorkflow}
        filterWorkflow={filterWorkflow}
        onClose={onClose}
        onExecute={onExecute}
        onExecutionSettled={onExecutionSettled}
        showSuccessToast={false}
        telemetry={telemetry}
      />
    );
  };

  return (
    <EuiModal
      aria-label={i18n.SELECT_WORKFLOW_TITLE}
      onClose={onClose}
      css={{ width: '400px' }}
      data-test-subj="cases-run-workflow-modal"
      focusTrapProps={focusTrapProps}
    >
      <EuiModalHeader>
        <EuiModalHeaderTitle size="xs">{i18n.SELECT_WORKFLOW_TITLE}</EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody>{renderBody()}</EuiModalBody>
    </EuiModal>
  );
};

RunCaseWorkflowModal.displayName = 'RunCaseWorkflowModal';
