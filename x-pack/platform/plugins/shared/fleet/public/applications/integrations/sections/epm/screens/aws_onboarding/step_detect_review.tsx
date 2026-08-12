/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  EuiAccordion,
  EuiBadge,
  EuiButtonEmpty,
  EuiFieldSearch,
  EuiFlexGrid,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiIcon,
  EuiLoadingSpinner,
  EuiNotificationBadge,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';

import { CardHeader } from './card_header';
import { MANAGED_INTEGRATION_EXAMPLES, type AwsServiceEntry } from './aws_services_data';
import {
  CONTENT_BY_SERVICE,
  DETECTION_RULES_BY_SERVICE,
  GENERAL_CONTENT,
  getTechnicalAssets,
  type AwsContentItem,
  type AwsContentType,
} from './aws_content_data';

const REGION_LABELS: Record<string, string> = {
  'us-east': 'US-East',
  'us-west': 'US-West',
  'eu-west-1': 'EU-West-1',
  'ap-southeast-1': 'AP-Southeast-1',
};

const CONTENT_TYPE_ICONS: Record<AwsContentType, string> = {
  dashboard: 'dashboardApp',
  search: 'discoverApp',
  alert_rule: 'bell',
  content_package: 'package',
  detection_rule: 'securityApp',
  index_template: 'indexSettings',
  component_template: 'indexMapping',
  ingest_pipeline: 'pipelineApp',
  transform: 'merge',
};

const SummaryItem: React.FunctionComponent<{ label: string; value: React.ReactNode }> = ({
  label,
  value,
}) => (
  <div>
    <EuiText size="xs" color="subdued">
      {label}
    </EuiText>
    <EuiText size="s">
      <strong>{value}</strong>
    </EuiText>
  </div>
);

