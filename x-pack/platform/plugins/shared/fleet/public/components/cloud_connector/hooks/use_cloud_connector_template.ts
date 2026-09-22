/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useState } from 'react';
import { i18n } from '@kbn/i18n';

import { useIacProvisioner, useStartServices } from '../../../hooks';
import { sendRenderIacTemplate } from '../../../hooks/use_request/iac_provisioner';
import {
  CLOUD_CONNECTOR_RENDER_FLOW,
  IAC_PROVISIONER_FALLBACK_REASON_MISSING_CONTEXT,
  IAC_PROVISIONER_FALLBACK_REASON_RENDER_FAILED,
  IAC_PROVISIONER_RENDER_FALLBACK_EVENT,
} from '../../../../common/telemetry/iac_provisioner_events';
import type { CloudConnectorIacState } from '../../../../common/types/models/cloud_connector';
import { IAC_FEDERATED_IDENTITY_WORKFLOW } from '../../../../common/types/rest_spec/iac_provisioner';
import type { AccountType } from '../../../types';
import type {
  IacPolicyTemplateSelection,
  RenderIacTemplateIntegration,
  RenderIacTemplateRequest,
} from '../../../../common/types/rest_spec/iac_provisioner';
import type { CloudSetupForCloudConnector } from '../types';
import {
  getCloudConnectorRemoteRoleTemplate,
  getIacLaunchUrl,
  hasTemplateUrlParam,
} from '../utils';

const MISSING_CONTEXT_ERROR = i18n.translate(
  'xpack.fleet.cloudConnector.iacProvisioner.missingContextError',
  { defaultMessage: 'CloudFormation template is not available for this integration.' }
);

const TEMPLATE_GENERATION_ERROR = i18n.translate(
  'xpack.fleet.cloudConnector.iacProvisioner.templateGenerationError',
  {
    defaultMessage:
      'Failed to generate the CloudFormation template. Try again, or contact your administrator if the problem persists.',
  }
);

const CONSOLE_OPEN_FAILED_ERROR = i18n.translate(
  'xpack.fleet.cloudConnector.iacProvisioner.consoleOpenFailedError',
  {
    defaultMessage:
      'The CloudFormation console could not be opened. Allow pop-ups for Kibana and try again.',
  }
);

const TEMPLATE_ALREADY_CURRENT = i18n.translate(
  'xpack.fleet.cloudConnector.iacProvisioner.templateAlreadyCurrent',
  {
    defaultMessage:
      'The CloudFormation stack is already up to date. No template update is required.',
  }
);

/** Confirm payload for a static-template fallback: clears any digest so the connector reads as static. */
const STATIC_FALLBACK_IAC: CloudConnectorIacState = {
  iac_key: null,
  iac_blueprint_id: null,
  iac_blueprint_version: null,
};

export interface TemplateRendered {
  /** IaCP's `templateSha` for the rendered template; stored on the connector as `iac_key`. */
  key: string;
  /** The integration set the template was rendered for; lets callers detect a later edit. */
  integrations: RenderIacTemplateIntegration[];
  /** Blueprint details to store alongside the key. */
  blueprintId: string;
  blueprintVersion: string;
}

export interface UseCloudConnectorTemplateParams {
  /**
   * Provider whose form is calling. Typed from the render request so it widens
   * automatically when the IaC Provisioner gains Azure/GCP blueprints.
   */
  provider: RenderIacTemplateRequest['provider'];
  cloud?: CloudSetupForCloudConnector;
  accountType: AccountType;
  iacTemplateUrl?: string;
  packageName?: string;
  /**
   * Policy templates the user has enabled in the policy being configured, each with
   * the input types they enabled. The rendered template grants permissions for exactly
   * these — no more.
   */
  policyTemplates?: IacPolicyTemplateSelection[];
  /**
   * Stored template digest from this connector. When provided, IaCP compares it with what it
   * would render now and answers `render: false` when the stack is already current, in which
   * case no console is opened. Omit on first render, after a static-template fallback, and
   * from update flows that always want an artifact.
   */
  templateSha?: string;
  /** Full integration set to render (union). When set, overrides packageName + policyTemplates. */
  integrations?: RenderIacTemplateIntegration[];
  /** Existing stack to update; makes the launch URL a stack-update deep link. */
  deploymentId?: string;
  /**
   * Open the package's static template when the render fails or cannot run. First-time
   * onboarding wants this; update flows must not downgrade an identity that already has a
   * generated template.
   */
  staticTemplateFallback?: boolean;
  /**
   * Called once the console has opened on the rendered template (never when a pop-up blocker kept
   * it closed), with the key IaCP returned for it, its blueprint details and the integration
   * set it was rendered for. Callers that write the connector at click time store all of it.
   */
  onTemplateRendered?: (rendered: TemplateRendered) => void;
}

