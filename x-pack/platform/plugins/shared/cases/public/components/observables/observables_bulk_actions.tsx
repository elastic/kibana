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
  EuiIcon,
  EuiPopover,
  EuiText,
  EuiTextColor,
} from '@elastic/eui';
import type { EuiContextMenuPanelDescriptor } from '@elastic/eui';
import type { Observable } from '../../../common/types/domain/observable/v1';
import type { CaseUI } from '../../containers/types';
import { OBSERVABLES_WORKFLOW_ORIGIN_TYPE } from '../../../common/types/domain/user_action/workflow/constants';
import { useCasesWorkflowExecutor } from '../workflows/use_cases_workflow_executor';
import { useCaseWorkflowRunTelemetry } from '../../analytics/use_case_workflow_run_telemetry';
import { useCaseWorkflowFilters } from '../workflows/use_run_case_workflow';
import { RunCaseWorkflowModal } from '../workflows/run_case_workflow_modal';
import { DeleteConfirmationModal } from '../configure_cases/delete_confirmation_modal';
import { useCasesContext } from '../cases_context/use_cases_context';
import { useBulkDeleteObservables } from '../../containers/use_bulk_delete_observables';
import * as i18n from './translations';
import * as workflowI18n from '../workflows/translations';

/** The Cases API derives the workflow event from the origin, so no client inputs are sent. */
const WORKFLOW_INPUTS: Record<string, unknown> = {};

export interface ObservablesBulkActionsProps {
  caseData: CaseUI;
  selectedObservables: Observable[];
  canRunWorkflow: boolean;
  onActionSuccess?: () => void;
}

/** Bulk action bar for selected observables. Returns null when the selection is empty. */
export const ObservablesBulkActions: React.FC<ObservablesBulkActionsProps> = ({
  caseData,
  selectedObservables,
  canRunWorkflow,
  onActionSuccess,
}) => {
  const { permissions } = useCasesContext();
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [showRunWorkflowModal, setShowRunWorkflowModal] = useState(false);
  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);

  const togglePopover = useCallback(() => setIsPopoverOpen((prev) => !prev), []);
  const closePopover = useCallback(() => setIsPopoverOpen(false), []);

  const observableIds = useMemo(
    () => selectedObservables.map(({ id }) => id),
    [selectedObservables]
  );

  const { mutate: bulkDeleteObservables, isLoading: isBulkDeleting } = useBulkDeleteObservables(
    caseData.id,
    { onSuccess: onActionSuccess }
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
  const workflowTelemetry = useCaseWorkflowRunTelemetry(origin);
  const { filterWorkflow, sortWorkflow } = useCaseWorkflowFilters();

  const handleBulkDeleteClick = useCallback(() => {
    closePopover();
    setIsDeleteModalVisible(true);
  }, [closePopover]);

  const handleConfirmBulkDelete = useCallback(() => {
    bulkDeleteObservables({ observableIds });
    setIsDeleteModalVisible(false);
  }, [bulkDeleteObservables, observableIds]);

  const handleCancelBulkDelete = useCallback(() => {
    setIsDeleteModalVisible(false);
  }, []);

  const panels: EuiContextMenuPanelDescriptor[] = useMemo(() => {
    const items = [];

    if (canRunWorkflow) {
      items.push({
        name: workflowI18n.RUN_WORKFLOW,
        icon: 'play',
        onClick: () => {
          closePopover();
          setShowRunWorkflowModal(true);
        },
        disabled: isBulkDeleting,
        'data-test-subj': 'cases-observables-bulk-actions-run-workflow',
      });
    }

    if (permissions.update) {
      items.push({
        name: <EuiTextColor color="danger">{i18n.BULK_DELETE_OBSERVABLES}</EuiTextColor>,
        icon: <EuiIcon type="trash" size="m" color="danger" aria-hidden={true} />,
        onClick: handleBulkDeleteClick,
        disabled: isBulkDeleting,
        'data-test-subj': 'cases-observables-bulk-actions-delete',
      });
    }

    return [{ id: 0, items }];
  }, [canRunWorkflow, closePopover, handleBulkDeleteClick, isBulkDeleting, permissions.update]);

  if (selectedObservables.length === 0) {
    return null;
  }

  return (
    <>
      <EuiFlexItem grow={false}>
        <EuiText size="xs" color="subdued" data-test-subj="cases-observables-selected-count">
          {i18n.SELECTED_OBSERVABLES(selectedObservables.length)}
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
      {isDeleteModalVisible && (
        <DeleteConfirmationModal
          title={i18n.BULK_DELETE_TITLE(selectedObservables.length)}
          message={i18n.BULK_DELETE_MESSAGE(selectedObservables.length)}
          onCancel={handleCancelBulkDelete}
          onConfirm={handleConfirmBulkDelete}
        />
      )}
      {showRunWorkflowModal && (
        <RunCaseWorkflowModal
          inputs={WORKFLOW_INPUTS}
          runWorkflow={runWorkflow}
          filterWorkflow={filterWorkflow}
          sortWorkflow={sortWorkflow}
          onClose={() => setShowRunWorkflowModal(false)}
          telemetry={workflowTelemetry}
        />
      )}
    </>
  );
};

ObservablesBulkActions.displayName = 'ObservablesBulkActions';
