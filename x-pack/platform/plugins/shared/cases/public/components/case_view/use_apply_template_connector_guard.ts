/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useState } from 'react';
import type { CaseConnector } from '../../../common/types/domain';
import { ConnectorTypes } from '../../../common/types/domain';
import type { CaseUI } from '../../../common';
import { useGetSupportedActionConnectors } from '../../containers/configure/use_get_supported_action_connectors';
import { useGetCaseConnectors } from '../../containers/use_get_case_connectors';
import {
  resolveTemplateConnector,
  useChangeAppliedTemplate,
  type NewAppliedTemplate,
} from './use_change_applied_template';

interface ApplyOptions {
  onSuccess?: () => void;
}

export interface PendingConnectorChange {
  /** The connector the case has already been pushed to (system A). */
  currentConnectorName: string;
  /** The template's connector (system B), or `null` when the template removes the connector. */
  nextConnectorName: string | null;
}

interface PendingState {
  newTemplate: NewAppliedTemplate;
  options?: ApplyOptions;
  /** The case's existing connector, retained verbatim when the user declines the change. */
  currentConnector: CaseConnector;
  change: PendingConnectorChange;
}

export interface UseApplyTemplateConnectorGuard {
  applyTemplate: (newTemplate: NewAppliedTemplate, options?: ApplyOptions) => void;
  pendingConnectorChange: PendingConnectorChange | null;
  confirmConnectorChange: () => void;
  cancelConnectorChange: () => void;
  isInitializing: boolean;
  isApplying: boolean;
}

/**
 * Applies a template to an existing case, guarding the connector change against orphaned tickets.
 *
 * Template settings always override (handled by {@link useChangeAppliedTemplate}). The connector,
 * however, is only changed automatically when it is safe to do so:
 * - If the template's connector matches the case's current connector, nothing to warn about.
 * - If the case has NOT been pushed to its current connector, the change is applied directly.
 * - If the case HAS been pushed to its current connector, changing (or removing) it could orphan the
 *   external ticket, so we surface a confirmation via `pendingConnectorChange`. The caller renders a
 *   modal and resolves it with `confirmConnectorChange` (apply the template's connector) or
 *   `cancelConnectorChange` (apply the template but retain the current connector).
 *
 * `isInitializing` is true until both the supported connectors and the case's push history have
 * loaded. Callers MUST gate their apply affordance on it: resolving a template's connector against an
 * empty connectors list silently falls back to `.none`, which would drop the connector.
 */
export const useApplyTemplateConnectorGuard = ({
  caseData,
}: {
  caseData: CaseUI;
}): UseApplyTemplateConnectorGuard => {
  const { data: connectors = [], isLoading: isLoadingConnectors } =
    useGetSupportedActionConnectors();
  const { data: caseConnectors, isLoading: isLoadingCaseConnectors } = useGetCaseConnectors(
    caseData.id
  );
  const { mutate: changeTemplate, isLoading: isApplying } = useChangeAppliedTemplate();
  const [pending, setPending] = useState<PendingState | null>(null);

  const isInitializing = isLoadingConnectors || isLoadingCaseConnectors;

  const applyTemplate = useCallback(
    (newTemplate: NewAppliedTemplate, options?: ApplyOptions) => {
      // Wait for connectors + push history; see the `isInitializing` note above. Also avoid opening a
      // second confirmation while one is already pending (the popover effect can re-run).
      if (isInitializing || pending) {
        return;
      }

      const currentConnector = caseData.connector;
      const targetConnector = resolveTemplateConnector(newTemplate?.connector, connectors);
      const isConnectorChanging = targetConnector.id !== currentConnector.id;
      const currentHasBeenPushed = Boolean(
        caseConnectors?.[currentConnector.id]?.push.hasBeenPushed
      );

      if (isConnectorChanging && currentHasBeenPushed) {
        setPending({
          newTemplate,
          options,
          currentConnector,
          change: {
            currentConnectorName:
              caseConnectors?.[currentConnector.id]?.name ?? currentConnector.name,
            nextConnectorName:
              targetConnector.type === ConnectorTypes.none ? null : targetConnector.name,
          },
        });
        return;
      }

      changeTemplate({ caseData, newTemplate }, options);
    },
    [isInitializing, pending, caseData, connectors, caseConnectors, changeTemplate]
  );

  const confirmConnectorChange = useCallback(() => {
    if (!pending) {
      return;
    }
    changeTemplate({ caseData, newTemplate: pending.newTemplate }, pending.options);
    setPending(null);
  }, [pending, caseData, changeTemplate]);

  const cancelConnectorChange = useCallback(() => {
    if (!pending) {
      return;
    }
    // Retain the case's existing connector but still apply the rest of the template (incl. settings).
    changeTemplate(
      { caseData, newTemplate: pending.newTemplate, connectorOverride: pending.currentConnector },
      pending.options
    );
    setPending(null);
  }, [pending, caseData, changeTemplate]);

  return {
    applyTemplate,
    pendingConnectorChange: pending?.change ?? null,
    confirmConnectorChange,
    cancelConnectorChange,
    isInitializing,
    isApplying,
  };
};
