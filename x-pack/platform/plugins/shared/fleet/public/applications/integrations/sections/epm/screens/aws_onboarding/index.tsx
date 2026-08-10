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
  EuiCheckableCard,
  EuiEmptyPrompt,
  EuiFieldSearch,
  EuiFlexGrid,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiIcon,
  EuiLink,
  EuiNotificationBadge,
  EuiPanel,
  EuiSpacer,
  EuiStepsHorizontal,
  EuiText,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import type { EuiStepsHorizontalProps } from '@elastic/eui';

import {
  AWS_SERVICE_CATEGORIES,
  type AwsServiceCategory,
  type AwsServiceEntry,
} from './aws_services_data';
import { StepServiceSettings } from './step_service_settings';
import { StepAuthentication, type DeploymentMethod } from './step_authentication';
import { StepDeploy } from './step_deploy';
import { StepDetectReview } from './step_detect_review';

type DataTypeFilterId = 'all' | 'logs' | 'metrics';

const DATA_TYPE_OPTIONS = [
  { id: 'all', label: 'All' },
  { id: 'logs', label: 'Logs' },
  { id: 'metrics', label: 'Metrics' },
];

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
}> = ({ service, checked, onToggle }) => {
  return (
    <EuiCheckableCard
      id={`awsService-${service.id}`}
      checkableType="checkbox"
      checked={checked}
      onChange={() => onToggle(service.id)}
      label={
        <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiIcon type="logoAWS" size="m" />
          </EuiFlexItem>
          <EuiFlexItem style={{ minWidth: 0 }}>
            <EuiText size="s" className="eui-textTruncate">
              <strong>{service.name}</strong>
            </EuiText>
          </EuiFlexItem>
          {service.dataTypes.map((dt) => (
            <EuiFlexItem grow={false} key={dt}>
              <EuiBadge color="hollow">{dt}</EuiBadge>
            </EuiFlexItem>
          ))}
        </EuiFlexGroup>
      }
    />
  );
};