export type CloudConnectorLaunchButtonProps =
  /**
   * IaC Provisioner flow: renders the template just-in-time on click and opens
   * the CloudFormation console.
   */
  | { onClick: () => Promise<void> }
  /**
   * Static flow — today's behavior: a plain link keeps native browser
   * semantics (cmd-click, copy link, no popup blocker involvement).
   */
  | { href: string | undefined; target: '_blank' };

export interface UseCloudConnectorTemplateResult {
  /** Ready to spread onto the Launch CloudFormation button. */
  launchButtonProps: CloudConnectorLaunchButtonProps;
  isDisabled: boolean;
  isGeneratingTemplate: boolean;
  templateGenerationError?: string;
  /** Shown when IaCP reports the stored templateSha still matches. */
  templateAlreadyCurrent?: string;
  /** Persisted on the cloud connector when the package policy is saved. */
  iacConfirm?: CloudConnectorIacState;
  /**
   * Drops `iacConfirm` once a consumer has stored it, so a later save without a new Launch
   * cannot re-post the previous render's template details.
   */
  clearIacConfirm: () => void;
  isIacProvisionerEnabled: boolean;
}

export const useCloudConnectorTemplate = ({
  provider,
  cloud,
  accountType,
  iacTemplateUrl,
  packageName,
  policyTemplates,
  templateSha,
  integrations,
  deploymentId,
  staticTemplateFallback = true,
  onTemplateRendered,
}: UseCloudConnectorTemplateParams): UseCloudConnectorTemplateResult => {
  const { isIacProvisionerEnabled } = useIacProvisioner();
  const { analytics } = useStartServices();
  const [isGeneratingTemplate, setIsGeneratingTemplate] = useState(false);
  const [templateGenerationError, setTemplateGenerationError] = useState<string | undefined>(
    undefined
  );
  const [templateAlreadyCurrent, setTemplateAlreadyCurrent] = useState<string | undefined>(
    undefined
  );
  const [iacConfirm, setIacConfirm] = useState<CloudConnectorIacState | undefined>(undefined);
  const clearIacConfirm = useCallback(() => setIacConfirm(undefined), []);

  // The static URL doubles as the quick-create scaffold for the rendered
  // artifact (console host plus any quick-create params the package's URL
  // carries), so it is always built.
  const staticTemplateUrl = cloud
    ? getCloudConnectorRemoteRoleTemplate({ cloud, accountType, iacTemplateUrl })
    : undefined;

  const launchTemplate = useCallback(async () => {
    setTemplateGenerationError(undefined);
    setTemplateAlreadyCurrent(undefined);
    // Drop any previous confirm so a failed later launch cannot persist
    // a checksum from an earlier successful render.
    setIacConfirm(undefined);

    const reportFallback = (reason: string) => {
      analytics.reportEvent(IAC_PROVISIONER_RENDER_FALLBACK_EVENT.eventType, {
        flow: CLOUD_CONNECTOR_RENDER_FLOW,
        reason,
      });
    };

    // A package with no policy templates cannot contribute to the template, so it is
    // dropped from a multi-package payload rather than sent to the provisioner.
    const renderIntegrations =
      integrations?.filter((integration) => integration.policyTemplates.length > 0) ??
      (packageName && policyTemplates?.length ? [{ name: packageName, policyTemplates }] : []);
    // With a deployment id the update deep link needs no scaffold; otherwise the static URL
    // must carry templateURL= or String.replace would silently discard the render.
    const hasScaffold = Boolean(deploymentId) || hasTemplateUrlParam(staticTemplateUrl);
    if (renderIntegrations.length === 0 || !hasScaffold) {
      if (staticTemplateUrl) {
        reportFallback(IAC_PROVISIONER_FALLBACK_REASON_MISSING_CONTEXT);
        if (staticTemplateFallback) {
          // Record the static fallback only when the console actually opened, as for a render.
          if (window.open(staticTemplateUrl, '_blank') !== null) {
            setIacConfirm(STATIC_FALLBACK_IAC);
          } else {
            setTemplateGenerationError(CONSOLE_OPEN_FAILED_ERROR);
          }
          return;
        }
      }
      setTemplateGenerationError(MISSING_CONTEXT_ERROR);
      return;
    }

    // The tab must open synchronously within the user gesture — popup
    // blockers (Safari always, Firefox by default) drop window.open calls
    // made after an await. The tab is opened blank now and navigated (or
    // closed) once the render settles.
    const cloudFormationTab = window.open('', '_blank');
    /** True when the console page is actually open in a tab; false when the blocker ate it. */
    const navigateTo = (url: string): boolean => {
      if (cloudFormationTab && !cloudFormationTab.closed) {
        cloudFormationTab.location.href = url;
        return true;
      }
      // The blank tab was blocked or closed mid-render; a direct open is the only remaining
      // option, and the blocker may eat it too.
      return window.open(url, '_blank') !== null;
    };

    const fallbackToStatic = (reason: string) => {
      reportFallback(reason);
      if (staticTemplateUrl && staticTemplateFallback) {
        if (navigateTo(staticTemplateUrl)) {
          setIacConfirm(STATIC_FALLBACK_IAC);
        } else {
          setTemplateGenerationError(CONSOLE_OPEN_FAILED_ERROR);
        }
        return;
      }
      cloudFormationTab?.close();
      setTemplateGenerationError(TEMPLATE_GENERATION_ERROR);
    };

    setIsGeneratingTemplate(true);
    try {
      const { data, error } = await sendRenderIacTemplate({
        provider,
        workflow: IAC_FEDERATED_IDENTITY_WORKFLOW,
        flow: CLOUD_CONNECTOR_RENDER_FLOW,
        integrations: renderIntegrations,
        ...(templateSha ? { templateSha } : {}),
      });

      if (error || !data) {
        fallbackToStatic(IAC_PROVISIONER_FALLBACK_REASON_RENDER_FAILED);
        return;
      }

      // Only reachable when a stored templateSha was sent: the deployed stack already
      // matches what IaCP would render, so there is nothing to apply.
      if (data.render === false) {
        cloudFormationTab?.close();
        setIacConfirm(undefined);
        setTemplateAlreadyCurrent(TEMPLATE_ALREADY_CURRENT);
        return;
      }

      if (data.render !== true || !data.artifactUrl) {
        fallbackToStatic(IAC_PROVISIONER_FALLBACK_REASON_RENDER_FAILED);
        return;
      }

      // Compute the launch URL before recording the template details so iacConfirm and
      // onTemplateRendered only reflect renders that actually open the console.
      // artifactUrl embeds signing credentials — never cache it and never write
      // it anywhere other than the URL.
      const launchUrl = getIacLaunchUrl({
        provider,
        staticUrl: staticTemplateUrl,
        artifactUrl: data.artifactUrl,
        deploymentId,
      });
      if (!launchUrl) {
        cloudFormationTab?.close();
        setTemplateGenerationError(MISSING_CONTEXT_ERROR);
        return;
      }

      // Navigate first: the template details is only recorded (and callers only unblock) for a template
      // the user can actually see in the console. A pop-up blocker that ate both tabs must not
      // leave a digest on the connector for a stack that was never opened.
      if (!navigateTo(launchUrl)) {
        setTemplateGenerationError(CONSOLE_OPEN_FAILED_ERROR);
        return;
      }
      setIacConfirm({
        iac_key: data.templateSha,
        iac_blueprint_id: data.blueprint.id,
        iac_blueprint_version: data.blueprint.version,
      });
      onTemplateRendered?.({
        key: data.templateSha,
        integrations: renderIntegrations,
        blueprintId: data.blueprint.id,
        blueprintVersion: data.blueprint.version,
      });
    } catch (e) {
      cloudFormationTab?.close();
      setIacConfirm(undefined);
      setTemplateGenerationError(TEMPLATE_GENERATION_ERROR);
    } finally {
      setIsGeneratingTemplate(false);
    }
  }, [
    analytics,
    deploymentId,
    integrations,
    onTemplateRendered,
    packageName,
    policyTemplates,
    provider,
    staticTemplateFallback,
    staticTemplateUrl,
    templateSha,
  ]);

  if (!isIacProvisionerEnabled) {
    return {
      launchButtonProps: { href: staticTemplateUrl, target: '_blank' },
      isDisabled: !staticTemplateUrl,
      isGeneratingTemplate: false,
      clearIacConfirm,
      isIacProvisionerEnabled,
    };
  }

  return {
    launchButtonProps: { onClick: launchTemplate },
    isDisabled: false,
    isGeneratingTemplate,
    templateGenerationError,
    templateAlreadyCurrent,
    iacConfirm,
    clearIacConfirm,
    isIacProvisionerEnabled,
  };
};