const DeploymentSummaryCard: React.FunctionComponent<{
  deploymentMethod: 'agent' | 'managed';
  services: AwsServiceEntry[];
  triggerSources: Record<string, string>;
  region: string;
  identityName: string;
  stackName: string;
  receivedCount: number;
  agentPolicyName: string;
  managedReceivedCount: number;
  agentReceivedCount: number;
}> = ({
  deploymentMethod,
  services,
  triggerSources,
  region,
  identityName,
  stackName,
  receivedCount,
  agentPolicyName,
  managedReceivedCount,
  agentReceivedCount,
}) => {
  // All deploy/arrival animations run on the Authenticate & Deploy step; the
  // summary simply reads the lifted state, so it arrives already settled.
  const allServices =
    deploymentMethod === 'agent'
      ? services.map((service, i) => ({
          key: service.id,
          name: service.name,
          receiving: i < agentReceivedCount,
          badge: 'Elastic Agent',
        }))
      : [
          ...services.map((service, i) => ({
            key: service.id,
            name: service.name,
            receiving: i < receivedCount,
            badge: `Trigger: ${triggerSources[service.id] ?? 'S3'}`,
          })),
          ...MANAGED_INTEGRATION_EXAMPLES.map((name, i) => ({
            key: name,
            name,
            receiving: i < managedReceivedCount,
            badge: 'Managed Integration',
          })),
        ];
  const receivingCount = allServices.filter((s) => s.receiving).length;

  return (
    <EuiPanel hasBorder paddingSize="l" style={{ overflow: 'hidden' }}>
      <CardHeader
        iconType="checkCircle"
        title="Deployment summary"
        servicesCount={allServices.length}
      />
      <EuiSpacer size="m" />
      <EuiFlexGrid columns={4} gutterSize="l">
        {deploymentMethod === 'agent' ? (
          <>
            <EuiFlexItem>
              <SummaryItem label="Deployment method" value="Agent-based" />
            </EuiFlexItem>
            <EuiFlexItem>
              <SummaryItem label="Agent policy" value={agentPolicyName || '—'} />
            </EuiFlexItem>
            <EuiFlexItem>
              <SummaryItem label="Enrollment token" value="Default" />
            </EuiFlexItem>
            <EuiFlexItem>
              <SummaryItem label="Agents" value="1 agent enrolled" />
            </EuiFlexItem>
          </>
        ) : (
          <>
            <EuiFlexItem>
              <SummaryItem label="Deployment method" value="Elastic Managed Integration" />
            </EuiFlexItem>
            <EuiFlexItem>
              <SummaryItem label="Region" value={REGION_LABELS[region] ?? region} />
            </EuiFlexItem>
            <EuiFlexItem>
              <SummaryItem label="Federated Identity Name" value={identityName || '—'} />
            </EuiFlexItem>
            <EuiFlexItem>
              <SummaryItem label="CloudFormation stack" value={stackName || '—'} />
            </EuiFlexItem>
          </>
        )}
      </EuiFlexGrid>
      <EuiHorizontalRule margin="m" />
      <EuiText size="s" color="subdued">
        {`${receivingCount} of ${allServices.length} service${
          allServices.length === 1 ? '' : 's'
        } receiving data`}
      </EuiText>
      <EuiSpacer size="s" />
      <EuiFlexGrid columns={4} gutterSize="m">
        {allServices.map((service) => (
          <EuiFlexItem key={service.key} style={{ minWidth: 0 }}>
            <EuiPanel hasBorder paddingSize="m">
              <EuiFlexGroup alignItems="flexStart" gutterSize="m" responsive={false}>
                <EuiFlexItem grow={false}>
                  {service.receiving ? (
                    <EuiIcon type="checkCircle" color="success" size="l" />
                  ) : (
                    <EuiLoadingSpinner size="l" />
                  )}
                </EuiFlexItem>
                <EuiFlexItem style={{ minWidth: 0 }}>
                  <EuiText size="s" className="eui-textTruncate">
                    <strong>{service.name}</strong>
                  </EuiText>
                  <EuiText size="xs" color="subdued">
                    {service.receiving ? 'Receiving data' : 'Detecting data...'}
                  </EuiText>
                  <EuiSpacer size="xs" />
                  <div>
                    <EuiBadge color="hollow">{service.badge}</EuiBadge>
                  </div>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiPanel>
          </EuiFlexItem>
        ))}
      </EuiFlexGrid>
    </EuiPanel>
  );
};

// Everything ships installed with the package today (all-or-nothing), so
// this card is an OPT-OUT review, not an installer: every item starts as
// "Installed" and an explicit per-row Remove action uninstalls it (Install
// brings it back for day-2). Explicit verb buttons instead of checkboxes:
// removal is semi-destructive, and a checkbox reads as batch selection
// rather than an immediate state change. Required technical assets
// (templates, pipelines, transforms) are listed too, but are not removable.
type AssetState = 'installed' | 'removing' | 'removed' | 'installing';

const TYPE_ORDER: AwsContentType[] = [
  'dashboard',
  'search',
  'alert_rule',
  'detection_rule',
  'content_package',
  'index_template',
  'component_template',
  'ingest_pipeline',
  'transform',
];

const REQUIRED_TYPES = new Set<AwsContentType>([
  'index_template',
  'component_template',
  'ingest_pipeline',
  'transform',
]);

const TYPE_GROUP_LABELS: Record<AwsContentType, string> = {
  dashboard: 'Dashboards',
  search: 'Saved searches',
  alert_rule: 'Alert rule templates',
  detection_rule: 'Detection rules',
  content_package: 'Content packages',
  index_template: 'Index templates',
  component_template: 'Component templates',
  ingest_pipeline: 'Ingest pipelines',
  transform: 'Transforms',
};

interface ReviewItem extends AwsContentItem {
  serviceName: string;
}

