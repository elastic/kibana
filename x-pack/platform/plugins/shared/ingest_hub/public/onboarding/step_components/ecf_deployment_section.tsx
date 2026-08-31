/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import {
  EuiBadge,
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

import { AWS_SERVICES_MAP } from '../aws_service_matrix';
import {
  getEcfServiceConfigs,
  buildEcfUnifiedCloudFormationUrl,
  buildEcfOtelCloudFormationUrl,
  buildEcfCrowdstrikeCloudFormationUrl,
} from '../ecf_cloudformation';
import type { EcfServiceConfig } from '../ecf_cloudformation';
import type { ServiceInstance, ServiceVars } from './service_settings_step/use_service_settings';

interface UseEcfDeploymentOpts {
  instances: ServiceInstance[];
  serviceVars: Record<string, ServiceVars>;
  globalRegion: string;
  otlpEndpoint: string | undefined;
}

interface UseEcfDeploymentResult {
  /** True when at least one ECF panel is relevant to the selected services. */
  hasAnyEcf: boolean;
  /** Service IDs handled by ECF — used by the parent to exclude them from agentless chips. */
  ecfServiceIds: Set<string>;
  /** Props to spread onto <EcfDeploymentSection />. */
  sectionProps: EcfDeploymentSectionProps;
}

/** Encapsulates all ECF-related state and URL derivation for the Deploy & Detect step. */
export const useEcfDeployment = ({
  instances,
  serviceVars,
  globalRegion,
  otlpEndpoint,
}: UseEcfDeploymentOpts): UseEcfDeploymentResult => {
  const allEcfConfigs = useMemo(
    () => getEcfServiceConfigs(instances, serviceVars),
    [instances, serviceVars]
  );

  // Unique service IDs across instances — used for template-family detection.
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
    sectionProps: {
      ecfUnifiedConfigs,
      ecfOtelConfigs,
      ecfCrowdstrikeServices,
      unifiedLaunchUrl,
      otelLaunchUrl,
      crowdstrikeLaunchUrl,
    },
  };
};

// ── Component ─────────────────────────────────────────────────────────────────

interface EcfDeploymentSectionProps {
  ecfUnifiedConfigs: EcfServiceConfig[];
  ecfOtelConfigs: EcfServiceConfig[];
  ecfCrowdstrikeServices: string[];
  unifiedLaunchUrl: string | undefined;
  otelLaunchUrl: string | undefined;
  crowdstrikeLaunchUrl: string | undefined;
}

