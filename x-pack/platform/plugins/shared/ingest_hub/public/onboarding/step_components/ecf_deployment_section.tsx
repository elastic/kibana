/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { css } from '@emotion/react';
import {
  EuiBadge,
  EuiButton,
  EuiCallOut,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiHorizontalRule,
  EuiIcon,
  EuiIconTip,
  EuiPanel,
  EuiSpacer,
  EuiText,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import useSessionStorage from 'react-use/lib/useSessionStorage';

import { AWS_SERVICES_MAP } from '../aws_service_matrix';
import type { DataFormat } from '../aws_service_matrix';
import {
  getEcfServiceConfigs,
  buildEcfUnifiedCloudFormationUrl,
  buildEcfOtelCloudFormationUrl,
  buildEcfCrowdstrikeCloudFormationUrl,
  buildEcfStackUpdateUrl,
  buildEcfTemplateUrl,
  isEcfStackArnValid,
  normaliseLogGroupArn,
  ECF_UNIFIED_STACK_NAME,
  ECF_OTEL_STACK_NAME,
  ECF_CROWDSTRIKE_STACK_NAME,
  ECF_UNIFIED_TEMPLATE_FILE,
  ECF_OTEL_TEMPLATE_FILE,
  ECF_CROWDSTRIKE_TEMPLATE_FILE,
} from '../ecf_cloudformation';
import type { EcfServiceConfig } from '../ecf_cloudformation';
import { getOnboardingSessionKey } from '../core/onboarding_session_storage';
import type { ServiceInstance, ServiceVars } from './service_settings_step/use_service_settings';
import { useEcfTemplateVersion } from '../use_ecf_template_version';
import { ECF_STACK_NAME_MAX_LENGTH } from '../../../common/providers/aws/ecf_template_version';

// ── Constants ─────────────────────────────────────────────────────────────────

/** Session storage key for the ECF launch step state (also referenced by the deployment summary). */
export const ECF_LAUNCH_STEP_SESSION_KEY = 'ecfLaunchStep' as const;

/**
 * AWS CloudFormation stack name validation pattern.
 * Must start with a letter and contain only letters, digits, and hyphens.
 * Max length is `ECF_STACK_NAME_MAX_LENGTH` chars total (first letter + up to max−1 more).
 */
const STACK_NAME_REGEX = new RegExp(`^[a-zA-Z][-a-zA-Z0-9]{0,${ECF_STACK_NAME_MAX_LENGTH - 1}}$`);

// ── Types ──────────────────────────────────────────────────────────────────────

type EcfTemplateFamily = 'unified' | 'otel' | 'crowdstrike';

/** Why a launched family's stack no longer matches the current wizard state. */
type EcfStaleReason = 'services' | 'settings';

/** The per-service values that end up in a family's stack parameters, in a comparable form. */
type EcfConfigSnapshot = Array<Pick<EcfServiceConfig, 'serviceId' | 'bucketArns' | 'logGroupArns'>>;

/**
 * Order-independent snapshot of the stack parameters a family's services contribute. Log group
 * ARNs are normalized the way the CloudFormation URLs send them, so an optional `:*` suffix does
 * not count as a change.
 */
const toEcfConfigSnapshot = (configs: EcfServiceConfig[]): EcfConfigSnapshot =>
  configs
    .map(({ serviceId, bucketArns, logGroupArns }) => ({
      serviceId,
      bucketArns: [...bucketArns].sort(),
      logGroupArns: logGroupArns.map(normaliseLogGroupArn).sort(),
    }))
    .sort((a, b) => a.serviceId.localeCompare(b.serviceId));

/** Persisted shape for the ECF launch step in session storage. */
export interface PersistedEcfLaunchStep {
  launchedFamilies: EcfTemplateFamily[];
  /**
   * User-editable stack name per template family.
   * Absent means no override — use the family's default name.
   */
  stackNames?: Partial<Record<EcfTemplateFamily, string>>;
  /**
   * ECF template semantic version resolved at launch time, per family.
   * Stored so the summary step can display it after navigating away and back.
   */
  stackVersions?: Partial<Record<EcfTemplateFamily, string>>;
  /**
   * Sorted service IDs per family at the time of last launch or acknowledged update.
   * Compared against the current selection to detect when the stack is out of sync.
   * Absent for sessions started before this field was added — treated as not stale.
   */
  launchedServiceIds?: Partial<Record<EcfTemplateFamily, string[]>>;
  /**
   * Stack-relevant service settings (bucket and log group ARNs) per family at the time of last
   * launch or acknowledged update. Compared against the current settings to detect drift.
   * Absent for sessions started before this field was added — treated as not stale.
   */
  launchedConfigs?: Partial<Record<EcfTemplateFamily, EcfConfigSnapshot>>;
  /**
   * CloudFormation stack ARN (StackId) per family, pasted by the user after launch.
   * Used to build the AWS Console view/update link. Written to the onboarding SO on Next.
   */
  stackArns?: Partial<Record<EcfTemplateFamily, string>>;
}

// ── Hook ──────────────────────────────────────────────────────────────────────

interface UseEcfDeploymentOpts {
  instances: ServiceInstance[];
  serviceVars: Record<string, ServiceVars>;
  globalRegion: string;
  otlpEndpoint: string | undefined;
  dataFormat: DataFormat;
}

interface UseEcfDeploymentResult {
  /** True when at least one ECF template family is relevant to the selected services. */
  hasAnyEcf: boolean;
  /** True when a previously-launched family (with a valid ARN) has no active services — the AWS stack may still be running. */
  hasRemovedFamiliesWithArn: boolean;
  /** Service IDs handled by ECF — used by the parent to exclude them from managed-integration chips. */
  ecfServiceIds: Set<string>;
  /** True when all relevant ECF template families have had their Launch button clicked. */
  isDone: boolean;
  /** Props to spread onto <EcfDeploymentSection />. */
  sectionProps: EcfDeploymentSectionProps;
  /** Stack ARNs per family, for the parent to include in the onboarding SO on Next. */
  stackArns: Partial<Record<EcfTemplateFamily, string>>;
  /** Current sorted service IDs per family — used by the parent to write the service snapshot to the SO on Next. */
  currentServiceIdsByFamily: Record<EcfTemplateFamily, string[]>;
  /** Current stack-relevant settings per family — used by the parent to write the settings snapshot to the SO on Next. */
  currentConfigsByFamily: Record<EcfTemplateFamily, EcfConfigSnapshot>;
  /** Advances the launchedServiceIds snapshot to the current selection for all stale families. Call on Next before persisting. */
  advanceStaleSnapshots: () => void;
}

/** Encapsulates all ECF-related state and URL derivation for the Authenticate & Deploy step. */
export const useEcfDeployment = ({
  instances,
  serviceVars,
  globalRegion,
  otlpEndpoint,
  dataFormat,
}: UseEcfDeploymentOpts): UseEcfDeploymentResult => {
  const [persistedLaunchStep, setPersistedLaunchStep] = useSessionStorage<PersistedEcfLaunchStep>(
    getOnboardingSessionKey('aws', ECF_LAUNCH_STEP_SESSION_KEY),
    { launchedFamilies: [] }
  );

  const launchedFamilies: EcfTemplateFamily[] = useMemo(
    () => persistedLaunchStep?.launchedFamilies ?? [],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [persistedLaunchStep?.launchedFamilies]
  );
  const stackNames = persistedLaunchStep?.stackNames ?? {};
  const stackVersions = persistedLaunchStep?.stackVersions ?? {};
  const launchedServiceIds = useMemo(
    () => persistedLaunchStep?.launchedServiceIds ?? {},
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [persistedLaunchStep?.launchedServiceIds]
  );
  const launchedConfigs = useMemo(
    () => persistedLaunchStep?.launchedConfigs ?? {},
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [persistedLaunchStep?.launchedConfigs]
  );
  const [isUpdateOpenedByFamily, setIsUpdateOpenedByFamily] = useState<
    Partial<Record<EcfTemplateFamily, boolean>>
  >({});
  const onUpdateOpened = useCallback((family: EcfTemplateFamily) => {
    setIsUpdateOpenedByFamily((prev) => ({ ...prev, [family]: true }));
  }, []);
  const stackArns = persistedLaunchStep?.stackArns ?? {};

  const { version: templateVersion } = useEcfTemplateVersion();

  const allEcfConfigs = useMemo(
    () => getEcfServiceConfigs(instances, serviceVars),
    [instances, serviceVars]
  );

  const selectedServiceIds = useMemo(
    () => [...new Set(instances.map((i) => i.serviceId))],
    [instances]
  );

  const ecfUnifiedConfigs = useMemo(
    () =>
      allEcfConfigs.filter((c) => AWS_SERVICES_MAP.get(c.serviceId)?.ecfDedicatedTemplate == null),
    [allEcfConfigs]
  );

  const ecfOtelConfigs = useMemo(
    () =>
      allEcfConfigs.filter(
        (c) => AWS_SERVICES_MAP.get(c.serviceId)?.ecfDedicatedTemplate === 'otel'
      ),
    [allEcfConfigs]
  );

  const ecfCrowdstrikeServices = useMemo(
    () =>
      selectedServiceIds.filter(
        (id) => AWS_SERVICES_MAP.get(id)?.ecfDedicatedTemplate === 'crowdstrike_fdr'
      ),
    [selectedServiceIds]
  );

  const hasEcfUnified = ecfUnifiedConfigs.length > 0;
  const hasEcfOtel = ecfOtelConfigs.length > 0;
  const hasEcfCrowdstrike = ecfCrowdstrikeServices.length > 0;
  const hasAnyEcf = hasEcfUnified || hasEcfOtel || hasEcfCrowdstrike;

  // Compute staleness before isDone so isDone can reflect it.
  const currentServiceIdsByFamily = useMemo(
    () => ({
      unified: [...new Set(ecfUnifiedConfigs.map((c) => c.serviceId))].sort(),
      otel: [...new Set(ecfOtelConfigs.map((c) => c.serviceId))].sort(),
      crowdstrike: [...ecfCrowdstrikeServices].sort(),
    }),
    [ecfUnifiedConfigs, ecfOtelConfigs, ecfCrowdstrikeServices]
  );

  // A family is stale when it was launched AND a service-ID snapshot exists AND the current
  // set differs from the snapshot. Old sessions without a snapshot are never considered stale.
  // A family with no currently-selected services is not stale — it is simply no longer active,
  // so there is no visible panel for the user to interact with.
  // The same rule applies to the settings snapshot: the stack parameters derived from the
  // services' bucket and log group ARNs must match what was last launched. A changed service set
  // takes precedence as the reason, since it implies the parameters changed too.
  const currentConfigsByFamily = useMemo(
    () => ({
      unified: toEcfConfigSnapshot(ecfUnifiedConfigs),
      otel: toEcfConfigSnapshot(ecfOtelConfigs),
      // The CrowdStrike template takes no per-service parameters from the wizard.
      crowdstrike: [] as EcfConfigSnapshot,
    }),
    [ecfUnifiedConfigs, ecfOtelConfigs]
  );

  const staleReasonByFamily = useMemo(() => {
    const check = (family: EcfTemplateFamily): EcfStaleReason | undefined => {
      if (!launchedFamilies.includes(family)) return undefined;
      if (currentServiceIdsByFamily[family].length === 0) return undefined;
      const idsSnapshot = launchedServiceIds[family];
      if (
        idsSnapshot !== undefined &&
        JSON.stringify(idsSnapshot) !== JSON.stringify(currentServiceIdsByFamily[family])
      ) {
        return 'services';
      }
      const configsSnapshot = launchedConfigs[family];
      if (
        configsSnapshot !== undefined &&
        JSON.stringify(configsSnapshot) !== JSON.stringify(currentConfigsByFamily[family])
      ) {
        return 'settings';
      }
      return undefined;
    };
    return { unified: check('unified'), otel: check('otel'), crowdstrike: check('crowdstrike') };
  }, [
    launchedFamilies,
    launchedServiceIds,
    launchedConfigs,
    currentServiceIdsByFamily,
    currentConfigsByFamily,
  ]);

  const isStaleByFamily = useMemo(
    () => ({
      unified: staleReasonByFamily.unified !== undefined,
      otel: staleReasonByFamily.otel !== undefined,
      crowdstrike: staleReasonByFamily.crowdstrike !== undefined,
    }),
    [staleReasonByFamily]
  );

  // A stale family only blocks isDone if the user hasn't opened the update wizard for it yet.
  const anyStaleBlockingDone = (['unified', 'otel', 'crowdstrike'] as const).some(
    (f) => isStaleByFamily[f] && !isUpdateOpenedByFamily[f]
  );

  // A family is done only when launched AND a valid ARN has been provided. A stale family
  // where the user has opened the update wizard ("update opened") counts as unblocked so
  // Next is enabled and the snapshot advances on click.
  const isDone =
    !anyStaleBlockingDone &&
    (!hasEcfUnified ||
      (launchedFamilies.includes('unified') &&
        isEcfStackArnValid(stackArns.unified?.trim() ?? ''))) &&
    (!hasEcfOtel ||
      (launchedFamilies.includes('otel') && isEcfStackArnValid(stackArns.otel?.trim() ?? ''))) &&
    (!hasEcfCrowdstrike ||
      (launchedFamilies.includes('crowdstrike') &&
        isEcfStackArnValid(stackArns.crowdstrike?.trim() ?? '')));

  const ecfServiceIds = useMemo(
    () => new Set([...allEcfConfigs.map((c) => c.serviceId), ...ecfCrowdstrikeServices]),
    [allEcfConfigs, ecfCrowdstrikeServices]
  );

  // URLs are always rebuilt with the current stack name from session so the "Reopen" link
  // tracks any post-launch edits the user makes to match their actual AWS stack name.
  // Use the stored version when available (set at launch time) so Reopen always targets the
  // same template the user originally deployed. Falls back to the live version pre-launch.
  const unifiedLaunchUrl = useMemo(
    () =>
      hasEcfUnified
        ? buildEcfUnifiedCloudFormationUrl({
            ecfConfigs: ecfUnifiedConfigs,
            region: globalRegion,
            otlpEndpoint,
            version: stackVersions.unified ?? templateVersion,
            // || (not ??) so an empty string (user cleared the field) falls back to default.
            stackName: stackNames.unified || ECF_UNIFIED_STACK_NAME,
          })
        : undefined,

    [
      hasEcfUnified,
      ecfUnifiedConfigs,
      globalRegion,
      otlpEndpoint,
      templateVersion,
      stackVersions.unified,
      stackNames.unified,
    ]
  );

  const otelLaunchUrl = useMemo(
    () =>
      hasEcfOtel
        ? buildEcfOtelCloudFormationUrl({
            ecfConfigs: ecfOtelConfigs,
            region: globalRegion,
            otlpEndpoint,
            version: stackVersions.otel ?? templateVersion,
            stackName: stackNames.otel || ECF_OTEL_STACK_NAME,
          })
        : undefined,

    [
      hasEcfOtel,
      ecfOtelConfigs,
      globalRegion,
      otlpEndpoint,
      templateVersion,
      stackVersions.otel,
      stackNames.otel,
    ]
  );

  const crowdstrikeLaunchUrl = useMemo(
    () =>
      hasEcfCrowdstrike
        ? buildEcfCrowdstrikeCloudFormationUrl({
            region: globalRegion,
            otlpEndpoint,
            version: stackVersions.crowdstrike ?? templateVersion,
            stackName: stackNames.crowdstrike || ECF_CROWDSTRIKE_STACK_NAME,
          })
        : undefined,

    [
      hasEcfCrowdstrike,
      globalRegion,
      otlpEndpoint,
      templateVersion,
      stackVersions.crowdstrike,
      stackNames.crowdstrike,
    ]
  );

  const onLaunch = (family: EcfTemplateFamily) => {
    setPersistedLaunchStep({
      ...persistedLaunchStep,
      launchedFamilies: [...new Set([...launchedFamilies, family])],
      stackVersions: { ...stackVersions, [family]: templateVersion },
      launchedServiceIds: {
        ...launchedServiceIds,
        [family]: currentServiceIdsByFamily[family],
      },
      launchedConfigs: {
        ...launchedConfigs,
        [family]: currentConfigsByFamily[family],
      },
    });
  };

  const onStackNameChange = (family: EcfTemplateFamily, name: string) => {
    setPersistedLaunchStep({
      ...persistedLaunchStep,
      stackNames: { ...stackNames, [family]: name },
    });
  };

  const onStackArnChange = (family: EcfTemplateFamily, arn: string) => {
    setPersistedLaunchStep({
      ...persistedLaunchStep,
      stackArns: { ...stackArns, [family]: arn },
    });
  };

  // Advances the launchedServiceIds snapshot to the current selection for all stale families.
  // Called by the parent on Next, so the SO is written with up-to-date service IDs.
  const advanceStaleSnapshots = () => {
    const familiesToAdvance = (['unified', 'otel', 'crowdstrike'] as const).filter(
      (f) => isStaleByFamily[f] && isUpdateOpenedByFamily[f]
    );
    if (familiesToAdvance.length === 0) return;
    const updatedIds: Partial<Record<EcfTemplateFamily, string[]>> = { ...launchedServiceIds };
    const updatedConfigs: Partial<Record<EcfTemplateFamily, EcfConfigSnapshot>> = {
      ...launchedConfigs,
    };
    for (const family of familiesToAdvance) {
      updatedIds[family] = currentServiceIdsByFamily[family];
      updatedConfigs[family] = currentConfigsByFamily[family];
    }
    const advanced: PersistedEcfLaunchStep = {
      ...persistedLaunchStep,
      launchedServiceIds: updatedIds,
      launchedConfigs: updatedConfigs,
    };
    setPersistedLaunchStep(advanced);
    // useSessionStorage persists in an effect after the next render, and the caller navigates
    // away right after this, which can unmount the step first and drop the write. Persist now so
    // coming back to the step does not show the stack as stale again.
    try {
      sessionStorage.setItem(
        getOnboardingSessionKey('aws', ECF_LAUNCH_STEP_SESSION_KEY),
        JSON.stringify(advanced)
      );
    } catch {
      // sessionStorage unavailable (private mode, quota exceeded, etc.) — keep the in-memory state.
    }
  };

  // Deep-links to the CFN update wizard, pre-filled with the stack ARN and latest template URL.
  // Only available once the user has pasted a valid ARN.
  const unifiedUpdateUrl = useMemo(() => {
    const arn = stackArns.unified?.trim();
    if (!arn || !isEcfStackArnValid(arn)) return undefined;
    const templateUrl = buildEcfTemplateUrl(
      ECF_UNIFIED_TEMPLATE_FILE,
      stackVersions.unified ?? templateVersion
    );
    return buildEcfStackUpdateUrl(arn, templateUrl);
  }, [stackArns.unified, stackVersions.unified, templateVersion]);

  const otelUpdateUrl = useMemo(() => {
    const arn = stackArns.otel?.trim();
    if (!arn || !isEcfStackArnValid(arn)) return undefined;
    const templateUrl = buildEcfTemplateUrl(
      ECF_OTEL_TEMPLATE_FILE,
      stackVersions.otel ?? templateVersion
    );
    return buildEcfStackUpdateUrl(arn, templateUrl);
  }, [stackArns.otel, stackVersions.otel, templateVersion]);

  const crowdstrikeUpdateUrl = useMemo(() => {
    const arn = stackArns.crowdstrike?.trim();
    if (!arn || !isEcfStackArnValid(arn)) return undefined;
    const templateUrl = buildEcfTemplateUrl(
      ECF_CROWDSTRIKE_TEMPLATE_FILE,
      stackVersions.crowdstrike ?? templateVersion
    );
    return buildEcfStackUpdateUrl(arn, templateUrl);
  }, [stackArns.crowdstrike, stackVersions.crowdstrike, templateVersion]);

  // Families that were launched with a valid ARN but now have no active services.
  // The CloudFormation stack may still be running in AWS — surface a warning even when
  // hasAnyEcf is false so the parent can keep the section visible.
  const removedFamiliesWithArn = (['unified', 'otel', 'crowdstrike'] as const).filter((family) => {
    if (!launchedFamilies.includes(family)) return false;
    const arn = stackArns[family];
    if (!arn || !isEcfStackArnValid(arn.trim())) return false;
    if (family === 'unified') return !hasEcfUnified;
    if (family === 'otel') return !hasEcfOtel;
    return !hasEcfCrowdstrike;
  });

  return {
    hasAnyEcf,
    hasRemovedFamiliesWithArn: removedFamiliesWithArn.length > 0,
    ecfServiceIds,
    isDone,
    stackArns,
    currentServiceIdsByFamily,
    currentConfigsByFamily,
    advanceStaleSnapshots,
    sectionProps: {
      ecfUnifiedConfigs,
      ecfOtelConfigs,
      ecfCrowdstrikeServices,
      unifiedLaunchUrl,
      otelLaunchUrl,
      crowdstrikeLaunchUrl,
      unifiedUpdateUrl,
      otelUpdateUrl,
      crowdstrikeUpdateUrl,
      globalRegion,
      launchedFamilies,
      stackNames,
      stackVersions,
      stackArns,
      isStaleByFamily,
      staleReasonByFamily,
      isUpdateOpenedByFamily,
      onLaunch,
      onUpdateOpened,
      onStackNameChange,
      onStackArnChange,
    },
  };
};

// ── EcfFamilyPanel ─────────────────────────────────────────────────────────────

interface EcfFamilyPanelProps {
  description: React.ReactNode;
  launchUrl: string | undefined;
  isLaunched: boolean;
  onLaunch: () => void;
  launchButtonTestSubj: string;
  /** Current stack name value (persisted or default). Shown in the post-launch field. */
  stackName: string;
  /** ECF version stored at launch time (undefined until launched). */
  stackVersion: string | undefined;
  /** Default stack name for this family — used as placeholder text. */
  defaultStackName: string;
  /** Called whenever the user edits the stack name field. */
  onStackNameChange: (name: string) => void;
  /** CloudFormation stack ARN pasted by the user (empty string when not yet provided). */
  stackArn: string;
  /** True when the current service selection or settings differ from what was last launched. */
  isStale: boolean;
  /** What changed since the last launch; selects the stale callout wording. */
  staleReason: EcfStaleReason | undefined;
  /** True when the user has clicked "Update stack" for this family. */
  isUpdateOpened: boolean;
  /** Called whenever the user edits the stack ARN field. */
  onStackArnChange: (arn: string) => void;
  /** Deep-link to the AWS Console CloudFormation update wizard for this stack. Undefined when the ARN is not yet valid. */
  updateUrl: string | undefined;
  /** Called when the user clicks "Update stack". */
  onUpdateOpened: () => void;
}

interface EcfFamilyPanelPostLaunchProps {
  stackName: string;
  stackVersion: string | undefined;
  defaultStackName: string;
  onStackNameChange: (name: string) => void;
  testSubjPrefix: string;
  stackArn: string;
  isStale: boolean;
  staleReason: EcfStaleReason | undefined;
  /** True when the user has clicked "Update stack" and the update wizard was opened. */
  isUpdateOpened: boolean;
  onStackArnChange: (arn: string) => void;
  /** Deep-link to the AWS Console CloudFormation update wizard for this stack. Undefined when the ARN is not yet valid. */
  updateUrl: string | undefined;
  /** Called when the user clicks "Update stack" to open the AWS Console. */
  onUpdateOpened: () => void;
}

/** Post-launch content for one ECF template family: stack name, version, stale callout (if applicable), and ARN field. */
const EcfFamilyPanelPostLaunch = ({
  stackName,
  stackVersion,
  defaultStackName,
  onStackNameChange,
  testSubjPrefix,
  stackArn,
  isStale,
  staleReason,
  isUpdateOpened,
  onStackArnChange,
  updateUrl,
  onUpdateOpened,
}: EcfFamilyPanelPostLaunchProps) => {
  const [touched, setTouched] = useState(false);

  const stackNameError = useMemo(() => {
    if (!touched || stackName === '' || STACK_NAME_REGEX.test(stackName)) return null;
    return i18n.translate('xpack.ingestHub.authenticateAndDeployStep.ecfSection.stackNameError', {
      defaultMessage:
        'Stack name must start with a letter and contain only letters, digits, and hyphens (max 128 characters).',
    });
  }, [stackName, touched]);

  const isStackNameValid = stackName === '' || STACK_NAME_REGEX.test(stackName);
  const isArnValid = isEcfStackArnValid(stackArn.trim());

  return (
    <>
      {/* Stale callout — shown when the current service selection differs from last launch */}
      {isStale && (
        <>
          {isUpdateOpened ? (
            <EuiCallOut
              announceOnMount
              color="success"
              iconType="check"
              title={
                <FormattedMessage
                  id="xpack.ingestHub.authenticateAndDeployStep.ecfSection.updateOpenedCallout.title"
                  defaultMessage="Update opened in AWS Console"
                />
              }
              data-test-subj={`${testSubjPrefix}-updateOpenedCallout`}
            >
              <p>
                <FormattedMessage
                  id="xpack.ingestHub.authenticateAndDeployStep.ecfSection.updateOpenedCallout.body"
                  defaultMessage="Complete the stack update in the AWS Console, then click Next to continue."
                />
              </p>
              <EuiButton
                href={updateUrl}
                target="_blank"
                color="success"
                iconType="external"
                iconSide="right"
                size="s"
                data-test-subj={`${testSubjPrefix}-updateStackButton`}
              >
                <FormattedMessage
                  id="xpack.ingestHub.authenticateAndDeployStep.ecfSection.updateOpenedCallout.reopenButton"
                  defaultMessage="Open in AWS Console again"
                />
              </EuiButton>
            </EuiCallOut>
          ) : (
            <EuiCallOut
              announceOnMount
              color="warning"
              iconType="warning"
              title={
                staleReason === 'settings' ? (
                  <FormattedMessage
                    id="xpack.ingestHub.authenticateAndDeployStep.ecfSection.staleCallout.settingsTitle"
                    defaultMessage="Service settings changed — update your CloudFormation stack"
                  />
                ) : (
                  <FormattedMessage
                    id="xpack.ingestHub.authenticateAndDeployStep.ecfSection.staleCallout.title"
                    defaultMessage="Services changed — update your CloudFormation stack"
                  />
                )
              }
              data-test-subj={`${testSubjPrefix}-staleCallout`}
            >
              <p>
                {staleReason === 'settings' ? (
                  <FormattedMessage
                    id="xpack.ingestHub.authenticateAndDeployStep.ecfSection.staleCallout.settingsBody"
                    defaultMessage="Your service settings have changed since this stack was last launched. Update the stack in AWS to apply the new parameters."
                  />
                ) : (
                  <FormattedMessage
                    id="xpack.ingestHub.authenticateAndDeployStep.ecfSection.staleCallout.body"
                    defaultMessage="Your service selection has changed since this stack was last launched. Update the stack in AWS to apply the new parameters."
                  />
                )}
              </p>
              <EuiButton
                href={updateUrl}
                target="_blank"
                isDisabled={!updateUrl}
                color="warning"
                onClick={onUpdateOpened}
                iconType="external"
                iconSide="right"
                size="s"
                data-test-subj={`${testSubjPrefix}-updateStackButton`}
              >
                <FormattedMessage
                  id="xpack.ingestHub.authenticateAndDeployStep.ecfSection.staleCallout.updateButton"
                  defaultMessage="Update stack"
                />
              </EuiButton>
              {!updateUrl && (
                <>
                  <EuiSpacer size="xs" />
                  <EuiText size="xs" color="subdued">
                    <FormattedMessage
                      id="xpack.ingestHub.authenticateAndDeployStep.ecfSection.staleCallout.arnHint"
                      defaultMessage="Paste your stack ARN below to enable this link."
                    />
                  </EuiText>
                </>
              )}
            </EuiCallOut>
          )}
          <EuiSpacer size="m" />
        </>
      )}

      {/* Stack name field */}
      <EuiFormRow
        label={
          <EuiFlexGroup alignItems="center" gutterSize="xs" responsive={false}>
            <EuiFlexItem grow={false}>
              <FormattedMessage
                id="xpack.ingestHub.authenticateAndDeployStep.ecfSection.stackNameLabel"
                defaultMessage="Stack name"
              />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiIconTip
                content={i18n.translate(
                  'xpack.ingestHub.authenticateAndDeployStep.ecfSection.stackNameTooltip',
                  {
                    defaultMessage:
                      'The CloudFormation stack name pre-filled when you launched. If you renamed the stack in the AWS Console, update this field to keep the saved record accurate.',
                  }
                )}
                position="right"
                type="question"
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        }
        isInvalid={Boolean(stackNameError)}
        error={stackNameError}
        data-test-subj={`${testSubjPrefix}-stackNameRow`}
      >
        <EuiFieldText
          value={stackName}
          placeholder={`e.g.: ${defaultStackName}-xxxx`}
          isInvalid={Boolean(stackNameError)}
          append={
            isStackNameValid && stackName !== '' ? (
              <EuiIcon type="check" color="success" aria-label="valid" />
            ) : undefined
          }
          onChange={(e) => {
            setTouched(true);
            onStackNameChange(e.target.value);
          }}
          onBlur={() => setTouched(true)}
          data-test-subj={`${testSubjPrefix}-stackNameField`}
        />
      </EuiFormRow>

      {/* Version display */}
      {stackVersion && (
        <>
          <EuiSpacer size="s" />
          <EuiText size="xs" color="subdued" data-test-subj={`${testSubjPrefix}-version`}>
            <FormattedMessage
              id="xpack.ingestHub.authenticateAndDeployStep.ecfSection.versionLabel"
              defaultMessage="ECF version: {version}"
              values={{ version: <strong>{stackVersion}</strong> }}
            />
          </EuiText>
        </>
      )}

      {/* Stack ARN field — always shown post-launch so the user can paste or correct the ARN */}
      <EuiSpacer size="m" />
      <EuiFormRow
        label={i18n.translate(
          'xpack.ingestHub.authenticateAndDeployStep.ecfSection.stackArnLabel',
          { defaultMessage: 'Stack ARN' }
        )}
        helpText={
          <FormattedMessage
            id="xpack.ingestHub.authenticateAndDeployStep.ecfSection.stackArnHelp"
            defaultMessage="Copy the Stack ID from the AWS CloudFormation console and paste it here to confirm deployment and enable the Update stack link."
          />
        }
        data-test-subj={`${testSubjPrefix}-stackArnRow`}
      >
        <EuiFieldText
          value={stackArn}
          placeholder="arn:aws:cloudformation:us-east-1:123456789012:stack/..."
          append={
            isArnValid ? <EuiIcon type="check" color="success" aria-label="valid ARN" /> : undefined
          }
          onChange={(e) => onStackArnChange(e.target.value)}
          data-test-subj={`${testSubjPrefix}-stackArnField`}
        />
      </EuiFormRow>
    </>
  );
};

/** Renders the content for one ECF template family (description, launch/deploying UI). */
const EcfFamilyPanel = ({
  description,
  launchUrl,
  isLaunched,
  onLaunch,
  launchButtonTestSubj,
  stackName,
  stackVersion,
  defaultStackName,
  onStackNameChange,
  stackArn,
  isStale,
  staleReason,
  isUpdateOpened,
  onStackArnChange,
  updateUrl,
  onUpdateOpened,
}: EcfFamilyPanelProps) => {
  const isArnValid = isEcfStackArnValid(stackArn.trim());

  // Show the Launch button until the user provides a valid ARN. When stale with a valid ARN the
  // Update button in the stale callout is shown instead — re-launching would create a new stack.
  const showLaunchButton = !isLaunched || !isArnValid;

  return (
    <EuiPanel paddingSize="m" hasBorder={false} hasShadow={false}>
      <EuiText size="s" color="subdued">
        <p>{description}</p>
      </EuiText>
      <EuiSpacer size="m" />

      {showLaunchButton && (
        <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiButton
              href={launchUrl}
              target="_blank"
              iconType="external"
              iconSide="right"
              fill
              onClick={onLaunch}
              data-test-subj={launchButtonTestSubj}
            >
              <FormattedMessage
                id="xpack.ingestHub.authenticateAndDeployStep.ecfSection.launchButton"
                defaultMessage="Launch CloudFormation"
              />
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      )}

      {isLaunched && (
        <>
          {showLaunchButton && <EuiSpacer size="m" />}
          <EcfFamilyPanelPostLaunch
            stackName={stackName}
            stackVersion={stackVersion}
            defaultStackName={defaultStackName}
            onStackNameChange={onStackNameChange}
            testSubjPrefix={launchButtonTestSubj}
            stackArn={stackArn}
            isStale={isStale}
            staleReason={staleReason}
            isUpdateOpened={isUpdateOpened}
            onStackArnChange={onStackArnChange}
            updateUrl={updateUrl}
            onUpdateOpened={onUpdateOpened}
          />
        </>
      )}
    </EuiPanel>
  );
};

// ── EcfDeploymentSection ──────────────────────────────────────────────────────

interface EcfDeploymentSectionProps {
  ecfUnifiedConfigs: EcfServiceConfig[];
  ecfOtelConfigs: EcfServiceConfig[];
  ecfCrowdstrikeServices: string[];
  unifiedLaunchUrl: string | undefined;
  otelLaunchUrl: string | undefined;
  crowdstrikeLaunchUrl: string | undefined;
  /** Deep-link to the CFN update wizard for the unified stack. Undefined until a valid ARN is provided. */
  unifiedUpdateUrl: string | undefined;
  /** Deep-link to the CFN update wizard for the OTel stack. Undefined until a valid ARN is provided. */
  otelUpdateUrl: string | undefined;
  /** Deep-link to the CFN update wizard for the CrowdStrike stack. Undefined until a valid ARN is provided. */
  crowdstrikeUpdateUrl: string | undefined;
  globalRegion: string;
  launchedFamilies: EcfTemplateFamily[];
  stackNames: Partial<Record<EcfTemplateFamily, string>>;
  stackVersions: Partial<Record<EcfTemplateFamily, string>>;
  stackArns: Partial<Record<EcfTemplateFamily, string>>;
  isStaleByFamily: Record<EcfTemplateFamily, boolean>;
  staleReasonByFamily: Record<EcfTemplateFamily, EcfStaleReason | undefined>;
  isUpdateOpenedByFamily: Partial<Record<EcfTemplateFamily, boolean>>;
  onLaunch: (family: EcfTemplateFamily) => void;
  onUpdateOpened: (family: EcfTemplateFamily) => void;
  onStackNameChange: (family: EcfTemplateFamily, name: string) => void;
  onStackArnChange: (family: EcfTemplateFamily, arn: string) => void;
}

/** Collapsible accordion for all Elastic Cloud Forwarder template families in Step 3. */
export const EcfDeploymentSection = ({
  ecfUnifiedConfigs,
  ecfOtelConfigs,
  ecfCrowdstrikeServices,
  unifiedLaunchUrl,
  otelLaunchUrl,
  crowdstrikeLaunchUrl,
  unifiedUpdateUrl,
  otelUpdateUrl,
  crowdstrikeUpdateUrl,
  launchedFamilies,
  stackNames,
  stackVersions,
  stackArns,
  isStaleByFamily,
  staleReasonByFamily,
  isUpdateOpenedByFamily,
  onLaunch,
  onUpdateOpened,
  onStackNameChange,
  onStackArnChange,
}: EcfDeploymentSectionProps) => {
  const { euiTheme } = useEuiTheme();
  const contentId = useGeneratedHtmlId({ prefix: 'ecfContent' });

  const hasEcfUnified = ecfUnifiedConfigs.length > 0;
  const hasEcfOtel = ecfOtelConfigs.length > 0;
  const hasEcfCrowdstrike = ecfCrowdstrikeServices.length > 0;

  const isDone =
    !(['unified', 'otel', 'crowdstrike'] as const).some(
      (f) => isStaleByFamily[f] && !isUpdateOpenedByFamily[f]
    ) &&
    (!hasEcfUnified ||
      (launchedFamilies.includes('unified') &&
        isEcfStackArnValid(stackArns.unified?.trim() ?? ''))) &&
    (!hasEcfOtel ||
      (launchedFamilies.includes('otel') && isEcfStackArnValid(stackArns.otel?.trim() ?? ''))) &&
    (!hasEcfCrowdstrike ||
      (launchedFamilies.includes('crowdstrike') &&
        isEcfStackArnValid(stackArns.crowdstrike?.trim() ?? '')));

  // Families where the user previously launched (with a valid ARN) but all services were
  // subsequently removed. The family panel is hidden, but the CloudFormation stack may still
  // be running in the user's AWS account.
  const removedFamiliesWithArn = (['unified', 'otel', 'crowdstrike'] as const).filter((family) => {
    if (!launchedFamilies.includes(family)) return false;
    const arn = stackArns[family];
    if (!arn || !isEcfStackArnValid(arn.trim())) return false;
    if (family === 'unified') return !hasEcfUnified;
    if (family === 'otel') return !hasEcfOtel;
    return !hasEcfCrowdstrike;
  });

  const totalServiceCount =
    ecfUnifiedConfigs.length + ecfOtelConfigs.length + ecfCrowdstrikeServices.length;

  // Always start open. The user can manually collapse after reviewing.
  const [isOpen, setIsOpen] = useState(true);

  const headerButtonCss = css`
    display: block;
    width: 100%;
    text-align: left;
    background-color: ${euiTheme.colors.backgroundBaseSubdued};
    border: none;
    padding: ${euiTheme.size.l} ${euiTheme.size.m};
    cursor: pointer;
    border-bottom: ${isOpen ? `1px solid ${euiTheme.colors.borderBaseSubdued}` : 'none'};
  `;

  return (
    <EuiPanel
      hasBorder
      paddingSize="none"
      style={{ overflow: 'hidden', borderColor: euiTheme.colors.borderBaseSubdued }}
      data-test-subj="ecfDeploymentSection"
    >
      <button
        type="button"
        css={headerButtonCss}
        aria-expanded={isOpen}
        aria-controls={contentId}
        onClick={() => setIsOpen((v) => !v)}
        data-test-subj="ecfDeploymentSection-headerButton"
      >
        <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiIcon type="cloud" size="m" color="subdued" aria-hidden />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiText size="s">
              <strong>
                <FormattedMessage
                  id="xpack.ingestHub.authenticateAndDeployStep.ecfSection.title"
                  defaultMessage="Elastic Cloud Forwarder"
                />
              </strong>
            </EuiText>
          </EuiFlexItem>
          {isDone && (
            <EuiFlexItem grow={false}>
              <EuiBadge color="success" iconType="check">
                <FormattedMessage
                  id="xpack.ingestHub.authenticateAndDeployStep.ecfSection.doneBadge"
                  defaultMessage="Done"
                />
              </EuiBadge>
            </EuiFlexItem>
          )}
          {totalServiceCount > 0 && (
            <EuiFlexItem grow={false}>
              <EuiText size="s" color="subdued">
                <FormattedMessage
                  id="xpack.ingestHub.authenticateAndDeployStep.ecfSection.serviceCount"
                  defaultMessage="{count, plural, one {# service} other {# services}}"
                  values={{ count: totalServiceCount }}
                />
              </EuiText>
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      </button>

      {isOpen && (
        <div id={contentId} role="region">
          {/* Section-level warning: user removed all services for a family that had a deployed
              stack (with a valid ARN). The CloudFormation stack may still be running in AWS. */}
          {removedFamiliesWithArn.length > 0 && (
            <EuiPanel paddingSize="m" hasBorder={false} hasShadow={false}>
              <EuiCallOut
                announceOnMount
                color="warning"
                iconType="warning"
                title={
                  <FormattedMessage
                    id="xpack.ingestHub.authenticateAndDeployStep.ecfSection.removedFamilyCallout.title"
                    defaultMessage="CloudFormation stack may still be running"
                  />
                }
                data-test-subj="ecfDeploymentSection-removedFamilyCallout"
              >
                <FormattedMessage
                  id="xpack.ingestHub.authenticateAndDeployStep.ecfSection.removedFamilyCallout.body"
                  defaultMessage="One or more services have been removed, but the associated CloudFormation stack may still be running in your AWS account. To stop log ingestion and avoid ongoing charges, delete the stack manually in the AWS Console."
                />
              </EuiCallOut>
            </EuiPanel>
          )}

          {hasEcfUnified && (
            <>
              {removedFamiliesWithArn.length > 0 && <EuiHorizontalRule margin="none" />}
              <EcfFamilyPanel
                description={
                  <FormattedMessage
                    id="xpack.ingestHub.authenticateAndDeployStep.ecfSection.unified.description"
                    defaultMessage="Log collection via a single AWS CloudFormation stack — no agents required. Deploys the <b>ECS-compatible</b> template. Trigger source (S3 or CloudWatch) is configured per service in Service settings. Launch CloudFormation to deploy."
                    values={{ b: (chunks) => <strong>{chunks}</strong> }}
                  />
                }
                launchUrl={unifiedLaunchUrl}
                isLaunched={launchedFamilies.includes('unified')}
                onLaunch={() => onLaunch('unified')}
                launchButtonTestSubj="ecfDeploymentSection-unifiedLaunchButton"
                stackName={stackNames.unified || ECF_UNIFIED_STACK_NAME}
                stackVersion={stackVersions.unified}
                defaultStackName={ECF_UNIFIED_STACK_NAME}
                onStackNameChange={(name) => onStackNameChange('unified', name)}
                stackArn={stackArns.unified ?? ''}
                isStale={isStaleByFamily.unified}
                staleReason={staleReasonByFamily.unified}
                isUpdateOpened={isUpdateOpenedByFamily.unified ?? false}
                onStackArnChange={(arn) => onStackArnChange('unified', arn)}
                updateUrl={unifiedUpdateUrl}
                onUpdateOpened={() => onUpdateOpened('unified')}
              />
            </>
          )}

          {hasEcfOtel && (
            <>
              {(removedFamiliesWithArn.length > 0 || hasEcfUnified) && (
                <EuiHorizontalRule margin="none" />
              )}
              <EcfFamilyPanel
                description={
                  <FormattedMessage
                    id="xpack.ingestHub.authenticateAndDeployStep.ecfSection.otel.description"
                    defaultMessage="Log collection via a single AWS CloudFormation stack — no agents required. Deploys the <b>OTel-native</b> template, per the data format chosen in Step 1. Trigger source (S3 or CloudWatch) is configured per service in Service settings. Launch CloudFormation to deploy."
                    values={{ b: (chunks) => <strong>{chunks}</strong> }}
                  />
                }
                launchUrl={otelLaunchUrl}
                isLaunched={launchedFamilies.includes('otel')}
                onLaunch={() => onLaunch('otel')}
                launchButtonTestSubj="ecfDeploymentSection-otelLaunchButton"
                stackName={stackNames.otel || ECF_OTEL_STACK_NAME}
                stackVersion={stackVersions.otel}
                defaultStackName={ECF_OTEL_STACK_NAME}
                onStackNameChange={(name) => onStackNameChange('otel', name)}
                stackArn={stackArns.otel ?? ''}
                isStale={isStaleByFamily.otel}
                staleReason={staleReasonByFamily.otel}
                isUpdateOpened={isUpdateOpenedByFamily.otel ?? false}
                onStackArnChange={(arn) => onStackArnChange('otel', arn)}
                updateUrl={otelUpdateUrl}
                onUpdateOpened={() => onUpdateOpened('otel')}
              />
            </>
          )}

          {hasEcfCrowdstrike && (
            <>
              {(removedFamiliesWithArn.length > 0 || hasEcfUnified || hasEcfOtel) && (
                <EuiHorizontalRule margin="none" />
              )}
              <EcfFamilyPanel
                description={
                  <FormattedMessage
                    id="xpack.ingestHub.authenticateAndDeployStep.ecfSection.crowdstrike.description"
                    defaultMessage="Log collection via a dedicated AWS CloudFormation stack for CrowdStrike Falcon Data Replicator — no agents required."
                  />
                }
                launchUrl={crowdstrikeLaunchUrl}
                isLaunched={launchedFamilies.includes('crowdstrike')}
                onLaunch={() => onLaunch('crowdstrike')}
                launchButtonTestSubj="ecfDeploymentSection-crowdstrikeLaunchButton"
                stackName={stackNames.crowdstrike || ECF_CROWDSTRIKE_STACK_NAME}
                stackVersion={stackVersions.crowdstrike}
                defaultStackName={ECF_CROWDSTRIKE_STACK_NAME}
                onStackNameChange={(name) => onStackNameChange('crowdstrike', name)}
                stackArn={stackArns.crowdstrike ?? ''}
                isStale={isStaleByFamily.crowdstrike}
                staleReason={staleReasonByFamily.crowdstrike}
                isUpdateOpened={isUpdateOpenedByFamily.crowdstrike ?? false}
                onStackArnChange={(arn) => onStackArnChange('crowdstrike', arn)}
                updateUrl={crowdstrikeUpdateUrl}
                onUpdateOpened={() => onUpdateOpened('crowdstrike')}
              />
            </>
          )}
        </div>
      )}
    </EuiPanel>
  );
};
