/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiModal, EuiModalBody, EuiModalHeader, EuiModalHeaderTitle } from '@elastic/eui';
import { RunWorkflowPanel } from '@kbn/workflows-ui';
import type { RunWorkflowPanelProps } from '@kbn/workflows-ui';
import * as i18n from './translations';

interface RunCaseWorkflowModalProps
  extends Pick<
    RunWorkflowPanelProps,
    'inputs' | 'runWorkflow' | 'sortWorkflow' | 'filterWorkflow' | 'onExecute'
  > {
  onClose: () => void;
}

/**
 * Modal wrapper around RunWorkflowPanel for case-level and other contexts where a nested
 * EuiContextMenu sub-panel is not available (e.g. AppHeaderMenu items, PropertyActions buttons).
 */
export const RunCaseWorkflowModal: React.FC<RunCaseWorkflowModalProps> = ({
  inputs,
  runWorkflow,
  sortWorkflow,
  filterWorkflow,
  onClose,
  onExecute,
}) => {
  return (
    <EuiModal
      aria-label={i18n.SELECT_WORKFLOW_TITLE}
      onClose={onClose}
      style={{ width: 400 }}
      data-test-subj="cases-run-workflow-modal"
    >
      <EuiModalHeader>
        <EuiModalHeaderTitle size="xs">{i18n.SELECT_WORKFLOW_TITLE}</EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody>
        <RunWorkflowPanel
          inputs={inputs}
          runWorkflow={runWorkflow}
          sortWorkflow={sortWorkflow}
          filterWorkflow={filterWorkflow}
          onClose={onClose}
          onExecute={onExecute}
        />
      </EuiModalBody>
    </EuiModal>
  );
};

RunCaseWorkflowModal.displayName = 'RunCaseWorkflowModal';