/** Renders the Elastic Cloud Forwarder panels (one per template family) in the Deploy step. */
export const EcfDeploymentSection = ({
  ecfUnifiedConfigs,
  ecfOtelConfigs,
  ecfCrowdstrikeServices,
  unifiedLaunchUrl,
  otelLaunchUrl,
  crowdstrikeLaunchUrl,
}: EcfDeploymentSectionProps) => {
  const hasEcfUnified = ecfUnifiedConfigs.length > 0;
  const hasEcfOtel = ecfOtelConfigs.length > 0;
  const hasEcfCrowdstrike = ecfCrowdstrikeServices.length > 0;

  return (
    <>
      <EuiTitle size="s">
        <h2>
          <FormattedMessage
            id="xpack.ingestHub.deployAndDetectStep.ecf.title"
            defaultMessage="Elastic Cloud Forwarder"
          />
        </h2>
      </EuiTitle>
      <EuiSpacer size="m" />

      {/* Unified ECS template card */}
      {hasEcfUnified && (
        <EuiPanel hasBorder paddingSize="m" data-test-subj="deployAndDetectStep-ecfUnifiedPanel">
          <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" gutterSize="m">
            <EuiFlexItem>
              <EuiTitle size="xs">
                <h3>
                  <FormattedMessage
                    id="xpack.ingestHub.deployAndDetectStep.ecf.unifiedStack.title"
                    defaultMessage="Multi-service stack"
                  />
                </h3>
              </EuiTitle>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiText size="s" color="subdued">
                <FormattedMessage
                  id="xpack.ingestHub.deployAndDetectStep.ecf.unifiedStack.serviceCount"
                  defaultMessage="{count, plural, one {# service} other {# services}}"
                  values={{ count: ecfUnifiedConfigs.length }}
                />
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiSpacer size="s" />
          <EuiText size="s" color="subdued">
            <p>
              <FormattedMessage
                id="xpack.ingestHub.deployAndDetectStep.ecf.unifiedStack.description"
                defaultMessage="Log collection via a single AWS CloudFormation stack — no agents required. Trigger source (S3 or CloudWatch) is configured per service in Service settings."
              />
            </p>
          </EuiText>
          <EuiSpacer size="m" />
          <EuiButton
            href={unifiedLaunchUrl}
            target="_blank"
            iconType="external"
            iconSide="right"
            fill
            data-test-subj="deployAndDetectStep-ecfUnifiedLaunchButton"
          >
            <FormattedMessage
              id="xpack.ingestHub.deployAndDetectStep.ecf.unifiedStack.launchButton"
              defaultMessage="Launch CloudFormation"
            />
          </EuiButton>
          <EuiHorizontalRule margin="m" />
          <EuiFlexGroup wrap gutterSize="s">
            {ecfUnifiedConfigs.map(({ serviceId }) => (
              <EuiFlexItem grow={false} key={serviceId}>
                <EuiBadge color="hollow">
                  {AWS_SERVICES_MAP.get(serviceId)?.name ?? serviceId}
                </EuiBadge>
              </EuiFlexItem>
            ))}
          </EuiFlexGroup>
        </EuiPanel>
      )}

      {/* OTel template card */}
      {hasEcfOtel && (
        <>
          {hasEcfUnified && <EuiSpacer size="s" />}
          <EuiPanel hasBorder paddingSize="m" data-test-subj="deployAndDetectStep-ecfOtelPanel">
            <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" gutterSize="m">
              <EuiFlexItem>
                <EuiTitle size="xs">
                  <h3>
                    <FormattedMessage
                      id="xpack.ingestHub.deployAndDetectStep.ecf.otelStack.title"
                      defaultMessage="OpenTelemetry stack"
                    />
                  </h3>
                </EuiTitle>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiText size="s" color="subdued">
                  <FormattedMessage
                    id="xpack.ingestHub.deployAndDetectStep.ecf.otelStack.serviceCount"
                    defaultMessage="{count, plural, one {# service} other {# services}}"
                    values={{ count: ecfOtelConfigs.length }}
                  />
                </EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
            <EuiSpacer size="s" />
            <EuiText size="s" color="subdued">
              <p>
                <FormattedMessage
                  id="xpack.ingestHub.deployAndDetectStep.ecf.otelStack.description"
                  defaultMessage="Log collection in OpenTelemetry format via a single AWS CloudFormation stack — no agents required. Trigger source (S3 or CloudWatch) is configured per service in Service settings."
                />
              </p>
            </EuiText>
            <EuiSpacer size="m" />
            <EuiButton
              href={otelLaunchUrl}
              target="_blank"
              iconType="external"
              iconSide="right"
              fill
              data-test-subj="deployAndDetectStep-ecfOtelLaunchButton"
            >
              <FormattedMessage
                id="xpack.ingestHub.deployAndDetectStep.ecf.otelStack.launchButton"
                defaultMessage="Launch CloudFormation"
              />
            </EuiButton>
            <EuiHorizontalRule margin="m" />
            <EuiFlexGroup wrap gutterSize="s">
              {ecfOtelConfigs.map(({ serviceId }) => (
                <EuiFlexItem grow={false} key={serviceId}>
                  <EuiBadge color="hollow">
                    {AWS_SERVICES_MAP.get(serviceId)?.name ?? serviceId}
                  </EuiBadge>
                </EuiFlexItem>
              ))}
            </EuiFlexGroup>
          </EuiPanel>
        </>
      )}

      {/* CrowdStrike FDR dedicated template card */}
      {hasEcfCrowdstrike && (
        <>
          {(hasEcfUnified || hasEcfOtel) && <EuiSpacer size="s" />}
          <EuiPanel
            hasBorder
            paddingSize="m"
            data-test-subj="deployAndDetectStep-ecfCrowdstrikePanel"
          >
            <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" gutterSize="m">
              <EuiFlexItem>
                <EuiTitle size="xs">
                  <h3>
                    <FormattedMessage
                      id="xpack.ingestHub.deployAndDetectStep.ecf.crowdstrikeStack.title"
                      defaultMessage="CrowdStrike FDR stack"
                    />
                  </h3>
                </EuiTitle>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiText size="s" color="subdued">
                  <FormattedMessage
                    id="xpack.ingestHub.deployAndDetectStep.ecf.crowdstrikeStack.serviceCount"
                    defaultMessage="{count, plural, one {# service} other {# services}}"
                    values={{ count: ecfCrowdstrikeServices.length }}
                  />
                </EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
            <EuiSpacer size="s" />
            <EuiText size="s" color="subdued">
              <p>
                <FormattedMessage
                  id="xpack.ingestHub.deployAndDetectStep.ecf.crowdstrikeStack.description"
                  defaultMessage="Log collection via a dedicated AWS CloudFormation stack for CrowdStrike Falcon Data Replicator — no agents required."
                />
              </p>
            </EuiText>
            <EuiSpacer size="m" />
            <EuiButton
              href={crowdstrikeLaunchUrl}
              target="_blank"
              iconType="external"
              iconSide="right"
              fill
              data-test-subj="deployAndDetectStep-ecfCrowdstrikeLaunchButton"
            >
              <FormattedMessage
                id="xpack.ingestHub.deployAndDetectStep.ecf.crowdstrikeStack.launchButton"
                defaultMessage="Launch CloudFormation"
              />
            </EuiButton>
            <EuiHorizontalRule margin="m" />
            <EuiFlexGroup wrap gutterSize="s">
              {ecfCrowdstrikeServices.map((serviceId) => (
                <EuiFlexItem grow={false} key={serviceId}>
                  <EuiBadge color="hollow">
                    {AWS_SERVICES_MAP.get(serviceId)?.name ?? serviceId}
                  </EuiBadge>
                </EuiFlexItem>
              ))}
            </EuiFlexGroup>
          </EuiPanel>
        </>
      )}
    </>
  );
};