const ContentItemRow: React.FunctionComponent<{
  item: ReviewItem;
  state: AssetState;
  isRequired: boolean;
  onToggle: () => void;
}> = ({ item, state, isRequired, onToggle }) => {
  const isTransitioning = state === 'removing' || state === 'installing';
  return (
    <EuiPanel hasBorder paddingSize="s">
      <EuiFlexGroup alignItems="center" gutterSize="m" responsive={false}>
        <EuiFlexItem style={{ minWidth: 0 }}>
          <EuiText size="s" className="eui-textTruncate">
            <strong>{item.title}</strong>
          </EuiText>
          <EuiText size="xs" color="subdued">
            {item.serviceName}
            {item.description ? ` — ${item.description}` : ''}
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          {isRequired ? (
            <EuiBadge color="hollow" iconType="lock">
              Required
            </EuiBadge>
          ) : state === 'installed' || state === 'removing' ? (
            <EuiBadge color="success" iconType="check">
              Installed
            </EuiBadge>
          ) : (
            <EuiBadge color="hollow">Available to install</EuiBadge>
          )}
        </EuiFlexItem>
        {!isRequired && (
          <EuiFlexItem grow={false} style={{ minWidth: 90 }}>
            <EuiButtonEmpty
              size="xs"
              color={state === 'installed' ? 'danger' : 'primary'}
              isLoading={isTransitioning}
              onClick={onToggle}
              aria-label={`${state === 'installed' ? 'Remove' : 'Install'} ${item.title}`}
              data-test-subj={`awsOnboardingToggleContent-${item.id}`}
            >
              {state === 'removing'
                ? 'Removing…'
                : state === 'installing'
                ? 'Installing…'
                : state === 'installed'
                ? 'Remove'
                : 'Install'}
            </EuiButtonEmpty>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    </EuiPanel>
  );
};

const InstallContentCard: React.FunctionComponent<{ services: AwsServiceEntry[] }> = ({
  services,
}) => {
  const [assetState, setAssetState] = useState<Record<string, AssetState>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const timers = useRef<number[]>([]);

  useEffect(() => {
    return () => timers.current.forEach((t) => window.clearTimeout(t));
  }, []);

  // Flatten all content for the selected services, tagged with the service
  // it belongs to. Detection rules come from the separate
  // security_detection_engine package; technical assets (templates,
  // pipelines, transforms) are required and listed as non-removable.
  const allItems: ReviewItem[] = [
    ...GENERAL_CONTENT.map((item) => ({ ...item, serviceName: 'Amazon Web Services' })),
    ...services.flatMap((service) =>
      (CONTENT_BY_SERVICE[service.id] ?? []).map((item) => ({
        ...item,
        serviceName: service.name,
      }))
    ),
    ...services.flatMap((service) =>
      (DETECTION_RULES_BY_SERVICE[service.id] ?? []).map((item) => ({
        ...item,
        serviceName: service.name,
      }))
    ),
    ...getTechnicalAssets(services),
  ];

  const stateOf = (id: string): AssetState => assetState[id] ?? 'installed';
  const installedCount = allItems.filter((i) => stateOf(i.id) === 'installed').length;

  const onToggle = (id: string) => {
    const current = stateOf(id);
    if (current === 'installed') {
      setAssetState((prev) => ({ ...prev, [id]: 'removing' }));
      timers.current.push(
        window.setTimeout(
          () => setAssetState((prev) => ({ ...prev, [id]: 'removed' })),
          800
        )
      );
    } else if (current === 'removed') {
      setAssetState((prev) => ({ ...prev, [id]: 'installing' }));
      timers.current.push(
        window.setTimeout(
          () => setAssetState((prev) => ({ ...prev, [id]: 'installed' })),
          800
        )
      );
    }
  };

  const query = searchQuery.trim().toLowerCase();
  const matches = (item: ReviewItem) =>
    !query ||
    item.title.toLowerCase().includes(query) ||
    item.serviceName.toLowerCase().includes(query);

  const typeGroups = TYPE_ORDER.map((type) => ({
    type,
    items: allItems.filter((i) => i.type === type && matches(i)),
  })).filter((g) => g.items.length > 0);

  return (
    <EuiPanel hasBorder paddingSize="l" style={{ overflow: 'hidden' }}>
      <CardHeader
        iconType="dashboardApp"
        title="Installed content"
        servicesCount={services.length}
      />
      <EuiSpacer size="m" />
      <EuiFlexGroup alignItems="center" responsive={false}>
        <EuiFlexItem>
          <EuiText size="s">
            <p>
              Everything below was installed with the AWS integration. Remove anything you
              don&apos;t need — you can reinstall it at any time, here or from the
              integration&apos;s Assets tab. Assets marked{' '}
              <EuiBadge color="hollow" iconType="lock">
                Required
              </EuiBadge>{' '}
              are needed for data ingestion and cannot be removed.
            </p>
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText size="s" color="subdued">
            {`${installedCount} of ${allItems.length} installed`}
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="m" />
      <EuiFieldSearch
        fullWidth
        compressed
        placeholder="Search content by name or service"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        isClearable
        data-test-subj="awsOnboardingContentSearch"
      />

      {typeGroups.map(({ type, items }) => {
        const isRequired = REQUIRED_TYPES.has(type);
        const groupInstalled = items.filter((i) => stateOf(i.id) === 'installed').length;
        return (
          <React.Fragment key={type}>
            <EuiSpacer size="m" />
            <EuiAccordion
              id={`awsOnboardingContentGroup-${type}`}
              forceState={query ? 'open' : undefined}
              buttonContent={
                <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
                  <EuiFlexItem grow={false}>
                    <EuiIcon type={CONTENT_TYPE_ICONS[type]} size="m" />
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiTitle size="xxs">
                      <h4>{TYPE_GROUP_LABELS[type]}</h4>
                    </EuiTitle>
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiNotificationBadge color="subdued">{items.length}</EuiNotificationBadge>
                  </EuiFlexItem>
                </EuiFlexGroup>
              }
              extraAction={
                <EuiText size="xs" color="subdued">
                  {isRequired
                    ? 'Required — installed with the package'
                    : `${groupInstalled} of ${items.length} installed`}
                </EuiText>
              }
            >
              <EuiSpacer size="s" />
              {items.map((item, i) => (
                <React.Fragment key={item.id}>
                  {i > 0 && <EuiSpacer size="s" />}
                  <ContentItemRow
                    item={item}
                    state={stateOf(item.id)}
                    isRequired={isRequired}
                    onToggle={() => onToggle(item.id)}
                  />
                </React.Fragment>
              ))}
            </EuiAccordion>
          </React.Fragment>
        );
      })}
    </EuiPanel>
  );
};

export const StepDetectReview: React.FunctionComponent<{
  deploymentMethod: 'agent' | 'managed';
  services: AwsServiceEntry[];
  triggerSources: Record<string, string>;
  region: string;
  identityName: string;
  stackName: string;
  receivedCount: number;
  agentPolicyName: string;
  managedReceivedCount: number;
  agentReceivedCount: number;
}> = ({
  deploymentMethod,
  services,
  triggerSources,
  region,
  identityName,
  stackName,
  receivedCount,
  agentPolicyName,
  managedReceivedCount,
  agentReceivedCount,
}) => {
  return (
    <>
      <EuiTitle size="m">
        <h2>Detect &amp; Review</h2>
      </EuiTitle>
      <EuiSpacer size="s" />
      <EuiText size="s" color="subdued">
        <p>
          Review your deployment and the prebuilt content installed for your services — keep
          what you need, remove the rest.
        </p>
      </EuiText>
      <EuiSpacer size="m" />

      <DeploymentSummaryCard
        deploymentMethod={deploymentMethod}
        services={services}
        triggerSources={triggerSources}
        region={region}
        identityName={identityName}
        stackName={stackName}
        receivedCount={receivedCount}
        agentPolicyName={agentPolicyName}
        managedReceivedCount={managedReceivedCount}
        agentReceivedCount={agentReceivedCount}
      />
      <EuiSpacer size="m" />
      <InstallContentCard services={services} />
    </>
  );
};
