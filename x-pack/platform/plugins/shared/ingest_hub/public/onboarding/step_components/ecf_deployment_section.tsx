/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
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
  buildEcfStackConsoleUrl,
  isEcfStackArnValid,
  ECF_UNIFIED_STACK_NAME,
  ECF_OTEL_STACK_NAME,
  ECF_CROWDSTRIKE_STACK_NAME,
} from '../ecf_cloudformation';
import type { EcfServiceConfig } from '../ecf_cloudformation';
import { getOnboardingSessionKey } from '../onboarding_session_storage';
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
  /** Service IDs handled by ECF — used by the parent to exclude them from managed-integration chips. */
  ecfServiceIds: Set<string>;
  /** True when all relevant ECF template families have had their Launch button clicked. */
  isDone: boolean;
  /** Props to spread onto <EcfDeploymentSection />. */
  sectionProps: EcfDeploymentSectionProps;
  /** Stack ARNs per family, for the parent to include in the onboarding SO on Next. */
  stackArns: Partial<Record<EcfTemplateFamily, string>>;
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
  const isStaleByFamily = useMemo(() => {
    const check = (family: EcfTemplateFamily): boolean => {
      if (!launchedFamilies.includes(family)) return false;
      if (currentServiceIdsByFamily[family].length === 0) return false;
      const snapshot = launchedServiceIds[family];
      if (snapshot === undefined) return false;
      return JSON.stringify(snapshot) !== JSON.stringify(currentServiceIdsByFamily[family]);
    };
    return { unified: check('unified'), otel: check('otel'), crowdstrike: check('crowdstrike') };
  }, [launchedFamilies, launchedServiceIds, currentServiceIdsByFamily]);

  const anyStale = Object.values(isStaleByFamily).some(Boolean);

  // A family is done only when launched AND a valid ARN has been provided.
  const isDone =
    !anyStale &&
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

  // Called when the user clicks "Update stack" — records the current service IDs as
  // acknowledged so the stale callout clears for this session.
  const onUpdateStack = (family: EcfTemplateFamily) => {
    setPersistedLaunchStep({
      ...persistedLaunchStep,
      launchedServiceIds: {
        ...launchedServiceIds,
        [family]: currentServiceIdsByFamily[family],
      },
    });
  };

  return {
    hasAnyEcf,
    ecfServiceIds,
    isDone,
    stackArns,
    sectionProps: {
      ecfUnifiedConfigs,
      ecfOtelConfigs,
      ecfCrowdstrikeServices,
      unifiedLaunchUrl,
      otelLaunchUrl,
      crowdstrikeLaunchUrl,
      globalRegion,
      launchedFamilies,
      stackNames,
      stackVersions,
      stackArns,
      isStaleByFamily,
      onLaunch,
      onStackNameChange,
      onStackArnChange,
      onUpdateStack,
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
  /** True when the current service selection differs from what was last launched. */
  isStale: boolean;
  /** Called whenever the user edits the stack ARN field. */
  onStackArnChange: (arn: string) => void;
  /** Called when the user clicks "Update stack" — clears the stale state for this session. */
  onUpdateStack: () => void;
}

interface EcfFamilyPanelPostLaunchProps {
  stackName: string;
  stackVersion: string | undefined;
  defaultStackName: string;
  onStackNameChange: (name: string) => void;
  testSubjPrefix: string;
  stackArn: string;
  isStale: boolean;
  onStackArnChange: (arn: string) => void;
  onUpdateStack: () => void;
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
  onStackArnChange,
  onUpdateStack,
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

  const stackArnTrimmed = stackArn.trim();
  const isArnValid = isEcfStackArnValid(stackArnTrimmed);
  const stackConsoleUrl = isArnValid ? buildEcfStackConsoleUrl(stackArnTrimmed) : undefined;

  return (
    <>
      {/* Stale callout — shown when the current service selection differs from last launch */}
      {isStale && (
        <>
          <EuiCallOut
            announceOnMount
            color="warning"
            iconType="warning"
            title={
              <FormattedMessage
                id="xpack.ingestHub.authenticateAndDeployStep.ecfSection.staleCallout.title"
                defaultMessage="Services changed — update your CloudFormation stack"
              />
            }
            data-test-subj={`${testSubjPrefix}-staleCallout`}
          >
            <p>
              <FormattedMessage
                id="xpack.ingestHub.authenticateAndDeployStep.ecfSection.staleCallout.body"
                defaultMessage="Your service selection has changed since this stack was last launched. Update the stack in AWS to apply the new parameters."
              />
            </p>
            <EuiButton
              href={stackConsoleUrl}
              target="_blank"
              isDisabled={!stackConsoleUrl}
              color="warning"
              onClick={onUpdateStack}
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
            {!stackConsoleUrl && (
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
  onStackArnChange,
  onUpdateStack,
}: EcfFamilyPanelProps) => {
  const isArnValid = isEcfStackArnValid(stackArn.trim());

  // Show the Launch button until the user has provided a valid ARN. When stale (services changed),
  // hide the Launch button and show the Update button in the stale callout instead — re-launching
  // would create a new stack rather than update the existing one.
  const showLaunchButton = !isLaunched || (!isArnValid && !isStale);

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
            onStackArnChange={onStackArnChange}
            onUpdateStack={onUpdateStack}
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
  globalRegion: string;
  launchedFamilies: EcfTemplateFamily[];
  stackNames: Partial<Record<EcfTemplateFamily, string>>;
  stackVersions: Partial<Record<EcfTemplateFamily, string>>;
  stackArns: Partial<Record<EcfTemplateFamily, string>>;
  isStaleByFamily: Record<EcfTemplateFamily, boolean>;
  onLaunch: (family: EcfTemplateFamily) => void;
  onStackNameChange: (family: EcfTemplateFamily, name: string) => void;
  onStackArnChange: (family: EcfTemplateFamily, arn: string) => void;
  onUpdateStack: (family: EcfTemplateFamily) => void;
}

/** Collapsible accordion for all Elastic Cloud Forwarder template families in Step 3. */
export const EcfDeploymentSection = ({
  ecfUnifiedConfigs,
  ecfOtelConfigs,
  ecfCrowdstrikeServices,
  unifiedLaunchUrl,
  otelLaunchUrl,
  crowdstrikeLaunchUrl,
  launchedFamilies,
  stackNames,
  stackVersions,
  stackArns,
  isStaleByFamily,
  onLaunch,
  onStackNameChange,
  onStackArnChange,
  onUpdateStack,
}: EcfDeploymentSectionProps) => {
  const { euiTheme } = useEuiTheme();
  const contentId = useGeneratedHtmlId({ prefix: 'ecfContent' });

  const hasEcfUnified = ecfUnifiedConfigs.length > 0;
  const hasEcfOtel = ecfOtelConfigs.length > 0;
  const hasEcfCrowdstrike = ecfCrowdstrikeServices.length > 0;

  const isDone =
    !Object.values(isStaleByFamily).some(Boolean) &&
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
          <EuiFlexItem grow={false}>
            <EuiText size="s" color="subdued">
              <FormattedMessage
                id="xpack.ingestHub.authenticateAndDeployStep.ecfSection.serviceCount"
                defaultMessage="{count, plural, one {# service} other {# services}}"
                values={{ count: totalServiceCount }}
              />
            </EuiText>
          </EuiFlexItem>
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
                onStackArnChange={(arn) => onStackArnChange('unified', arn)}
                onUpdateStack={() => onUpdateStack('unified')}
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
                onStackArnChange={(arn) => onStackArnChange('otel', arn)}
                onUpdateStack={() => onUpdateStack('otel')}
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
                onStackArnChange={(arn) => onStackArnChange('crowdstrike', arn)}
                onUpdateStack={() => onUpdateStack('crowdstrike')}
              />
            </>
          )}
        </div>
      )}
    </EuiPanel>
  );
};