const CategorySidebarItem: React.FunctionComponent<{
  category: AwsServiceCategory;
  isActive: boolean;
  visibleCount: number;
  selectedCount: number;
  onClick: () => void;
}> = ({ category, isActive, visibleCount, selectedCount, onClick }) => {
  const exampleNames = category.services
    .slice(0, 2)
    .map((s) => s.name)
    .join(', ');
  return (
    <EuiPanel
      hasShadow={false}
      hasBorder={false}
      color={isActive ? 'primary' : 'transparent'}
      paddingSize="s"
      onClick={onClick}
      data-test-subj={`awsOnboardingCategory-${category.id}`}
    >
      <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
        <EuiFlexItem>
          <EuiText size="s">
            <strong>{category.label}</strong>
          </EuiText>
          <EuiText size="xs" color="subdued" className="eui-textTruncate">
            {exampleNames}, ...
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiNotificationBadge color={selectedCount > 0 ? 'accent' : 'subdued'}>
            {selectedCount > 0 ? `${selectedCount}/${visibleCount}` : visibleCount}
          </EuiNotificationBadge>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};

const CategoryServicesPanel: React.FunctionComponent<{
  category: AwsServiceCategory;
  services: AwsServiceEntry[];
  selected: Set<string>;
  onToggle: (id: string) => void;
  onSelectAll: (ids: string[]) => void;
}> = ({ category, services, selected, onToggle, onSelectAll }) => {
  return (
    <EuiPanel color="subdued" paddingSize="l" hasShadow={false}>
      <EuiFlexGroup alignItems="center" responsive={false}>
        <EuiFlexItem>
          <EuiTitle size="s">
            <h3>{category.label}</h3>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiLink onClick={() => onSelectAll(services.map((s) => s.id))}>Select All</EuiLink>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="m" />
      <EuiFlexGrid columns={2} gutterSize="m">
        {services.map((service) => (
          <EuiFlexItem key={service.id}>
            <ServiceCard
              service={service}
              checked={selected.has(service.id)}
              onToggle={onToggle}
            />
          </EuiFlexItem>
        ))}
      </EuiFlexGrid>
    </EuiPanel>
  );
};

export const AwsOnboardingPage: React.FunctionComponent = () => {
  const history = useHistory();
  const { euiTheme } = useEuiTheme();

  const [currentStep, setCurrentStep] = useState<number>(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [dataTypeFilter, setDataTypeFilter] = useState<DataTypeFilterId>('all');
  const [activeCategoryId, setActiveCategoryId] = useState<string>(
    AWS_SERVICE_CATEGORIES[0].id
  );
  const [deploymentMethod, setDeploymentMethod] = useState<DeploymentMethod>('managed');
  const [triggerSources, setTriggerSources] = useState<Record<string, string>>({});

  // Deploy/detect state is lifted here (rather than owned by the Deploy step)
  // so it survives navigating to the separate Detect & Review step.
  const [deployIdentityName, setDeployIdentityName] = useState('');
  const [deployRegion, setDeployRegion] = useState('us-east');
  const [isDeployed, setIsDeployed] = useState(false);
  const [receivedCount, setReceivedCount] = useState(0);
  const deployTimers = useRef<number[]>([]);
  // Step 3: Next is disabled until the selected credential fields are filled.
  const [isCredentialsValid, setIsCredentialsValid] = useState(false);
  // Step 4: Next is disabled until the CloudFormation stack name is entered.
  const [stackName, setStackName] = useState('');

  useEffect(() => {
    return () => deployTimers.current.forEach((t) => window.clearTimeout(t));
  }, []);

  const selectedServices = useMemo(
    () =>
      AWS_SERVICE_CATEGORIES.flatMap((c) => c.services).filter((s) => selected.has(s.id)),
    [selected]
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

  const totalSteps = 5;

  const onToggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const onSelectAll = (ids: string[]) => {
    setSelected((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => next.add(id));
      return next;
    });
  };

  const visibleByCategory = useMemo(() => {
    const map = new Map<string, AwsServiceEntry[]>();
    for (const cat of AWS_SERVICE_CATEGORIES) {
      map.set(
        cat.id,
        cat.services.filter((s) => serviceMatches(s, dataTypeFilter, searchQuery))
      );
    }
    return map;
  }, [dataTypeFilter, searchQuery]);

  const isSearching = searchQuery.trim().length > 0;
  const renderedCategories = isSearching
    ? AWS_SERVICE_CATEGORIES.filter((c) => (visibleByCategory.get(c.id) ?? []).length > 0)
    : AWS_SERVICE_CATEGORIES.filter((c) => c.id === activeCategoryId);

  // Both deployment methods share the same 5-step frame. Agent-based doesn't
  // have Deploy/Detect & Review content designed yet (see placeholders below),
  // but the step bar itself stays consistent between methods.
  const stepTitles = [
    'Choose Services',
    'Service Settings',
    'Authentication',
    'Deploy',
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

  return (
    // Full-bleed white page canvas per design reference, overriding
    // Kibana's default page background for this flow only.
    <div style={{ background: '#FFFFFF', minHeight: '100%', width: '100%' }}>
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
          <EuiFlexGroup gutterSize="m" alignItems="center" responsive={false}>
            <EuiFlexItem>
              <EuiFieldSearch
                fullWidth
                placeholder="Search services"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                isClearable
                data-test-subj="awsOnboardingSearch"
              />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButtonGroup
                legend="Filter services by data type"
                options={DATA_TYPE_OPTIONS}
                idSelected={dataTypeFilter}
                onChange={(id) => setDataTypeFilter(id as DataTypeFilterId)}
                buttonSize="compressed"
              />
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiSpacer size="l" />
          <EuiFlexGroup gutterSize="l" alignItems="flexStart">
            <EuiFlexItem grow={1} style={{ minWidth: 0 }}>
              {AWS_SERVICE_CATEGORIES.map((cat) => {
                const visible = visibleByCategory.get(cat.id) ?? [];
                const selectedCount = cat.services.filter((s) => selected.has(s.id)).length;
                return (
                  <CategorySidebarItem
                    key={cat.id}
                    category={cat}
                    isActive={!isSearching && cat.id === activeCategoryId}
                    visibleCount={visible.length}
                    selectedCount={selectedCount}
                    onClick={() => {
                      setActiveCategoryId(cat.id);
                      setSearchQuery('');
                    }}
                  />
                );
              })}
            </EuiFlexItem>
            <EuiFlexItem grow={3} style={{ minWidth: 0 }}>
              {renderedCategories.length === 0 ? (
                <EuiEmptyPrompt
                  iconType="search"
                  title={<h3>No services match your search</h3>}
                  body={<p>Try a different term, or switch the Logs/Metrics filter.</p>}
                />
              ) : (
                renderedCategories.map((cat, i) => (
                  <React.Fragment key={cat.id}>
                    {i > 0 && <EuiSpacer size="m" />}
                    <CategoryServicesPanel
                      category={cat}
                      services={visibleByCategory.get(cat.id) ?? []}
                      selected={selected}
                      onToggle={onToggle}
                      onSelectAll={onSelectAll}
                    />
                  </React.Fragment>
                ))
              )}
            </EuiFlexItem>
          </EuiFlexGroup>
        </>
      )}

      {currentStep === 2 && (
        <StepServiceSettings
          services={selectedServices}
          triggerSources={triggerSources}
          onTriggerSourceChange={(id, value) =>
            setTriggerSources((prev) => ({ ...prev, [id]: value }))
          }
        />
      )}

      {currentStep === 3 && (
        <StepAuthentication
          servicesCount={selectedServices.length}
          deploymentMethod={deploymentMethod}
          onDeploymentMethodChange={onDeploymentMethodChange}
          onCredentialsValidChange={setIsCredentialsValid}
          deployIdentityName={deployIdentityName}
          onDeployIdentityNameChange={setDeployIdentityName}
          deployRegion={deployRegion}
          onDeployRegionChange={setDeployRegion}
          isDeployed={isDeployed}
          onLaunchCloudFormation={onLaunchCloudFormation}
        />
      )}

      {currentStep === 4 && deploymentMethod === 'managed' && (
        <StepDeploy
          services={selectedServices}
          isLaunched={isDeployed}
          receivedCount={receivedCount}
          stackName={stackName}
          onStackNameChange={setStackName}
        />
      )}
      {currentStep === 4 && deploymentMethod === 'agent' && (
        <>
          <EuiTitle size="m">
            <h2>Deploy</h2>
          </EuiTitle>
          <EuiSpacer size="s" />
          <EuiText size="s" color="subdued">
            <p>[Placeholder — not yet designed for Agent-based.]</p>
          </EuiText>
        </>
      )}

      {currentStep === 5 && deploymentMethod === 'managed' && <StepDetectReview />}
      {currentStep === 5 && deploymentMethod === 'agent' && (
        <>
          <EuiTitle size="m">
            <h2>Detect &amp; Review</h2>
          </EuiTitle>
          <EuiSpacer size="s" />
          <EuiText size="s" color="subdued">
            <p>[Placeholder — not yet designed for Agent-based.]</p>
          </EuiText>
        </>
      )}

      <EuiHorizontalRule margin="xl" />
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
                // Authentication: credential fields for the selected method must be
                // filled, and (managed only) CloudFormation must already be launched —
                // step 4 only displays the resulting deploy/detect state, it can't
                // trigger the launch itself.
                (currentStep === 3 &&
                  (!isCredentialsValid || (deploymentMethod === 'managed' && !isDeployed))) ||
                (currentStep === 4 &&
                  deploymentMethod === 'managed' &&
                  stackName.trim().length === 0)
              }
              onClick={() => setCurrentStep(currentStep + 1)}
              data-test-subj="awsOnboardingNext"
            >
              Next
            </EuiButton>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
      <EuiSpacer size="xl" />
    </div>
    </div>
  );
};
