/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  EuiButtonEmpty,
  EuiContextMenu,
  EuiFlexItem,
  EuiPopover,
  EuiText,
} from '@elastic/eui';
import type { EuiContextMenuPanelDescriptor } from '@elastic/eui';
import type { Observable } from '../../../common/types/domain/observable/v1';
import type { CaseUI } from '../../containers/types';
import { OBSERVABLES_WORKFLOW_ORIGIN_TYPE } from '../../../common/types/domain/user_action/workflow/constants';
import { useCasesWorkflowExecutor } from '../workflows/use_cases_workflow_executor';
import {
  createCaseWorkflowFilter,
  createCaseWorkflowComparator,
} from '../workflows/use_run_case_workflow';
import { RunCaseWorkflowModal } from '../workflows/run_case_workflow_modal';
import * as i18n from './translations';
import * as workflowI18n from '../workflows/translations';

/** Stable empty array for workflow tag filtering (pass-through: all workflows shown). */
const NO_WORKFLOW_TAGS: readonly string[] = [];

export interface ObservablesBulkActionsProps {
  caseData: CaseUI;
  selectedObservables: Observable[];
}

/** Bulk action bar for selected observables. Returns null when the selection is empty. */
export const ObservablesBulkActions: React.FC<ObservablesBulkActionsProps> = ({
  caseData,
  selectedObservables,
}) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [showRunWorkflowModal, setShowRunWorkflowModal] = useState(false);

  const togglePopover = useCallback(() => setIsPopoverOpen((prev) => !prev), []);
  const closePopover = useCallback(() => setIsPopoverOpen(false), []);

  const observableIds = useMemo(
    () => selectedObservables.map(({ id }) => id),
    [selectedObservables]
  );

  const origin = useMemo(
    () => ({
      type: OBSERVABLES_WORKFLOW_ORIGIN_TYPE,
      caseId: caseData.id,
      observableIds,
    }),
    [caseData.id, observableIds]
  );

  const runWorkflow = useCasesWorkflowExecutor({ caseId: caseData.id, origin });
  const filterWorkflow = useMemo(() => createCaseWorkflowFilter(NO_WORKFLOW_TAGS), []);
  const sortWorkflow = useMemo(() => createCaseWorkflowComparator(NO_WORKFLOW_TAGS), []);
  const inputs = useMemo(() => ({}), []);

  const panels: EuiContextMenuPanelDescriptor[] = useMemo(
    () => [
      {
        id: 0,
        items: [
          {
            name: workflowI18n.RUN_WORKFLOW,
            icon: 'play',
            onClick: () => {
              closePopover();
              setShowRunWorkflowModal(true);
            },
            'data-test-subj': 'cases-observables-bulk-actions-run-workflow',
          },
        ],
      },
    ],
    [closePopover]
  );

  if (selectedObservables.length === 0) {
    return null;
  }

  return (
    <>
      <EuiFlexItem grow={false}>
        <EuiText size="xs" color="subdued" data-test-subj="cases-observables-selected-count">
          {i18n.SHOWING_SELECTED_OBSERVABLES(selectedObservables.length)}
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiPopover
          aria-label={i18n.BULK_ACTIONS}
          isOpen={isPopoverOpen}
          closePopover={closePopover}
          panelPaddingSize="none"
          data-test-subj="cases-observables-bulk-actions-popover"
          button={
            <EuiButtonEmpty
              onClick={togglePopover}
              size="xs"
              iconSide="right"
              iconType="chevronSingleDown"
              flush="left"
              data-test-subj="cases-observables-bulk-actions-button"
            >
              {i18n.BULK_ACTIONS}
            </EuiButtonEmpty>
          }
        >
          <EuiContextMenu
            initialPanelId={0}
            panels={panels}
            data-test-subj="cases-observables-bulk-actions-context-menu"
          />
        </EuiPopover>
      </EuiFlexItem>
      {showRunWorkflowModal && (
        <RunCaseWorkflowModal
          inputs={inputs}
          runWorkflow={runWorkflow}
          filterWorkflow={filterWorkflow}
          sortWorkflow={sortWorkflow}
          onClose={() => setShowRunWorkflowModal(false)}
        />
      )}
    </>
  );
};

ObservablesBulkActions.displayName = 'ObservablesBulkActions';
