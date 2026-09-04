/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { css } from '@emotion/react';
import {
  EuiBadge,
  EuiButton,
  EuiButtonEmpty,
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
  ECF_UNIFIED_STACK_NAME,
  ECF_OTEL_STACK_NAME,
  ECF_CROWDSTRIKE_STACK_NAME,
} from '../ecf_cloudformation';
import type { EcfServiceConfig } from '../ecf_cloudformation';
import { getOnboardingSessionKey } from '../onboarding_session_storage';
import type { ServiceInstance, ServiceVars } from './service_settings_step/use_service_settings';
import { useEcfTemplateVersion } from '../use_ecf_template_version';
import { ECF_STACK_NAME_MAX_LENGTH } from '../../../common/ecf_template_version';

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
  /** Service IDs handled by ECF — used by the parent to exclude them from agentless chips. */
  ecfServiceIds: Set<string>;
  /** True when all relevant ECF template families have had their Launch button clicked. */
  isDone: boolean;
  /** Props to spread onto <EcfDeploymentSection />. */
  sectionProps: EcfDeploymentSectionProps;
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

  const launchedFamilies: EcfTemplateFamily[] = persistedLaunchStep?.launchedFamilies ?? [];
  const stackNames = persistedLaunchStep?.stackNames ?? {};
  const stackVersions = persistedLaunchStep?.stackVersions ?? {};

  const { version: templateVersion } = useEcfTemplateVersion();

  const onLaunch = (family: EcfTemplateFamily) => {
    setPersistedLaunchStep({
      ...persistedLaunchStep,
      launchedFamilies: [...new Set([...launchedFamilies, family])],
      stackVersions: { ...stackVersions, [family]: templateVersion },
    });
  };

  const onStackNameChange = (family: EcfTemplateFamily, name: string) => {
    setPersistedLaunchStep({
      ...persistedLaunchStep,
      stackNames: { ...stackNames, [family]: name },
    });
  };

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

  const isDone =
    (!hasEcfUnified || launchedFamilies.includes('unified')) &&
    (!hasEcfOtel || launchedFamilies.includes('otel')) &&
    (!hasEcfCrowdstrike || launchedFamilies.includes('crowdstrike'));

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

  return {
    hasAnyEcf,
    ecfServiceIds,
    isDone,
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
      onLaunch,
      onStackNameChange,
    },
  };
};

// ── EcfFamilyPanel ─────────────────────────────────────────────────────────────

// Delay (ms) after clicking Launch before showing the "Reopen console" link — gives users a
// quick way to re-open the AWS Console tab if they accidentally closed it.
const REOPEN_LINK_DELAY_MS = 5_000;

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
}

interface EcfFamilyPanelPostLaunchProps {
  launchUrl: string | undefined;
  stackName: string;
  stackVersion: string | undefined;
  defaultStackName: string;
  onStackNameChange: (name: string) => void;
  testSubjPrefix: string;
}

