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
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiIcon,
  EuiLoadingSpinner,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import useSessionStorage from 'react-use/lib/useSessionStorage';

import { AWS_SERVICES_MAP } from '../aws_service_matrix';
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

interface EcfFamilyPanelProps {
  title: React.ReactNode;
  description: React.ReactNode;
  serviceIds: string[];
  launchUrl: string | undefined;
  isLaunched: boolean;
  onLaunch: () => void;
  launchButtonTestSubj: string;
}

/** Renders the content for one ECF template family (description, launch/deploying UI). */
const EcfFamilyPanel = ({
  title,
  description,
  serviceIds,
  launchUrl,
  isLaunched,
  onLaunch,
  launchButtonTestSubj,
}: EcfFamilyPanelProps) => (
  <EuiPanel paddingSize="m" hasBorder={false} hasShadow={false}>
    <EuiTitle size="xs">
      <h3>{title}</h3>
    </EuiTitle>
    <EuiSpacer size="s" />
    <EuiText size="s" color="subdued">
      <p>{description}</p>
    </EuiText>
    <EuiSpacer size="m" />

    {isLaunched ? (
      <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiLoadingSpinner size="m" aria-hidden />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText size="s">
            <FormattedMessage
              id="xpack.ingestHub.authenticateAndDeployStep.ecfSection.deployingText"
              defaultMessage="CloudFormation stack deploying…"
            />
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    ) : (
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
    )}

    <EuiHorizontalRule margin="m" />
    <EuiFlexGroup wrap gutterSize="s">
      {serviceIds.map((serviceId) => (
        <EuiFlexItem grow={false} key={serviceId}>
          <EuiBadge color="hollow">{AWS_SERVICES_MAP.get(serviceId)?.name ?? serviceId}</EuiBadge>
        </EuiFlexItem>
      ))}
    </EuiFlexGroup>
  </EuiPanel>
);

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
              title={
                <FormattedMessage
                  id="xpack.ingestHub.authenticateAndDeployStep.ecfSection.unified.title"
                  defaultMessage="Multi-service stack"
                />
              }
              description={
                <FormattedMessage
                  id="xpack.ingestHub.authenticateAndDeployStep.ecfSection.unified.description"
                  defaultMessage="Log collection via a single AWS CloudFormation stack — no agents required. Deploys the ECS-compatible template, per the data format chosen in Step 1. Trigger source (S3 or CloudWatch) is configured per service in Service settings. Launch CloudFormation to deploy."
                />
              }
              serviceIds={ecfUnifiedConfigs.map((c) => c.serviceId)}
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
                title={
                  <FormattedMessage
                    id="xpack.ingestHub.authenticateAndDeployStep.ecfSection.otel.title"
                    defaultMessage="OpenTelemetry stack"
                  />
                }
                description={
                  <FormattedMessage
                    id="xpack.ingestHub.authenticateAndDeployStep.ecfSection.otel.description"
                    defaultMessage="Log collection in OpenTelemetry format via a single AWS CloudFormation stack — no agents required. Trigger source (S3 or CloudWatch) is configured per service in Service settings."
                  />
                }
                serviceIds={ecfOtelConfigs.map((c) => c.serviceId)}
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
                title={
                  <FormattedMessage
                    id="xpack.ingestHub.authenticateAndDeployStep.ecfSection.crowdstrike.title"
                    defaultMessage="CrowdStrike FDR stack"
                  />
                }
                description={
                  <FormattedMessage
                    id="xpack.ingestHub.authenticateAndDeployStep.ecfSection.crowdstrike.description"
                    defaultMessage="Log collection via a dedicated AWS CloudFormation stack for CrowdStrike Falcon Data Replicator — no agents required."
                  />
                }
                serviceIds={ecfCrowdstrikeServices}
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
