/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// PROTOTYPE: hard-coded Nginx onboarding wizard, after the design team's Ingest Workbench
// prototype. Step 1 picks schema, signals and agent policy; the following steps configure the
// selected streams; saving installs the schema's child package and moves to a summary.
//
// State lives in NginxOnboardingWizard so it survives a schema switch. The body is keyed by
// schema: it runs the stock create-package-policy hook (useOnSubmit) for that schema's child
// package, so switching schema remounts it with a fresh package policy.

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { css } from '@emotion/react';
import { isEqual } from 'lodash';
import { useHistory, useLocation } from 'react-router-dom';
import {
  EuiBadge,
  EuiButton,
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiText,
  EuiTitle,
  EuiToolTip,
  useEuiTheme,
} from '@elastic/eui';

import type { AgentPolicy, NewAgentPolicy, PackageListItem } from '../../../../../../../types';
import {
  useAuthz,
  useGetPackageInfoByKeyQuery,
  useLink,
  useStartServices,
} from '../../../../../../../hooks';
import { useSpaceSettingsContext } from '../../../../../../../hooks/use_space_settings_context';
import { incrementPolicyName } from '../../../../../../../services';
import type { RootSchemaOption } from '../../../../../../../hooks/use_root_package';
import { PackageIcon } from '../../../../../../../components';
import { INTEGRATIONS_PLUGIN_ID } from '../../../../../../../constants';
import { generateNewAgentPolicyWithDefaults } from '../../../../../../../../common/services/generate_new_agent_policy';
import { useOnSubmit } from '../../../../../../fleet/sections/agent_policy/create_package_policy_page/single_page_layout/hooks';
import { PackageDocumentationModal } from '../../../../../../fleet/sections/agent_policy/create_package_policy_page/single_page_layout/components';
import { SelectedPolicyTab } from '../../../../../../fleet/sections/agent_policy/create_package_policy_page/components';
import { useAllNonManagedAgentPolicies } from '../../../../../../fleet/sections/agent_policy/create_package_policy_page/components/steps/components/use_policies';
import type { SavedPolicyResult } from '../../../../../../fleet/sections/agent_policy/create_package_policy_page/types';
import { getRootChildVersion } from '../schema_toggle';

import type { NginxOverrides, NginxSchema, NginxStep, NginxStreamId } from './model';
import { applyToInputs, getSteps, resolveValues } from './model';
import { StepRail } from './primitives';
import type { AgentPolicyMode } from './steps';
import { LogsStep, MetricsStep, SchemaSignalsStep, StepRecap, SummaryStep } from './steps';

interface WizardProps {
  root: PackageListItem;
  options: RootSchemaOption[];
  defaultSchema: NginxSchema;
}

