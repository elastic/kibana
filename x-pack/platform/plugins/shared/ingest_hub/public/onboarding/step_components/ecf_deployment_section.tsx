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
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiIcon,
  EuiPanel,
  EuiSpacer,
  EuiText,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import useSessionStorage from 'react-use/lib/useSessionStorage';

import { AWS_SERVICES_MAP } from '../aws_service_matrix';
import type { DataFormat } from '../aws_service_matrix';
import {
  getEcfServiceConfigs,
  buildEcfUnifiedCloudFormationUrl,
  buildEcfOtelCloudFormationUrl,
  buildEcfCrowdstrikeCloudFormationUrl,
} from '../ecf_cloudformation';
import type { EcfServiceConfig } from '../ecf_cloudformation';
import { getOnboardingSessionKey } from '../onboarding_session_storage';
import type { ServiceInstance, ServiceVars } from './service_settings_step/use_service_settings';

// ── Types ──────────────────────────────────────────────────────────────────────

type EcfTemplateFamily = 'unified' | 'otel' | 'crowdstrike';

interface PersistedEcfLaunchStep {
  launchedFamilies: EcfTemplateFamily[];
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
    getOnboardingSessionKey('aws', 'ecfLaunchStep'),
    { launchedFamilies: [] }
  );

  const launchedFamilies: EcfTemplateFamily[] = persistedLaunchStep?.launchedFamilies ?? [];

  const onLaunch = (family: EcfTemplateFamily) => {
    setPersistedLaunchStep({
      launchedFamilies: [...new Set([...launchedFamilies, family])],
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

  const unifiedLaunchUrl = useMemo(
    () =>
      hasEcfUnified
        ? buildEcfUnifiedCloudFormationUrl({
            ecfConfigs: ecfUnifiedConfigs,
            region: globalRegion,
            otlpEndpoint,
          })
        : undefined,
    [hasEcfUnified, ecfUnifiedConfigs, globalRegion, otlpEndpoint]
  );

  const otelLaunchUrl = useMemo(
    () =>
      hasEcfOtel
        ? buildEcfOtelCloudFormationUrl({
            ecfConfigs: ecfOtelConfigs,
            region: globalRegion,
            otlpEndpoint,
          })
        : undefined,
    [hasEcfOtel, ecfOtelConfigs, globalRegion, otlpEndpoint]
  );

  const crowdstrikeLaunchUrl = useMemo(
    () =>
      hasEcfCrowdstrike
        ? buildEcfCrowdstrikeCloudFormationUrl({ region: globalRegion, otlpEndpoint })
        : undefined,
    [hasEcfCrowdstrike, globalRegion, otlpEndpoint]
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
      onLaunch,
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
}

/** Renders the content for one ECF template family (description, launch/deploying UI). */
const EcfFamilyPanel = ({
  description,
  launchUrl,
  isLaunched,
  onLaunch,
  launchButtonTestSubj,
}: EcfFamilyPanelProps) => {
  const [showReopen, setShowReopen] = useState(false);

  useEffect(() => {
    if (!isLaunched) {
      setShowReopen(false);
      return;
    }
    const timer = window.setTimeout(() => setShowReopen(true), REOPEN_LINK_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [isLaunched]);

  return (
    <EuiPanel paddingSize="m" hasBorder={false} hasShadow={false}>
      <EuiText size="s" color="subdued">
        <p>{description}</p>
      </EuiText>
      <EuiSpacer size="m" />
      <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiButton
            href={isLaunched ? undefined : launchUrl}
            target="_blank"
            iconType={isLaunched ? undefined : 'external'}
            iconSide={isLaunched ? 'left' : 'right'}
            fill
            onClick={onLaunch}
            isLoading={isLaunched}
            data-test-subj={launchButtonTestSubj}
          >
            {isLaunched ? (
              <FormattedMessage
                id="xpack.ingestHub.authenticateAndDeployStep.ecfSection.deployingText"
                defaultMessage="CloudFormation stack deploying…"
              />
            ) : (
              <FormattedMessage
                id="xpack.ingestHub.authenticateAndDeployStep.ecfSection.launchButton"
                defaultMessage="Launch CloudFormation"
              />
            )}
          </EuiButton>
        </EuiFlexItem>
        {showReopen && (
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              href={launchUrl}
              target="_blank"
              iconType="external"
              iconSide="right"
              size="s"
              data-test-subj={`${launchButtonTestSubj}-reopen`}
            >
              <FormattedMessage
                id="xpack.ingestHub.authenticateAndDeployStep.ecfSection.reopenButton"
                defaultMessage="Reopen AWS Console"
              />
            </EuiButtonEmpty>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
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
  onLaunch: (family: EcfTemplateFamily) => void;
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
  onLaunch,
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

  const [isOpen, setIsOpen] = useState(!isDone);

  useEffect(() => {
    if (isDone) setIsOpen(false);
  }, [isDone]);

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
              />
            </>
          )}
        </div>
      )}
    </EuiPanel>
  );
};
