/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-plugin/public';
import { PluginStart } from '@kbn/core-di';
import { CoreStart, useService } from '@kbn/core-di-browser';
import type { RuleDiagnosisContext } from './build_rule_diagnosis_handoff';
import {
  AGENT_BUILDER_REQUIRED_LICENSE_TIER,
  deriveDiagnoseAvailability,
  type DiagnoseState,
  type EmbeddableChatAccessSnapshot,
} from './derive_diagnose_availability';
import {
  clearPendingDiagnoseHandoff,
  loadPendingDiagnoseHandoff,
  savePendingDiagnoseHandoff,
} from './diagnose_pending_handoff';
import {
  diagnoseHandoffErrorToastTitle,
  openRuleFailureDiagnosisChat,
} from './open_rule_failure_diagnosis_chat';

export interface DiagnoseAvailability {
  /** Availability state (drives the control). */
  state: DiagnoseState;
  /** Required Agent Builder license tier id (e.g. `enterprise`), not a display string. */
  requiredLicenseTier: string;
  /** True while a handoff is in flight (guards against double-opening a chat). */
  isHandoffInFlight: boolean;
  openDiagnose: (context: RuleDiagnosisContext) => void;
  openLicenseManagement: () => void;
  licenseManagementHref: string;
}

/**
 * Single availability source for the failed-rule "Diagnose with AI" action. Detection errors and
 * a missing Agent Builder degrade to state D (hidden).
 */
export const useDiagnoseAvailability = (): DiagnoseAvailability => {
  const agentBuilder = useService(PluginStart('agentBuilder'), { optional: true }) as
    | AgentBuilderPluginStart
    | undefined;
  const application = useService(CoreStart('application'));
  const http = useService(CoreStart('http'));
  const notifications = useService(CoreStart('notifications'));

  const isAgentBuilderAvailable = agentBuilder != null;
  const hasShowPrivilege = application.capabilities.agentBuilder?.show === true;

  const [access, setAccess] = useState<EmbeddableChatAccessSnapshot | null>(null);
  const [isHandoffInFlight, setIsHandoffInFlight] = useState(false);
  const handoffInFlightRef = useRef(false);
  const agentBuilderRef = useRef(agentBuilder);
  agentBuilderRef.current = agentBuilder;
  const httpRef = useRef(http);
  httpRef.current = http;
  const notificationsRef = useRef(notifications);
  notificationsRef.current = notifications;

  const refreshAccess = useCallback(async (): Promise<EmbeddableChatAccessSnapshot | null> => {
    const ab = agentBuilderRef.current;
    if (!ab || !hasShowPrivilege) {
      setAccess(null);
      return null;
    }

    try {
      // Prefer a live connector probe so state B can resume after setup: Agent Builder's
      // getAgentBuilderAccess caches the first result for the session.
      const connectors = await httpRef.current.get<{ connectors?: unknown[] }>(
        '/internal/inference/connectors'
      );
      const hasLiveLlmConnector = (connectors?.connectors?.length ?? 0) > 0;
      const abAccess = await ab.getAgentBuilderAccess();
      const next = {
        hasRequiredLicense: abAccess.hasRequiredLicense,
        hasLlmConnector: abAccess.hasLlmConnector || hasLiveLlmConnector,
      };
      setAccess(next);
      return next;
    } catch {
      try {
        const result = await ab.getAgentBuilderAccess();
        const next = {
          hasRequiredLicense: result.hasRequiredLicense,
          hasLlmConnector: result.hasLlmConnector,
        };
        setAccess(next);
        return next;
      } catch {
        setAccess(null);
        return null;
      }
    }
  }, [hasShowPrivilege]);

  useEffect(() => {
    void refreshAccess();
  }, [refreshAccess, isAgentBuilderAvailable]);

  const state = useMemo(
    () =>
      deriveDiagnoseAvailability({
        pluginPresent: isAgentBuilderAvailable,
        hasShowPrivilege,
        access,
      }),
    [isAgentBuilderAvailable, hasShowPrivilege, access]
  );

  const runHandoff = useCallback((context: RuleDiagnosisContext) => {
    const ab = agentBuilderRef.current;
    if (!ab || handoffInFlightRef.current) {
      return;
    }

    handoffInFlightRef.current = true;
    setIsHandoffInFlight(true);

    const releaseInFlight = () => {
      handoffInFlightRef.current = false;
      setIsHandoffInFlight(false);
    };

    try {
      openRuleFailureDiagnosisChat({ agentBuilder: ab, http: httpRef.current, context });
    } catch (error) {
      clearPendingDiagnoseHandoff();
      notificationsRef.current.toasts.addError(
        error instanceof Error ? error : new Error(String(error)),
        { title: diagnoseHandoffErrorToastTitle() }
      );
      releaseInFlight();
      return;
    }

    // Keep the loading state briefly so rapid double-clicks cannot open two chats.
    window.setTimeout(releaseInFlight, 400);
  }, []);

  const openDiagnose = useCallback(
    (context: RuleDiagnosisContext) => {
      if (!agentBuilderRef.current || handoffInFlightRef.current) {
        return;
      }

      // State B: keep the assembled context so completing LLM setup resumes the same handoff
      // without another click.
      if (state === 'b') {
        savePendingDiagnoseHandoff({ context });
      } else {
        clearPendingDiagnoseHandoff();
      }

      runHandoff(context);
    },
    [state, runHandoff]
  );

  // State B: after LLM connector setup, resume the original handoff once.
  useEffect(() => {
    if (!isAgentBuilderAvailable) {
      return;
    }

    const tryResumePending = async () => {
      const pending = loadPendingDiagnoseHandoff();
      if (!pending || handoffInFlightRef.current) {
        return;
      }

      const nextAccess = await refreshAccess();
      if (!nextAccess?.hasRequiredLicense || !nextAccess.hasLlmConnector) {
        return;
      }
      if (handoffInFlightRef.current) {
        return;
      }

      clearPendingDiagnoseHandoff();
      runHandoff(pending.context);
    };

    const onFocus = () => {
      void tryResumePending();
    };

    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onFocus);
    void tryResumePending();

    return () => {
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onFocus);
    };
  }, [isAgentBuilderAvailable, refreshAccess, runHandoff]);

  const openLicenseManagement = useCallback(() => {
    application.navigateToApp('management', { deepLinkId: 'license_management' });
  }, [application]);

  const licenseManagementHref = application.getUrlForApp('management', {
    deepLinkId: 'license_management',
  });

  return useMemo(
    () => ({
      state,
      requiredLicenseTier: AGENT_BUILDER_REQUIRED_LICENSE_TIER,
      isHandoffInFlight,
      openDiagnose,
      openLicenseManagement,
      licenseManagementHref,
    }),
    [state, isHandoffInFlight, openDiagnose, openLicenseManagement, licenseManagementHref]
  );
};