export const NginxOnboardingWizard: React.FC<WizardProps> = ({ root, options, defaultSchema }) => {
  const spaceSettings = useSpaceSettingsContext();
  const existingPolicies = useAllNonManagedAgentPolicies();

  const [schema, setSchema] = useState<NginxSchema>(defaultSchema);
  const [enabledStreams, setEnabledStreams] = useState<Record<NginxStreamId, boolean>>({
    access: true,
    error: true,
    metrics: true,
  });
  const [overrides, setOverrides] = useState<NginxOverrides>({});
  const [visited, setVisited] = useState<NginxStep[]>(['schema']);
  const [saved, setSaved] = useState<SavedPolicyResult>();

  const [policyMode, setPolicyMode] = useState<AgentPolicyMode>('new');
  const [existingPolicyId, setExistingPolicyId] = useState<string>();
  const [newAgentPolicy, setNewAgentPolicy] = useState<NewAgentPolicy>(
    generateNewAgentPolicyWithDefaults({
      name: 'Agent policy 1',
      namespace: spaceSettings.defaultNamespace,
    })
  );
  // Same default naming as the stock "New hosts" tab
  useEffect(() => {
    if (existingPolicies.length > 0) {
      setNewAgentPolicy((p) => ({ ...p, name: incrementPolicyName(existingPolicies) }));
      setExistingPolicyId((id) => id ?? existingPolicies[0].id);
    }
  }, [existingPolicies.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const steps = useMemo(() => getSteps(enabledStreams), [enabledStreams]);

  // The current step lives in `?step=` so browser back/forward moves between steps.
  const history = useHistory();
  const location = useLocation();
  const requestedStep = new URLSearchParams(location.search).get('step') as NginxStep | null;
  const step: NginxStep = saved
    ? 'summary'
    : requestedStep &&
      requestedStep !== 'summary' &&
      steps.includes(requestedStep) &&
      visited.includes(requestedStep)
    ? requestedStep
    : // Unknown, unvisited, or removed by unchecking a signal: last config step visited.
      [...steps].reverse().find((s) => s !== 'summary' && visited.includes(s)) ?? 'schema';

  const goTo = useCallback(
    (next: NginxStep, { replace = false }: { replace?: boolean } = {}) => {
      setVisited((v) => (v.includes(next) ? v : [...v, next]));
      const params = new URLSearchParams(location.search);
      params.set('step', next);
      const to = { ...location, search: `?${params.toString()}` };
      if (replace) history.replace(to);
      else history.push(to);
    },
    [history, location]
  );

  const option = options.find((o) => o.schema === schema);
  const childVersion = option ? getRootChildVersion(option) : undefined;

  return (
    <NginxWizardBody
      key={schema}
      root={root}
      schema={schema}
      defaultSchema={defaultSchema}
      onSchemaChange={setSchema}
      pkgName={option?.packageName}
      pkgVersion={childVersion}
      prerelease={option?.child?.release !== 'ga'}
      enabledStreams={enabledStreams}
      onStreamsChange={setEnabledStreams}
      overrides={overrides}
      onOverridesChange={(o) => setOverrides((prev) => ({ ...prev, ...o }))}
      steps={steps}
      step={step}
      visited={visited}
      goTo={goTo}
      saved={saved}
      onSaved={(result) => {
        setSaved(result);
        goTo('summary', { replace: true });
      }}
      policyMode={policyMode}
      onPolicyModeChange={setPolicyMode}
      newAgentPolicy={newAgentPolicy}
      setNewAgentPolicy={setNewAgentPolicy}
      existingPolicies={existingPolicies}
      existingPolicyId={existingPolicyId}
      onExistingPolicyChange={setExistingPolicyId}
    />
  );
};

interface BodyProps {
  root: PackageListItem;
  schema: NginxSchema;
  defaultSchema: NginxSchema;
  onSchemaChange: (schema: NginxSchema) => void;
  pkgName?: string;
  pkgVersion?: string;
  prerelease: boolean;
  enabledStreams: Record<NginxStreamId, boolean>;
  onStreamsChange: (streams: Record<NginxStreamId, boolean>) => void;
  overrides: NginxOverrides;
  onOverridesChange: (overrides: NginxOverrides) => void;
  steps: NginxStep[];
  step: NginxStep;
  visited: NginxStep[];
  goTo: (step: NginxStep) => void;
  saved?: SavedPolicyResult;
  onSaved: (result: SavedPolicyResult) => void;
  policyMode: AgentPolicyMode;
  onPolicyModeChange: (mode: AgentPolicyMode) => void;
  newAgentPolicy: NewAgentPolicy;
  setNewAgentPolicy: (policy: NewAgentPolicy) => void;
  existingPolicies: AgentPolicy[];
  existingPolicyId?: string;
  onExistingPolicyChange: (id: string) => void;
}

const NginxWizardBody: React.FC<BodyProps> = (props) => {
  const { schema, enabledStreams, steps, step, saved } = props;
  const { euiTheme } = useEuiTheme();
  const { application } = useStartServices();
  const { getHref, getPath } = useLink();
  const hasFleetAddAgentsPrivileges = useAuthz().fleet.addAgents;
  const [isDocModalOpen, setIsDocModalOpen] = useState(false);

  const { data: packageInfoData } = useGetPackageInfoByKeyQuery(
    props.pkgName ?? '',
    props.pkgVersion,
    { full: true, prerelease: props.prerelease },
    { enabled: !!props.pkgName }
  );
  const packageInfo = packageInfoData?.item;

  const selectedPolicyTab =
    props.policyMode === 'new' ? SelectedPolicyTab.NEW : SelectedPolicyTab.EXISTING;

  const {
    onSubmit,
    formState,
    packagePolicy,
    updatePackagePolicy,
    agentPolicies,
    updateAgentPolicies,
    savedPackagePolicy,
    navigateAddAgent,
    isInitialized,
  } = useOnSubmit({
    agentCount: 0,
    packageInfo,
    newAgentPolicy: props.newAgentPolicy,
    selectedPolicyTab,
    withSysMonitoring: true,
    queryParamsPolicyId: undefined,
    integrationToEnable: undefined,
    hasFleetAddAgentsPrivileges,
    setNewAgentPolicy: props.setNewAgentPolicy,
    setSelectedPolicyTab: () => {},
  });

  // Keep the hook's agent policy selection in sync with step 1.
  useEffect(() => {
    if (props.policyMode === 'new') {
      if (agentPolicies.length) updateAgentPolicies([]);
      return;
    }
    const policy = props.existingPolicies.find((p) => p.id === props.existingPolicyId);
    if (policy && agentPolicies[0]?.id !== policy.id) updateAgentPolicies([policy]);
  }, [
    props.policyMode,
    props.existingPolicyId,
    props.existingPolicies,
    agentPolicies,
    updateAgentPolicies,
  ]);

  // Map wizard values onto the child package policy.
  const values = useMemo(() => resolveValues(schema, props.overrides), [schema, props.overrides]);
  useEffect(() => {
    if (!isInitialized || !packagePolicy.inputs.length) return;
    const inputs = applyToInputs(packagePolicy.inputs, schema, enabledStreams, values);
    if (!isEqual(inputs, packagePolicy.inputs)) updatePackagePolicy({ inputs });
  }, [isInitialized, packagePolicy.inputs, schema, enabledStreams, values, updatePackagePolicy]);

  useEffect(() => {
    if (savedPackagePolicy && !saved) props.onSaved(savedPackagePolicy);
  }, [savedPackagePolicy, saved]); // eslint-disable-line react-hooks/exhaustive-deps

  const index = steps.indexOf(step);
  const nextStep = steps[index + 1];
  const prevStep = steps[index - 1];
  const anyStream = Object.values(enabledStreams).some(Boolean);
  const policyValid =
    props.policyMode === 'new' ? !!props.newAgentPolicy.name.trim() : !!props.existingPolicyId;
  const isSaving = formState === 'LOADING' && !saved;
  const canSave = !!packageInfo && isInitialized && formState === 'VALID' && policyValid;

  const childPkgkey = packageInfo ? `${packageInfo.name}-${packageInfo.version}` : '';
  const browseHref = getHref('integrations_all', {});
  const canStepBack = !!prevStep && !saved;
  const backLabel = canStepBack ? 'Previous step' : 'Back to integrations';

  const existingPolicyName = props.existingPolicies.find(
    (p) => p.id === props.existingPolicyId
  )?.name;

  const stepBody = (() => {
    switch (step) {
      case 'schema':
        return (
          <SchemaSignalsStep
            schema={schema}
            defaultSchema={props.defaultSchema}
            onSchemaChange={props.onSchemaChange}
            enabledStreams={enabledStreams}
            onStreamsChange={props.onStreamsChange}
            policyMode={props.policyMode}
            onPolicyModeChange={props.onPolicyModeChange}
            newPolicyName={props.newAgentPolicy.name}
            onNewPolicyNameChange={(name) =>
              props.setNewAgentPolicy({ ...props.newAgentPolicy, name })
            }
            existingPolicies={props.existingPolicies}
            existingPolicyId={props.existingPolicyId}
            onExistingPolicyChange={props.onExistingPolicyChange}
          />
        );
      case 'logs':
      case 'metrics': {
        const StepComponent = step === 'logs' ? LogsStep : MetricsStep;
        return (
          <StepComponent
            schema={schema}
            values={values}
            onChange={props.onOverridesChange}
            enabledStreams={enabledStreams}
            recap={
              <StepRecap
                schema={schema}
                policyLabel={
                  props.policyMode === 'new'
                    ? `New policy: ${props.newAgentPolicy.name}`
                    : `Policy: ${existingPolicyName ?? '-'}`
                }
                onEdit={() => props.goTo('schema')}
              />
            }
          />
        );
      }
      case 'summary':
        return (
          <SummaryStep
            schema={schema}
            pkgName={props.pkgName ?? ''}
            enabledStreams={enabledStreams}
            packagePolicyName={saved?.policy.name}
            agentPolicyName={
              props.policyMode === 'new' ? props.newAgentPolicy.name : existingPolicyName
            }
            onAddAgent={() => saved && navigateAddAgent(saved)}
            assetsHref={getHref('integration_details_assets', { pkgkey: childPkgkey })}
          />
        );
    }
  })();

  const footer = (() => {
    if (step === 'summary') {
      return (
        <EuiFlexGroup justifyContent="flexEnd" gutterSize="s" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiButton
              fill
              size="s"
              iconType="sortRight"
              iconSide="right"
              onClick={() =>
                application.navigateToApp(INTEGRATIONS_PLUGIN_ID, {
                  path: getPath('integration_details_policies', { pkgkey: childPkgkey }),
                })
              }
              data-test-subj="nginxWizardDone"
            >
              Take me to my integration
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      );
    }
    const isLastConfigStep = nextStep === 'summary';
    return (
      <EuiFlexGroup justifyContent="spaceBetween" alignItems="center" responsive={false}>
        <EuiFlexItem grow={false}>
          {prevStep && (
            <EuiButtonEmpty size="s" onClick={() => props.goTo(prevStep)} disabled={isSaving}>
              Back
            </EuiButtonEmpty>
          )}
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiFlexGroup gutterSize="m" alignItems="center" responsive={false}>
            {isLastConfigStep && formState === 'INVALID' && (
              <EuiFlexItem grow={false}>
                <EuiText size="xs" color="danger">
                  Fix the highlighted settings to continue.
                </EuiText>
              </EuiFlexItem>
            )}
            <EuiFlexItem grow={false}>
              {isLastConfigStep ? (
                <EuiButton
                  fill
                  size="s"
                  iconType="check"
                  isLoading={isSaving}
                  isDisabled={!canSave || isSaving}
                  onClick={() => onSubmit({ skipConfirmModal: true })}
                  data-test-subj="nginxWizardSave"
                >
                  Add Nginx
                </EuiButton>
              ) : (
                <EuiButton
                  fill
                  size="s"
                  iconType="sortRight"
                  iconSide="right"
                  isDisabled={!anyStream || (step === 'schema' && !policyValid)}
                  onClick={() => props.goTo(nextStep)}
                  data-test-subj="nginxWizardNext"
                >
                  {step === 'schema' ? "Let's go" : 'Next'}
                </EuiButton>
              )}
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  })();

  return (
    // Full-bleed white surface: the integrations app has no page template on this route, so the
    // grey app background would otherwise show through.
    <div
      data-test-subj="nginxOnboardingWizard"
      css={css({
        background: euiTheme.colors.backgroundBasePlain,
        minHeight: 'calc(100vh - var(--euiFixedHeadersOffset, 0px))',
      })}
    >
      <div
        css={css({
          maxWidth: 1440,
          margin: '0 auto',
          padding: `${euiTheme.size.l} ${euiTheme.size.xl} ${euiTheme.size.xl}`,
        })}
      >
        {/* Header */}
        <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiToolTip content={backLabel} disableScreenReaderOutput>
              <EuiButtonIcon
                iconType="sortLeft"
                size="xs"
                aria-label={backLabel}
                {...(canStepBack ? { onClick: () => props.goTo(prevStep) } : { href: browseHref })}
                data-test-subj="nginxWizardBack"
              />
            </EuiToolTip>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <div
              css={css({
                width: 32,
                height: 32,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: `1px solid ${euiTheme.colors.borderBaseSubdued}`,
                borderRadius: euiTheme.border.radius.frame,
              })}
            >
              <PackageIcon
                packageName={props.root.name}
                version={props.root.version}
                icons={props.root.icons}
                size="m"
              />
            </div>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiTitle size="m">
              <h1>{props.root.title}</h1>
            </EuiTitle>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiBadge color="hollow">Integration</EuiBadge>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiBadge color="hollow">Applications</EuiBadge>
          </EuiFlexItem>
          <EuiFlexItem />
          <EuiFlexItem grow={false}>
            <EuiButton
              size="s"
              color="text"
              iconType="external"
              iconSide="right"
              isDisabled={!packageInfo}
              onClick={() => setIsDocModalOpen(true)}
            >
              View documentation
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiText size="s" color="subdued" css={css({ marginTop: euiTheme.size.s })}>
          {/* PROTOTYPE: design copy, the root manifest description is shorter */}
          Collect access and error logs plus connection metrics from Nginx web servers.
        </EuiText>
        <EuiHorizontalRule margin="m" />

        {/* Rail + content */}
        <div css={css({ display: 'flex', gap: euiTheme.size.l, alignItems: 'flex-start' })}>
          <StepRail
            steps={steps}
            current={step}
            completed={(s) => !!saved || steps.indexOf(s) < index}
            canSelect={(s) => !saved && s !== 'summary' && props.visited.includes(s)}
            onSelect={props.goTo}
          />
          <div
            css={css({
              flex: 1,
              minWidth: 0,
              border: `1px solid ${euiTheme.colors.borderBaseSubdued}`,
              borderRadius: euiTheme.border.radius.panel,
              display: 'flex',
              flexDirection: 'column',
              minHeight: 560,
              background: euiTheme.colors.backgroundBasePlain,
            })}
          >
            <div css={css({ flex: 1, padding: euiTheme.size.l })}>{stepBody}</div>
            <div
              css={css({
                position: 'sticky',
                bottom: 0,
                padding: `${euiTheme.size.m} ${euiTheme.size.l}`,
                background: euiTheme.colors.backgroundBasePlain,
                borderTop: `1px solid ${euiTheme.colors.borderBaseSubdued}`,
                borderRadius: `0 0 ${euiTheme.border.radius.panel} ${euiTheme.border.radius.panel}`,
              })}
            >
              {footer}
            </div>
          </div>
        </div>

        {isDocModalOpen && packageInfo && (
          <PackageDocumentationModal
            packageInfo={packageInfo}
            onClose={() => setIsDocModalOpen(false)}
          />
        )}
      </div>
    </div>
  );
};
