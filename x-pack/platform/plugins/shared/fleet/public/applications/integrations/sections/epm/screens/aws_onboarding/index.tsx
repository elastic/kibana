/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useHistory } from 'react-router-dom';
import {
  EuiBadge,
  EuiButton,
  EuiButtonEmpty,
  EuiButtonGroup,
  EuiButtonIcon,
  EuiCallOut,
  EuiCheckableCard,
  EuiEmptyPrompt,
  EuiFieldSearch,
  EuiFlexGrid,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiPopover,
  EuiSpacer,
  EuiStepsHorizontal,
  EuiSuperSelect,
  EuiText,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import type { EuiStepsHorizontalProps, EuiSuperSelectOption } from '@elastic/eui';
import { KbnWarningCallout } from '@kbn/ui-callout';

import {
  AWS_SCHEMA_META,
  AWS_SERVICE_CATEGORIES,
  MANAGED_INTEGRATION_EXAMPLES,
  type AwsSchema,
  type AwsServiceEntry,
} from './aws_services_data';
import { StepServiceSettings } from './step_service_settings';
import { StepAuthentication, type DeploymentMethod } from './step_authentication';
import { StepDetectReview } from './step_detect_review';

type DataTypeFilterId = 'all' | 'logs' | 'metrics';

const DATA_TYPE_OPTIONS = [
  { id: 'all', label: 'All' },
  { id: 'logs', label: 'Logs' },
  { id: 'metrics', label: 'Metrics' },
];

type SortOptionId = 'popular' | 'az';

// "Popular" keeps the curated category/service order already encoded in
// AWS_SERVICE_CATEGORIES; "A-Z" re-sorts the flattened list by name.
const SORT_OPTIONS: Array<EuiSuperSelectOption<SortOptionId>> = [
  { value: 'popular', inputDisplay: 'Sort: Popular' },
  { value: 'az', inputDisplay: 'Sort: A-Z' },
];

const DataSchemaCard: React.FunctionComponent<{
  value: AwsSchema;
  checked: boolean;
  onChange: (value: AwsSchema) => void;
}> = ({ value, checked, onChange }) => {
  const meta = AWS_SCHEMA_META[value];
  return (
    <EuiCheckableCard
      id={`awsOnboardingSchema-${value}`}
      name="awsOnboardingSchema"
      checkableType="radio"
      checked={checked}
      onChange={() => onChange(value)}
      data-test-subj={`awsOnboardingSchema-${value}`}
      label={
        <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
          <EuiFlexItem grow={false}>
            <strong>{meta.label}</strong>
          </EuiFlexItem>
          {meta.recommended && (
            <EuiFlexItem grow={false}>
              <EuiBadge color="hollow">Recommended</EuiBadge>
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      }
    >
      <EuiText size="s" color="subdued">
        <p>{meta.description}</p>
      </EuiText>
    </EuiCheckableCard>
  );
};

function serviceMatches(
  service: AwsServiceEntry,
  dataTypeFilter: DataTypeFilterId,
  query: string
): boolean {
  if (dataTypeFilter === 'logs' && !service.dataTypes.includes('Logs')) return false;
  if (dataTypeFilter === 'metrics' && !service.dataTypes.includes('Metrics')) return false;
  if (query && !service.name.toLowerCase().includes(query.toLowerCase())) return false;
  return true;
}

const ServiceCard: React.FunctionComponent<{
  service: AwsServiceEntry;
  checked: boolean;
  onToggle: (id: string) => void;
  isOutdated?: boolean;
  orderNumber?: number;
}> = ({ service, checked, onToggle, isOutdated, orderNumber }) => {
  const { euiTheme } = useEuiTheme();
  const [isWarningOpen, setIsWarningOpen] = useState(false);
  return (
    <EuiCheckableCard
      id={`awsService-${service.id}`}
      checkableType="checkbox"
      checked={checked}
      onChange={() => !isOutdated && onToggle(service.id)}
      disabled={isOutdated}
      color="plain"
      css={{
        borderColor: euiTheme.colors.borderBaseProminent,
        '.euiPanel--subdued': { backgroundColor: euiTheme.colors.emptyShade },
      }}
      label={
        <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiIcon type="logoAWS" size="m" />
          </EuiFlexItem>
          <EuiFlexItem style={{ minWidth: 0 }}>
            <EuiText
              size="s"
              className="eui-textTruncate"
              style={{
                fontWeight: checked && !isOutdated ? euiTheme.font.weight.medium : undefined,
              }}
            >
              {service.name}
            </EuiText>
          </EuiFlexItem>
          {orderNumber !== undefined && (
            <EuiFlexItem grow={false}>
              <EuiBadge color="primary" css={{ minWidth: 20, textAlign: 'center' }}>
                {orderNumber}
              </EuiBadge>
            </EuiFlexItem>
          )}
          {service.dataTypes.map((dt) => (
            <EuiFlexItem grow={false} key={dt}>
              <EuiBadge color="hollow">{dt}</EuiBadge>
            </EuiFlexItem>
          ))}
          {isOutdated && (
            <EuiFlexItem grow={false}>
              <EuiPopover
                isOpen={isWarningOpen}
                closePopover={() => setIsWarningOpen(false)}
                panelPaddingSize="m"
                anchorPosition="downCenter"
                button={
                  <EuiButtonIcon
                    iconType="warning"
                    color="warning"
                    size="xs"
                    aria-label={`${service.name} has breaking changes`}
                    onClick={(e: React.MouseEvent) => {
                      e.stopPropagation();
                      e.preventDefault();
                      setIsWarningOpen((o) => !o);
                    }}
                  />
                }
              >
                <div style={{ maxWidth: 320 }}>
                  <EuiText size="s">
                    <p>New version available, action required due to breaking changes</p>
                  </EuiText>
                  <EuiSpacer size="m" />
                  <EuiFlexGroup gutterSize="s" responsive={false}>
                    <EuiFlexItem grow={false}>
                      <EuiButton size="s" fill onClick={() => setIsWarningOpen(false)}>
                        Review breaking changes
                      </EuiButton>
                    </EuiFlexItem>
                    <EuiFlexItem grow={false}>
                      <EuiButtonEmpty size="s" onClick={() => setIsWarningOpen(false)}>
                        View changelog
                      </EuiButtonEmpty>
                    </EuiFlexItem>
                  </EuiFlexGroup>
                </div>
              </EuiPopover>
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      }
    />
  );
};

// Re-exported via version_switcher.tsx as AwsOnboardingPage — import from there.
export const AwsOnboardingProtoPage: React.FunctionComponent<{
  outdatedServiceIds?: Set<string>;
  showErrorStatuses?: boolean;
}> = ({ outdatedServiceIds, showErrorStatuses }) => {
  const history = useHistory();
  const { euiTheme } = useEuiTheme();

  const [currentStep, setCurrentStep] = useState<number>(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [dataTypeFilter, setDataTypeFilter] = useState<DataTypeFilterId>('all');
  const [sortOption, setSortOption] = useState<SortOptionId>('popular');
  const [deploymentMethod, setDeploymentMethod] = useState<DeploymentMethod>('managed');
  const [triggerSources, setTriggerSources] = useState<Record<string, string>>({});
  // Data schema: chosen once here and applied everywhere downstream (see
  // aws_services_data.ts for the full rationale). OpenTelemetry by default.
  const [schema, setSchema] = useState<AwsSchema>('otel');
  // Switching format after services are already selected resets that
  // configuration — not additive — so flag it inline rather than silently.
  const [showSchemaResetWarning, setShowSchemaResetWarning] = useState(false);

  // Deploy/detect state is lifted here (rather than owned by the Deploy step)
  // so it survives navigating to the separate Detect & Review step.
  const [deployIdentityName, setDeployIdentityName] = useState('');
  const [globalRegion, setGlobalRegion] = useState('us-east-1');
  const [isDeployed, setIsDeployed] = useState(false);
  const [receivedCount, setReceivedCount] = useState(0);
  const deployTimers = useRef<number[]>([]);
  // Step 3: Next is disabled until the selected credential fields are filled.
  const [isCredentialsValid, setIsCredentialsValid] = useState(false);
  // Step 3 (managed): Next is disabled until the CloudFormation stack name
  // is entered.
  const [stackName, setStackName] = useState('');
  // Step 3 (managed): the Managed Integrations card deploys its own data
  // streams (fast arrival animation), so step 4's summary is already settled.
  const [isManagedDeployed, setIsManagedDeployed] = useState(false);
  const [managedReceivedCount, setManagedReceivedCount] = useState(0);
  // Step 3 (agent): policy + simulated enrollment, lifted so the Detect &
  // Review summary can read them and Next can gate on enrollment.
  // Policy naming was dropped from the agent flow's UI; the summary still
  // reports the default policy the integration lands in.
  const agentPolicyName = 'Agent policy 1';
  const [isAgentEnrolled, setIsAgentEnrolled] = useState(false);
  const [agentReceivedCount, setAgentReceivedCount] = useState(0);

  useEffect(() => {
    return () => deployTimers.current.forEach((t) => window.clearTimeout(t));
  }, []);

  const allServices = useMemo(() => AWS_SERVICE_CATEGORIES.flatMap((c) => c.services), []);

  const selectedServices = useMemo(
    () => allServices.filter((s) => selected.has(s.id)),
    [allServices, selected]
  );

  // Drives both the deploy-sequencing timers below and the selection-order
  // badges shown on step 1 — the two stay in sync since they share this order.
  const selectedOrder = useMemo(
    () => new Map(selectedServices.map((s, i) => [s.id, i + 1])),
    [selectedServices]
  );

  // First service confirms after 5s, then each subsequent one 8s after the last.
  const onLaunchCloudFormation = () => {
    setIsDeployed(true);
    setReceivedCount(0);
    selectedServices.forEach((_, i) => {
      const delay = 5000 + i * 8000;
      deployTimers.current.push(window.setTimeout(() => setReceivedCount((c) => c + 1), delay));
    });
  };

  // Managed Integrations data streams confirm quickly: first after 800ms,
  // then one every 700ms.
  const onDeployManagedIntegrations = () => {
    setIsManagedDeployed(true);
    setManagedReceivedCount(0);
    MANAGED_INTEGRATION_EXAMPLES.forEach((_, i) => {
      deployTimers.current.push(
        window.setTimeout(() => setManagedReceivedCount((c) => c + 1), 800 + i * 700)
      );
    });
  };

  // Agent path: once the agent enrolls, incoming data confirms per service
  // at the same fast cadence.
  const onAgentEnrolled = () => {
    setIsAgentEnrolled(true);
    setAgentReceivedCount(0);
    selectedServices.forEach((_, i) => {
      deployTimers.current.push(
        window.setTimeout(() => setAgentReceivedCount((c) => c + 1), 800 + i * 700)
      );
    });
  };

  const totalSteps = 4;

  const onToggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Flat, ungrouped list: filtered by search/data-type, then ordered per the
  // sort control ("Popular" keeps the curated catalog order).
  const visibleServices = useMemo(() => {
    const matched = allServices.filter((s) => serviceMatches(s, dataTypeFilter, searchQuery));
    if (sortOption === 'az') {
      return [...matched].sort((a, b) => a.name.localeCompare(b.name));
    }
    return matched;
  }, [allServices, dataTypeFilter, searchQuery, sortOption]);

  // Both deployment methods share the same 4-step frame. Step 3 owns the full
  // authenticate + deploy lifecycle (CloudFormation launch and detection
  // animation included); step 4 reviews and installs content.
  const stepTitles = [
    'Choose Services',
    'Service Settings',
    'Authenticate & Deploy',
    'Detect & Review',
  ];

  const steps: EuiStepsHorizontalProps['steps'] = stepTitles.map((title, i) => {
    const stepNumber = i + 1;
    return {
      title,
      status:
        currentStep === stepNumber
          ? 'current'
          : currentStep > stepNumber
          ? 'complete'
          : 'incomplete',
      onClick: () => selected.size > 0 && setCurrentStep(stepNumber),
    };
  });

  const onCancel = () => history.push('/detail/aws/overview');

  const onDeploymentMethodChange = (method: DeploymentMethod) => {
    setDeploymentMethod(method);
  };

  const onSchemaChange = (value: AwsSchema) => {
    if (value !== schema && selected.size > 0) {
      setShowSchemaResetWarning(true);
    }
    setSchema(value);
  };

  return (
    // Full-bleed white page canvas per design reference, overriding
    // Kibana's default page background for this flow only. emptyShade
    // (not a literal hex) so this still adapts correctly in dark mode.
    <div style={{ background: euiTheme.colors.emptyShade, minHeight: '100%', width: '100%' }}>
      <div
        style={{
          maxWidth: 1240,
          width: '100%',
          minWidth: 0,
          overflowX: 'hidden',
          margin: '0 auto',
          padding: euiTheme.size.l,
        }}
      >
        <EuiFlexGroup justifyContent="center" alignItems="center" gutterSize="m" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiIcon type="logoAWS" size="xl" />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiTitle size="l">
              <h1>AWS Web Services</h1>
            </EuiTitle>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer size="s" />
        <EuiText textAlign="center" color="subdued" size="m">
          <p>Collect logs and metrics from Amazon Web Services (AWS)</p>
        </EuiText>
        <EuiSpacer size="m" />
        {/* Fixed-width container so the progress bar never resizes between steps */}
        <div style={{ maxWidth: 960, margin: '0 auto' }}>
          <EuiStepsHorizontal steps={steps} size="m" />
        </div>
        <EuiSpacer size="xl" />

        {currentStep === 1 && (
          <>
            <EuiTitle size="s">
              <h3>Data schema</h3>
            </EuiTitle>
            <EuiSpacer size="xs" />
            <EuiText size="s" color="subdued">
              <p>
                This can&apos;t be changed after installation without creating a new integration
                policy.
              </p>
            </EuiText>
            <EuiSpacer size="m" />
            <EuiFlexGroup gutterSize="m">
              {(['otel', 'ecs'] as const).map((value) => (
                <EuiFlexItem key={value}>
                  <DataSchemaCard
                    value={value}
                    checked={schema === value}
                    onChange={onSchemaChange}
                  />
                </EuiFlexItem>
              ))}
            </EuiFlexGroup>

            {showSchemaResetWarning && (
              <>
                <EuiSpacer size="m" />
                <KbnWarningCallout
                  announceOnMount
                  title="This will reset your progress"
                  onDismiss={() => setShowSchemaResetWarning(false)}
                  data-test-subj="awsOnboardingSchemaResetWarning"
                >
                  <p>
                    Changing the data format clears your selected services and any configuration
                    entered so far — it isn&apos;t an additive change.
                  </p>
                </KbnWarningCallout>
              </>
            )}

            <EuiSpacer size="xl" />

            <EuiTitle size="m">
              <h2>Which AWS services do you want to monitor?</h2>
            </EuiTitle>
            <EuiSpacer size="s" />
            <EuiText size="s" color="subdued">
              <p>
                Select the services you use. Elastic will set up everything needed to start
                collecting data from your AWS account.
              </p>
            </EuiText>
            <EuiSpacer size="m" />

            {/* gutterSize="s" = 8px, per design. */}
            <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
              <EuiFlexItem>
                <EuiFieldSearch
                  fullWidth
                  compressed
                  placeholder="Search services"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  isClearable
                  data-test-subj="awsOnboardingSearch"
                />
              </EuiFlexItem>
              <EuiFlexItem grow={false} style={{ width: 160 }}>
                <EuiSuperSelect
                  compressed
                  fullWidth
                  options={SORT_OPTIONS}
                  valueOfSelected={sortOption}
                  onChange={setSortOption}
                  aria-label="Sort services"
                  data-test-subj="awsOnboardingSort"
                />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                {/* buttonSize="s" matches a compressed field's height exactly
                  (both resolve to the same token) — "compressed" is
                  actually a touch shorter than that, which read as uneven
                  next to the search bar. */}
                <EuiButtonGroup
                  legend="Filter services by data type"
                  options={DATA_TYPE_OPTIONS}
                  idSelected={dataTypeFilter}
                  onChange={(id) => setDataTypeFilter(id as DataTypeFilterId)}
                  buttonSize="s"
                />
              </EuiFlexItem>
            </EuiFlexGroup>

            {outdatedServiceIds && outdatedServiceIds.size > 0 && (
              <>
                <EuiSpacer size="m" />
                <EuiCallOut
                  size="s"
                  color="warning"
                  iconType="warning"
                  title="Some services need to be upgraded and cannot be selected"
                />
              </>
            )}

            <EuiSpacer size="l" />
            {visibleServices.length === 0 ? (
              <EuiEmptyPrompt
                iconType="search"
                title={<h3>No services match your search</h3>}
                body={<p>Try a different term, or switch the Logs/Metrics filter.</p>}
              />
            ) : (
              <EuiFlexGrid columns={2} gutterSize="m">
                {visibleServices.map((service) => (
                  <EuiFlexItem key={service.id}>
                    <ServiceCard
                      service={service}
                      checked={selected.has(service.id)}
                      onToggle={onToggle}
                      isOutdated={outdatedServiceIds?.has(service.id)}
                      orderNumber={selectedOrder.get(service.id)}
                    />
                  </EuiFlexItem>
                ))}
              </EuiFlexGrid>
            )}
          </>
        )}

        {currentStep === 2 && (
          <StepServiceSettings
            services={selectedServices}
            triggerSources={triggerSources}
            onTriggerSourceChange={(id, value) =>
              setTriggerSources((prev) => ({ ...prev, [id]: value }))
            }
            globalRegion={globalRegion}
            onGlobalRegionChange={setGlobalRegion}
          />
        )}

        {currentStep === 3 && (
          <StepAuthentication
            services={selectedServices}
            schema={schema}
            deploymentMethod={deploymentMethod}
            onDeploymentMethodChange={onDeploymentMethodChange}
            onCredentialsValidChange={setIsCredentialsValid}
            deployIdentityName={deployIdentityName}
            onDeployIdentityNameChange={setDeployIdentityName}
            isDeployed={isDeployed}
            onLaunchCloudFormation={onLaunchCloudFormation}
            stackName={stackName}
            onStackNameChange={setStackName}
            isAgentEnrolled={isAgentEnrolled}
            onAgentEnrolled={onAgentEnrolled}
            isManagedDeployed={isManagedDeployed}
            onDeployManagedIntegrations={onDeployManagedIntegrations}
            agentReceivedCount={agentReceivedCount}
          />
        )}

        {currentStep === 4 && (
          <StepDetectReview
            deploymentMethod={deploymentMethod}
            services={selectedServices}
            schema={schema}
            triggerSources={triggerSources}
            region={globalRegion}
            identityName={deployIdentityName}
            stackName={stackName}
            receivedCount={receivedCount}
            agentPolicyName={agentPolicyName}
            managedReceivedCount={managedReceivedCount}
            agentReceivedCount={agentReceivedCount}
            showErrorStatuses={showErrorStatuses}
          />
        )}

        <EuiSpacer size="xl" />
      </div>
      {/* Sticky footer so the primary action stays reachable without scrolling
        past a potentially long service list — steps 3-4 end in bordered
        cards, so a border above the footer there would read as a duplicate
        line, hence the conditional. */}
      <div
        style={{
          position: 'sticky',
          bottom: 0,
          background: euiTheme.colors.emptyShade,
          borderTop:
            currentStep < 3
              ? `${euiTheme.border.width.thin} solid ${euiTheme.colors.borderBaseSubdued}`
              : 'none',
        }}
      >
        <div
          style={{
            maxWidth: 1240,
            width: '100%',
            minWidth: 0,
            margin: '0 auto',
            padding: `${euiTheme.size.m} ${euiTheme.size.l}`,
          }}
        >
          <EuiFlexGroup alignItems="center" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty onClick={onCancel} flush="left">
                Cancel
              </EuiButtonEmpty>
            </EuiFlexItem>
            <EuiFlexItem />
            {currentStep > 1 && (
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty
                  iconType="arrowLeft"
                  onClick={() => setCurrentStep(currentStep - 1)}
                  data-test-subj="awsOnboardingBack"
                >
                  Back
                </EuiButtonEmpty>
              </EuiFlexItem>
            )}
            {currentStep < totalSteps && (
              <EuiFlexItem grow={false}>
                <EuiButton
                  fill
                  isDisabled={
                    selected.size === 0 ||
                    // Authenticate & Deploy: credentials for the selected method must
                    // be filled, and (managed only) CloudFormation must be launched,
                    // Managed Integrations deployed, and the stack name entered.
                    // None of these wait on data actually arriving — detection runs
                    // in the background and is only surfaced on Detect & Review.
                    (currentStep === 3 &&
                      (!isCredentialsValid ||
                        (deploymentMethod === 'managed' &&
                          (!isDeployed || stackName.trim().length === 0 || !isManagedDeployed)) ||
                        (deploymentMethod === 'agent' && !isAgentEnrolled)))
                  }
                  onClick={() => setCurrentStep(currentStep + 1)}
                  data-test-subj="awsOnboardingNext"
                >
                  Continue
                </EuiButton>
              </EuiFlexItem>
            )}
            {currentStep === totalSteps && (
              <EuiFlexItem grow={false}>
                <EuiButton
                  fill
                  iconType="sortRight"
                  iconSide="right"
                  href="/app/dashboards"
                  data-test-subj="awsOnboardingTakeMeToMyData"
                >
                  Take me to my data
                </EuiButton>
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        </div>
      </div>
    </div>
  );
};