/** Post-launch content for one ECF template family: confirmation, stack name field, version, reopen. */
const EcfFamilyPanelPostLaunch = ({
  launchUrl,
  stackName,
  stackVersion,
  defaultStackName,
  onStackNameChange,
  testSubjPrefix,
}: EcfFamilyPanelPostLaunchProps) => {
  const [showReopen, setShowReopen] = useState(false);
  const [touched, setTouched] = useState(false);

  const stackNameError = useMemo(() => {
    if (!touched || stackName === '' || STACK_NAME_REGEX.test(stackName)) return null;
    return i18n.translate('xpack.ingestHub.authenticateAndDeployStep.ecfSection.stackNameError', {
      defaultMessage:
        'Stack name must start with a letter and contain only letters, digits, and hyphens (max 128 characters).',
    });
  }, [stackName, touched]);

  // Only feed a valid name into the URL builder — invalid names show an inline error but do
  // not prevent navigation (the field is optional throughout).
  const isStackNameValid = stackName === '' || STACK_NAME_REGEX.test(stackName);

  useEffect(() => {
    const timer = window.setTimeout(() => setShowReopen(true), REOPEN_LINK_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <>
      <EuiText size="s">
        <p>
          <FormattedMessage
            id="xpack.ingestHub.authenticateAndDeployStep.ecfSection.launchedConfirmation"
            defaultMessage="The Elastic Cloud Forwarder has been created in your AWS account. Data detection is running in the background — check Detect &amp; Review for arrival status."
          />
        </p>
      </EuiText>
      <EuiSpacer size="m" />

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
                      'The CloudFormation stack name pre-filled when you launched. If you renamed the stack in the AWS Console, update this field so the Reopen link targets the right stack.',
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

      {/* Reopen link (shown after 5s) */}
      {showReopen && (
        <>
          <EuiSpacer size="s" />
          <EuiButtonEmpty
            href={isStackNameValid ? launchUrl : undefined}
            target="_blank"
            iconType="external"
            iconSide="right"
            size="s"
            data-test-subj={`${testSubjPrefix}-reopen`}
          >
            <FormattedMessage
              id="xpack.ingestHub.authenticateAndDeployStep.ecfSection.reopenButton"
              defaultMessage="Reopen AWS Console"
            />
          </EuiButtonEmpty>
        </>
      )}
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
}: EcfFamilyPanelProps) => {
  return (
    <EuiPanel paddingSize="m" hasBorder={false} hasShadow={false}>
      <EuiText size="s" color="subdued">
        <p>{description}</p>
      </EuiText>
      <EuiSpacer size="m" />

      {!isLaunched ? (
        /* ── Pre-launch ─────────────────────────────────────────────────────── */
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
      ) : (
        /* ── Post-launch ────────────────────────────────────────────────────── */
        <EcfFamilyPanelPostLaunch
          launchUrl={launchUrl}
          stackName={stackName}
          stackVersion={stackVersion}
          defaultStackName={defaultStackName}
          onStackNameChange={onStackNameChange}
          testSubjPrefix={launchButtonTestSubj}
        />
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
  onLaunch: (family: EcfTemplateFamily) => void;
  onStackNameChange: (family: EcfTemplateFamily, name: string) => void;
}

/** Collapsible accordion for all Elastic Cloud Forwarder template families in Step 3. */
export const EcfDeploymentSection = ({
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
  onLaunch,
  onStackNameChange,
}: EcfDeploymentSectionProps) => {
  const { euiTheme } = useEuiTheme();
  const contentId = useGeneratedHtmlId({ prefix: 'ecfContent' });

  const hasEcfUnified = ecfUnifiedConfigs.length > 0;
  const hasEcfOtel = ecfOtelConfigs.length > 0;
  const hasEcfCrowdstrike = ecfCrowdstrikeServices.length > 0;

  const isDone =
    (!hasEcfUnified || launchedFamilies.includes('unified')) &&
    (!hasEcfOtel || launchedFamilies.includes('otel')) &&
    (!hasEcfCrowdstrike || launchedFamilies.includes('crowdstrike'));

  const totalServiceCount =
    ecfUnifiedConfigs.length + ecfOtelConfigs.length + ecfCrowdstrikeServices.length;

  // Always start open. Post-launch the Done badge + stack name field are shown while expanded.
  // The user can manually collapse. No auto-collapse on isDone: the stack name field must remain
  // visible after launch (per design review and mockup 2).
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
          {hasEcfUnified && (
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
            />
          )}

          {hasEcfOtel && (
            <>
              {hasEcfUnified && <EuiHorizontalRule margin="none" />}
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
              />
            </>
          )}

          {hasEcfCrowdstrike && (
            <>
              {(hasEcfUnified || hasEcfOtel) && <EuiHorizontalRule margin="none" />}
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
              />
            </>
          )}
        </div>
      )}
    </EuiPanel>
  );
};
