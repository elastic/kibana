/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useHistory } from 'react-router-dom';
import { css } from '@emotion/react';
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
  type AwsServiceCategory,
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

// EuiSuperSelect forwards any extra option properties straight through to
// the underlying EuiListItemLayout for each row, so `css` and
// `showIndicator` below aren't part of the documented EuiSuperSelectOption
// type but are a supported (if undocumented) escape hatch — used here to
// drop the built-in selected-row tint and replace the built-in check icon
// (which centers on the *whole*, two-line row) with one aligned to the
// title specifically.
// !important because the built-in selected/hover rules are scoped under
// a :not([aria-disabled]) selector, which out-specificities a plain class
// override.
const NO_SELECTED_TINT_CSS = css`
  background-color: transparent !important;
  &:hover {
    background-color: transparent !important;
  }
`;

// Each option shows its full description in the dropdown (not just once
// selected) since the choice has real downstream effects and isn't a plain
// filter — same idiom as e.g. ILM's phase picker.
function getDataFormatOptions(
  selectedSchema: AwsSchema
): Array<EuiSuperSelectOption<AwsSchema> & { css?: unknown; showIndicator?: boolean }> {
  return (['otel', 'ecs'] as const).map((value) => ({
    value,
    inputDisplay: AWS_SCHEMA_META[value].label,
    showIndicator: false,
    css: NO_SELECTED_TINT_CSS,
    dropdownDisplay: (
      <EuiFlexGroup gutterSize="xs" alignItems="flexStart" responsive={false}>
        <EuiFlexItem grow={false} style={{ width: 16, paddingTop: 2 }}>
          {value === selectedSchema && <EuiIcon type="check" color="primary" size="m" />}
        </EuiFlexItem>
        <EuiFlexItem>
          <strong>{AWS_SCHEMA_META[value].label}</strong>
          <EuiText size="s" color="subdued">
            <p>{AWS_SCHEMA_META[value].description}</p>
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    ),
  }));
}

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
  const { euiTheme } = useEuiTheme();
  return (
    <EuiCheckableCard
      id={`awsService-${service.id}`}
      checkableType="checkbox"
      checked={checked}
      onChange={() => onToggle(service.id)}
      color="plain"
      css={{
        borderColor: euiTheme.colors.borderBaseProminent,
        // Override EuiCheckableCard's built-in "subdued" tint on the
        // checkbox cell so it reads as part of the same white card,
        // not a separate grey patch.
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
              style={{ fontWeight: checked ? euiTheme.font.weight.medium : undefined }}
            >
              {service.name}
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
  const { euiTheme } = useEuiTheme();
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
          <EuiText size="s" style={{ fontWeight: euiTheme.font.weight.semiBold }}>
            {category.label}
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
  // Data format: hidden-by-default choice made once here and applied
  // everywhere downstream (see aws_services_data.ts for the full rationale).
  // OTel-native by default.
  const [schema, setSchema] = useState<AwsSchema>('otel');
  // Switching format after services are already selected resets that
  // configuration — not additive — so flag it inline rather than silently.
  const [showSchemaResetWarning, setShowSchemaResetWarning] = useState(false);

  // Deploy/detect state is lifted here (rather than owned by the Deploy step)
  // so it survives navigating to the separate Detect & Review step.
  const [deployIdentityName, setDeployIdentityName] = useState('');
  // Fixed, not user-editable — taken from the Global region chosen in
  // Service Settings (step 2). Kept as a value here (rather than inlined)
  // since Detect & Review's summary still needs to display it.
  const deployRegion = 'us-east';
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
    <div
      style={{ background: euiTheme.colors.emptyShade, minHeight: '100%', width: '100%' }}
    >
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

          {/* gutterSize="s" = 8px, per design. Data format sits inline with
              the other task controls — it's still a real decision with
              downstream effects, but per design feedback it reads better as
              a compact select right in this row than as a separate settings
              card. Each option shows its description in the dropdown so the
              tradeoff is visible before picking. */}
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
            <EuiFlexItem grow={false} style={{ width: 340 }}>
              <EuiSuperSelect
                compressed
                fullWidth
                prepend="Data format"
                options={getDataFormatOptions(schema)}
                valueOfSelected={schema}
                onChange={onSchemaChange}
                aria-label="Data format"
                data-test-subj="awsOnboardingEditSchema"
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
          region={deployRegion}
          identityName={deployIdentityName}
          stackName={stackName}
          receivedCount={receivedCount}
          agentPolicyName={agentPolicyName}
          managedReceivedCount={managedReceivedCount}
          agentReceivedCount={agentReceivedCount}
        />
      )}

      {/* Steps 3-4 end in bordered cards, so a rule above the footer reads as
          a duplicate line there — keep it only on the first two steps. */}
      {currentStep < 3 ? <EuiHorizontalRule margin="xl" /> : <EuiSpacer size="xl" />}
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
                      (!isDeployed ||
                        stackName.trim().length === 0 ||
                        !isManagedDeployed)) ||
                    (deploymentMethod === 'agent' && !isAgentEnrolled)))
              }
              onClick={() => setCurrentStep(currentStep + 1)}
              data-test-subj="awsOnboardingNext"
            >
              Next
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
      <EuiSpacer size="xl" />
    </div>
    </div>
  );
};
