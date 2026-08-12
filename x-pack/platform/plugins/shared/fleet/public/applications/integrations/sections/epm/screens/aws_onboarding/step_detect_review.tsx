/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  EuiBadge,
  EuiButton,
  EuiFlexGrid,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiIcon,
  EuiLoadingSpinner,
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
  type AwsContentItem,
} from './aws_content_data';

const REGION_LABELS: Record<string, string> = {
  'us-east': 'US-East',
  'us-west': 'US-West',
  'eu-west-1': 'EU-West-1',
  'ap-southeast-1': 'AP-Southeast-1',
};

const CONTENT_TYPE_ICONS: Record<AwsContentItem['type'], string> = {
  dashboard: 'dashboardApp',
  search: 'discoverApp',
  alert_rule: 'bell',
  content_package: 'package',
  detection_rule: 'securityApp',
};

const CONTENT_TYPE_LABELS: Record<AwsContentItem['type'], string> = {
  dashboard: 'Dashboard',
  search: 'Saved search',
  alert_rule: 'Alert rule template',
  content_package: 'Content package',
  detection_rule: 'Detection rule',
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
  services: AwsServiceEntry[];
  triggerSources: Record<string, string>;
  region: string;
  identityName: string;
  stackName: string;
  receivedCount: number;
}> = ({ services, triggerSources, region, identityName, stackName, receivedCount }) => {
  // The Managed Integrations data streams confirm here (fast spinner-to-check
  // animation): first after 800ms, then one every 700ms. The CloudFormation
  // services arrive already-received from the Authenticate & Deploy step.
  const [managedReceived, setManagedReceived] = useState(0);
  const managedTimers = useRef<number[]>([]);
  useEffect(() => {
    setManagedReceived(0);
    MANAGED_INTEGRATION_EXAMPLES.forEach((_, i) => {
      managedTimers.current.push(
        window.setTimeout(() => setManagedReceived((c) => c + 1), 800 + i * 700)
      );
    });
    return () => managedTimers.current.forEach((t) => window.clearTimeout(t));
  }, []);

  // The selected CloudFormation services plus the Managed Integrations
  // examples, so the summary covers everything deployed.
  const allServices = [
    ...services.map((service, i) => ({
      key: service.id,
      name: service.name,
      receiving: i < receivedCount,
      badge: `Trigger: ${triggerSources[service.id] ?? 'S3'}`,
    })),
    ...MANAGED_INTEGRATION_EXAMPLES.map((name, i) => ({
      key: name,
      name,
      receiving: i < managedReceived,
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

type InstallState = 'idle' | 'installing' | 'installed';

const ContentItemCard: React.FunctionComponent<{
  item: AwsContentItem;
  state: InstallState;
  onInstall: () => void;
}> = ({ item, state, onInstall }) => (
  <EuiPanel hasBorder paddingSize="m">
    <EuiFlexGroup alignItems="center" gutterSize="m" responsive={false}>
      <EuiFlexItem grow={false}>
        <EuiIcon type={CONTENT_TYPE_ICONS[item.type]} size="l" />
      </EuiFlexItem>
      <EuiFlexItem style={{ minWidth: 0 }}>
        <EuiText size="s" className="eui-textTruncate">
          <strong>{item.title}</strong>
        </EuiText>
        <EuiText size="xs" color="subdued">
          {CONTENT_TYPE_LABELS[item.type]}
          {item.description ? ` — ${item.description}` : ''}
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        {state === 'installed' ? (
          <EuiBadge color="success" iconType="check">
            Installed
          </EuiBadge>
        ) : (
          <EuiButton
            size="s"
            isLoading={state === 'installing'}
            onClick={onInstall}
            data-test-subj={`awsOnboardingInstallContent-${item.id}`}
          >
            {state === 'installing' ? 'Installing…' : 'Install'}
          </EuiButton>
        )}
      </EuiFlexItem>
    </EuiFlexGroup>
  </EuiPanel>
);

const InstallContentCard: React.FunctionComponent<{ services: AwsServiceEntry[] }> = ({
  services,
}) => {
  const [installState, setInstallState] = useState<Record<string, InstallState>>({});
  const timers = useRef<number[]>([]);

  useEffect(() => {
    return () => timers.current.forEach((t) => window.clearTimeout(t));
  }, []);

  // Prebuilt SIEM detection rules for the selected services (from the
  // security_detection_engine package) — presented as their own group since
  // they install from a separate package than the aws integration.
  const detectionRules = services.flatMap((s) => DETECTION_RULES_BY_SERVICE[s.id] ?? []);

  const groups = [
    { service: { id: '_general', name: 'Amazon Web Services (all services)' }, items: GENERAL_CONTENT },
    ...services.map((service) => ({ service, items: CONTENT_BY_SERVICE[service.id] ?? [] })),
    { service: { id: '_security', name: 'Security detection rules' }, items: detectionRules },
  ].filter((g) => g.items.length > 0);

  // Two-column layout: GuardDuty and the detection rules anchor the right
  // column; everything else stacks on the left. If nothing lands on the
  // right, alternate groups between the columns instead.
  const RIGHT_COLUMN_IDS = new Set(['guardduty', '_security']);
  let leftGroups = groups.filter((g) => !RIGHT_COLUMN_IDS.has(g.service.id));
  let rightGroups = groups.filter((g) => RIGHT_COLUMN_IDS.has(g.service.id));
  if (rightGroups.length === 0 && leftGroups.length > 1) {
    rightGroups = leftGroups.filter((_, i) => i % 2 === 1);
    leftGroups = leftGroups.filter((_, i) => i % 2 === 0);
  }

  const allItems = groups.flatMap((g) => g.items);
  const installedCount = allItems.filter((i) => installState[i.id] === 'installed').length;

  const onInstall = (id: string) => {
    setInstallState((prev) => ({ ...prev, [id]: 'installing' }));
    timers.current.push(
      window.setTimeout(
        () => setInstallState((prev) => ({ ...prev, [id]: 'installed' })),
        1200
      )
    );
  };

  return (
    <EuiPanel hasBorder paddingSize="l" style={{ overflow: 'hidden' }}>
      <CardHeader iconType="dashboardApp" title="Install content" servicesCount={services.length} />
      <EuiSpacer size="m" />
      <EuiFlexGroup alignItems="center" responsive={false}>
        <EuiFlexItem>
          <EuiText size="s">
            <p>
              Prebuilt content for the services you deployed. Install only what you need — you
              can add or remove content later from the integration&apos;s Assets tab.
            </p>
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText size="s" color="subdued">
            {`${installedCount} of ${allItems.length} installed`}
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="s" />
      <EuiFlexGroup gutterSize="l" alignItems="flexStart">
        {[leftGroups, rightGroups].map((column, colIndex) => (
          <EuiFlexItem key={colIndex} style={{ minWidth: 0 }}>
            {column.map(({ service, items }) => (
              <React.Fragment key={service.id}>
                <EuiSpacer size="l" />
                <EuiTitle size="xxs">
                  <h4>{service.name}</h4>
                </EuiTitle>
                <EuiSpacer size="s" />
                {items.map((item, itemIndex) => (
                  <React.Fragment key={item.id}>
                    {itemIndex > 0 && <EuiSpacer size="m" />}
                    <ContentItemCard
                      item={item}
                      state={installState[item.id] ?? 'idle'}
                      onInstall={() => onInstall(item.id)}
                    />
                  </React.Fragment>
                ))}
              </React.Fragment>
            ))}
          </EuiFlexItem>
        ))}
      </EuiFlexGroup>
    </EuiPanel>
  );
};

export const StepDetectReview: React.FunctionComponent<{
  services: AwsServiceEntry[];
  triggerSources: Record<string, string>;
  region: string;
  identityName: string;
  stackName: string;
  receivedCount: number;
}> = ({ services, triggerSources, region, identityName, stackName, receivedCount }) => {
  return (
    <>
      <EuiTitle size="m">
        <h2>Detect &amp; Review</h2>
      </EuiTitle>
      <EuiSpacer size="s" />
      <EuiText size="s" color="subdued">
        <p>
          Review your deployment, then choose the prebuilt content you want to install for your
          services.
        </p>
      </EuiText>
      <EuiSpacer size="m" />

      <DeploymentSummaryCard
        services={services}
        triggerSources={triggerSources}
        region={region}
        identityName={identityName}
        stackName={stackName}
        receivedCount={receivedCount}
      />
      <EuiSpacer size="m" />
      <InstallContentCard services={services} />
    </>
  );
};
