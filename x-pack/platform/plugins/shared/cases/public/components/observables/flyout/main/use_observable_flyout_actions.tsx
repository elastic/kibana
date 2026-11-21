/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { FlyoutFooterMenuItem, FlyoutFooterMenuPanel } from '@kbn/flyout-template';
import type { ObservablePatch, ObservableWithMetadata } from '../../../../../common/types/api';
import type { CaseUI } from '../../../../../common/ui/types';
import { OBSERVABLE_WORKFLOW_ORIGIN_TYPE } from '../../../../../common/types/domain/user_action/workflow/constants';
import { useCaseWorkflowRunTelemetry } from '../../../../analytics/use_case_workflow_run_telemetry';
import { useCasesContext } from '../../../cases_context/use_cases_context';
import { RunCaseWorkflowModal } from '../../../workflows/run_case_workflow_modal';
import { useCasesWorkflowExecutor } from '../../../workflows/use_cases_workflow_executor';
import {
  useCanRunCaseWorkflow,
  useCaseWorkflowFilters,
} from '../../../workflows/use_run_case_workflow';
import * as workflowI18n from '../../../workflows/translations';
import { EditObservableModal } from '../../edit_observable_modal';
import * as observablesI18n from '../../translations';

/** The Cases API derives the workflow event from the origin, so no client inputs are sent. */
const WORKFLOW_INPUTS: Record<string, unknown> = {};

type ObservableFlyoutModal = 'runWorkflow' | 'edit';

export interface UseObservableFlyoutActionsParams {
  caseData: CaseUI;
  observable: ObservableWithMetadata;
  onObservableUpdated: (patch: ObservablePatch) => void;
}

export interface UseObservableFlyoutActions {
  /** The "Take action" menu; empty when the user may take none. */
  panels: FlyoutFooterMenuPanel[];
  /** The modal of the action the user picked, if any. */
  modal: ReactNode;
}

/**
 * The actions of the observable flyout footer, the same as the observables table offers: run a
 * workflow from the observable, and edit it.
 */
export const useObservableFlyoutActions = ({
  caseData,
  observable,
  onObservableUpdated,
}: UseObservableFlyoutActionsParams): UseObservableFlyoutActions => {
  const { permissions } = useCasesContext();
  const canRunWorkflow = useCanRunCaseWorkflow();
  const [openModal, setOpenModal] = useState<ObservableFlyoutModal | null>(null);
  const closeModal = useCallback(() => setOpenModal(null), []);

  const origin = useMemo(
    () => ({
      type: OBSERVABLE_WORKFLOW_ORIGIN_TYPE,
      caseId: caseData.id,
      observableId: observable.id,
    }),
    [caseData.id, observable.id]
  );
  const runWorkflow = useCasesWorkflowExecutor({ caseId: caseData.id, origin });
  const workflowTelemetry = useCaseWorkflowRunTelemetry(origin);
  const { filterWorkflow, sortWorkflow } = useCaseWorkflowFilters();

  const panels: FlyoutFooterMenuPanel[] = useMemo(() => {
    const items: FlyoutFooterMenuItem[] = [];

    if (canRunWorkflow) {
      items.push({
        name: workflowI18n.RUN_WORKFLOW,
        icon: 'play',
        onClick: () => setOpenModal('runWorkflow'),
        'data-test-subj': 'cases-observable-flyout-run-workflow',
      });
    }

    if (permissions.update) {
      items.push({
        name: observablesI18n.EDIT_OBSERVABLE,
        icon: 'pencil',
        onClick: () => setOpenModal('edit'),
        'data-test-subj': 'cases-observable-flyout-edit',
      });
    }

    return items.length > 0 ? [{ id: 0, items }] : [];
  }, [canRunWorkflow, permissions.update]);

  const renderModal = (): ReactNode => {
    if (openModal === 'runWorkflow') {
      return (
        <RunCaseWorkflowModal
          inputs={WORKFLOW_INPUTS}
          runWorkflow={runWorkflow}
          filterWorkflow={filterWorkflow}
          sortWorkflow={sortWorkflow}
          onClose={closeModal}
          telemetry={workflowTelemetry}
        />
      );
    }
    if (openModal === 'edit') {
      return (
        <EditObservableModal
          caseData={caseData}
          observable={observable}
          onCloseModal={closeModal}
          onObservableUpdated={onObservableUpdated}
        />
      );
    }
    return null;
  };

  return { panels, modal: renderModal() };
};
