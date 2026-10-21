/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// PROTOTYPE: generic onboarding wizard for any integration group (package with `schemas`), after
// the design team's Ingest Workbench prototype. Step 1 picks schema, signals and agent policy; one
// step per selected signal configures its streams; saving installs the schema's child package and
// moves to a summary. Signals, streams and fields come from each child's package info (model.ts).
//
// State lives in GroupOnboardingWizard so it survives a schema switch: per-schema state (enabled
// streams, edited var values keyed by var path) plus policy name/namespace and agent policy. The
// body is keyed by schema: it runs the stock create-package-policy hook (useOnSubmit) for that
// schema's child package, and the wizard state is applied on top of the stock package policy.

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { css } from '@emotion/react';
import { useHistory, useLocation } from 'react-router-dom';
import { useQueries } from '@kbn/react-query';
import {
  EuiBadge,
  EuiButton,
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiText,
  EuiTitle,
  EuiToolTip,
  useEuiTheme,
} from '@elastic/eui';

import type {
  AgentPolicy,
  NewAgentPolicy,
  PackageInfo,
  PackageListItem,
} from '../../../../../../../types';
import {
  sendGetPackageInfoByKeyForRq,
  useAuthz,
  useLink,
  useStartServices,
} from '../../../../../../../hooks';
import { useSpaceSettingsContext } from '../../../../../../../hooks/use_space_settings_context';
import { incrementPolicyName } from '../../../../../../../services';
import type { GroupSchemaOption } from '../../../../../../../hooks/use_group_package';
import { PackageIcon } from '../../../../../../../components';
import { INTEGRATIONS_PLUGIN_ID } from '../../../../../../../constants';
import { generateNewAgentPolicyWithDefaults } from '../../../../../../../../common/services/generate_new_agent_policy';
import { validationHasErrors } from '../../../../../../../../common/services';
import { useOnSubmit } from '../../../../../../fleet/sections/agent_policy/create_package_policy_page/single_page_layout/hooks';
import { PackageDocumentationModal } from '../../../../../../fleet/sections/agent_policy/create_package_policy_page/single_page_layout/components';
import { SelectedPolicyTab } from '../../../../../../fleet/sections/agent_policy/create_package_policy_page/components';
import { useAllNonManagedAgentPolicies } from '../../../../../../fleet/sections/agent_policy/create_package_policy_page/components/steps/components/use_policies';
import type { SavedPolicyResult } from '../../../../../../fleet/sections/agent_policy/create_package_policy_page/types';
import { getGroupChildVersion } from '../schema_toggle';

import type {
  CarryOverReport,
  PolicyOverrides,
  SchemaModel,
  SchemaState,
  WizardStep,
} from './model';
import {
  SCHEMA_STEP,
  SUMMARY_STEP,
  applySchemaState,
  buildSchemaModel,
  carryOverSchemaState,
  emptySchemaState,
  getDatasetVarValue,
  getEnabledStreams,
  getSteps,
  getTargetDataset,
} from './model';
import { StepRail } from './primitives';
import type { AgentPolicyMode, SchemaChoice } from './steps';
import { SchemaSignalsStep, SignalStep, StepRecap, SummaryStep, getStepVars } from './steps';
import type { VarFieldContext } from './var_fields';
import { countVarErrors } from './var_fields';

interface WizardProps {
  group: PackageListItem;
  options: GroupSchemaOption[];
  defaultSchema?: string;
}

const EMPTY_STATE = emptySchemaState();

interface SchemaPackage {
  packageInfo?: PackageInfo;
  model?: SchemaModel;
  isLoading: boolean;
  error: unknown;
}

/** Full package info (archive-backed, like the stock create page) for every schema's child. */
const useSchemaPackages = (options: GroupSchemaOption[]): Record<string, SchemaPackage> => {
  const results = useQueries({
    queries: options.map((option) => {
      const version = getGroupChildVersion(option);
      const queryOptions = { full: true, prerelease: option.child?.release !== 'ga' };
      return {
        // Same key as useGetPackageInfoByKeyQuery, so the cache is shared with the stock pages.
        queryKey: [option.packageName, version, queryOptions],
        queryFn: () => sendGetPackageInfoByKeyForRq(option.packageName, version, queryOptions),
        enabled: !!version,
        refetchOnWindowFocus: false,
      };
    }),
  });
  // Build each model once per package info object, so references stay stable across renders.
  const cache = useRef(new Map<PackageInfo, SchemaModel>());
  return Object.fromEntries(
    options.map((option, i) => {
      const packageInfo = results[i]?.data?.item;
      let model: SchemaModel | undefined;
      if (packageInfo) {
        model = cache.current.get(packageInfo) ?? buildSchemaModel(packageInfo);
        cache.current.set(packageInfo, model);
      }
      return [
        option.schema,
        { packageInfo, model, isLoading: !!results[i]?.isLoading, error: results[i]?.error },
      ];
    })
  );
};

export const GroupOnboardingWizard: React.FC<WizardProps> = ({ group, options, defaultSchema }) => {
  const spaceSettings = useSpaceSettingsContext();
  const existingPolicies = useAllNonManagedAgentPolicies();
  const packages = useSchemaPackages(options);

  const [schema, setSchema] = useState<string>(
    () =>
      options.find((o) => o.schema === defaultSchema && o.child)?.schema ??
      options.find((o) => o.child)?.schema ??
      options[0].schema
  );
  const [schemaStates, setSchemaStates] = useState<Record<string, SchemaState>>({});
  const [policyOverrides, setPolicyOverrides] = useState<PolicyOverrides>({});
  const [lastSwitch, setLastSwitch] = useState<{
    from: string;
    to: string;
    report: CarryOverReport;
  }>();
  const [visited, setVisited] = useState<WizardStep[]>([SCHEMA_STEP]);
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

  const model = packages[schema]?.model;
  const state = schemaStates[schema] ?? EMPTY_STATE;
  const steps = useMemo(() => getSteps(model, state), [model, state]);

  const updateState = useCallback(
    (fn: (s: SchemaState) => SchemaState) =>
      setSchemaStates((prev) => ({ ...prev, [schema]: fn(prev[schema] ?? emptySchemaState()) })),
    [schema]
  );

  const onSchemaChange = (next: string) => {
    if (next === schema) return;
    const fromModel = packages[schema]?.model;
    const toModel = packages[next]?.model;
    if (fromModel && toModel) {
      const result = carryOverSchemaState(
        { model: fromModel, state },
        { model: toModel, state: schemaStates[next] }
      );
      setSchemaStates((prev) => ({ ...prev, [next]: result.state }));
      setLastSwitch({ from: schema, to: next, report: result.report });
    }
    setSchema(next);
  };

  // The current step lives in `?step=` so browser back/forward moves between steps.
  const history = useHistory();
  const location = useLocation();
  const requestedStep = new URLSearchParams(location.search).get('step');
  const step: WizardStep = saved
    ? SUMMARY_STEP
    : requestedStep &&
      requestedStep !== SUMMARY_STEP &&
      steps.includes(requestedStep) &&
      visited.includes(requestedStep)
    ? requestedStep
    : // Unknown, unvisited, or removed by unchecking a signal: last config step visited.
      [...steps].reverse().find((s) => s !== SUMMARY_STEP && visited.includes(s)) ?? SCHEMA_STEP;

  const goTo = useCallback(
    (next: WizardStep, { replace = false }: { replace?: boolean } = {}) => {
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
  const schemaChoices: SchemaChoice[] = options.map((o) => ({
    schema: o.schema,
    isReady: !!packages[o.schema]?.model,
    signals: packages[o.schema]?.model?.signals,
  }));

  return (
    <GroupWizardBody
      key={schema}
      group={group}
      schema={schema}
      defaultSchema={defaultSchema}
      schemaChoices={schemaChoices}
      onSchemaChange={onSchemaChange}
      lastSwitch={lastSwitch}
      pkgName={option?.packageName}
      packageInfo={packages[schema]?.packageInfo}
      packageInfoError={packages[schema]?.error}
      model={model}
      state={state}
      onStreamsChange={(enabled) =>
        updateState((s) => ({ ...s, enabled: { ...s.enabled, ...enabled } }))
      }
      onValueChange={(path, value) =>
        updateState((s) => ({ ...s, values: { ...s.values, [path]: value } }))
      }
      onVarGroupChange={(scopeKey, groupName, optionName) =>
        updateState((s) => ({
          ...s,
          varGroupSelections: {
            ...s.varGroupSelections,
            [scopeKey]: { ...s.varGroupSelections[scopeKey], [groupName]: optionName },
          },
        }))
      }
      policyOverrides={policyOverrides}
      onPolicyFieldChange={(field, value) => setPolicyOverrides((p) => ({ ...p, [field]: value }))}
      steps={steps}
      step={step}
      visited={visited}
      goTo={goTo}
      saved={saved}
      onSaved={(result) => {
        setSaved(result);
        goTo(SUMMARY_STEP, { replace: true });
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
  group: PackageListItem;
  schema: string;
  defaultSchema?: string;
  schemaChoices: SchemaChoice[];
  onSchemaChange: (schema: string) => void;
  lastSwitch?: { from: string; to: string; report: CarryOverReport };
  pkgName?: string;
  packageInfo?: PackageInfo;
  packageInfoError?: unknown;
  model?: SchemaModel;
  state: SchemaState;
  onStreamsChange: (enabled: Record<string, boolean>) => void;
  onValueChange: (path: string, value: unknown) => void;
  onVarGroupChange: (scopeKey: string, groupName: string, optionName: string) => void;
  policyOverrides: PolicyOverrides;
  onPolicyFieldChange: (field: 'name' | 'namespace', value: string) => void;
  steps: WizardStep[];
  step: WizardStep;
  visited: WizardStep[];
  goTo: (step: WizardStep) => void;
  saved?: SavedPolicyResult;
  onSaved: (result: SavedPolicyResult) => void;
  policyMode: AgentPolicyMode;
  onPolicyModeChange: (mode: AgentPolicyMode) => void;
  newAgentPolicy: NewAgentPolicy;
  setNewAgentPolicy: React.Dispatch<React.SetStateAction<NewAgentPolicy>>;
  existingPolicies: AgentPolicy[];
  existingPolicyId?: string;
  onExistingPolicyChange: (id: string) => void;
}

const GroupWizardBody: React.FC<BodyProps> = (props) => {
  const { schema, model, state, steps, step, saved, packageInfo, group } = props;
  const { euiTheme } = useEuiTheme();
  const { application } = useStartServices();
  const { getHref, getPath } = useLink();
  const hasFleetAddAgentsPrivileges = useAuthz().fleet.addAgents;
  const [isDocModalOpen, setIsDocModalOpen] = useState(false);
  const [showErrors, setShowErrors] = useState(false);

  const selectedPolicyTab =
    props.policyMode === 'new' ? SelectedPolicyTab.NEW : SelectedPolicyTab.EXISTING;

  const {
    onSubmit,
    formState,
    packagePolicy,
    updatePackagePolicy,
    validationResults,
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

  // Apply wizard state (enabled streams, edited vars, name/namespace) onto the stock package policy.
  useEffect(() => {
    if (!isInitialized || !model || !packagePolicy.package) return;
    const update = applySchemaState(packagePolicy, model, state, props.policyOverrides);
    if (update) updatePackagePolicy(update);
  }, [isInitialized, model, packagePolicy, state, props.policyOverrides, updatePackagePolicy]);

  useEffect(() => {
    if (savedPackagePolicy && !saved) props.onSaved(savedPackagePolicy);
  }, [savedPackagePolicy, saved]); // eslint-disable-line react-hooks/exhaustive-deps

  const ctx: VarFieldContext | undefined = model && {
    model,
    packagePolicy,
    validationResults,
    showErrors,
    onChange: props.onValueChange,
    onVarGroupChange: props.onVarGroupChange,
  };

  const index = steps.indexOf(step);
  const nextStep = steps[index + 1];
  const prevStep = steps[index - 1];
  const anyStream = model ? getEnabledStreams(model, state).length > 0 : false;
  const policyValid =
    props.policyMode === 'new' ? !!props.newAgentPolicy.name.trim() : !!props.existingPolicyId;
  const isSaving = formState === 'LOADING' && !saved;
  const hasErrors = validationResults ? validationHasErrors(validationResults) : false;
  const canSave = !!packageInfo && isInitialized && policyValid && !isSaving;

  const stepHasErrors = (s: WizardStep) => {
    if (!model || !ctx) return false;
    if (s === SCHEMA_STEP) {
      return !!validationResults?.name?.length || !!validationResults?.namespace?.length;
    }
    if (s === SUMMARY_STEP) return false;
    return countVarErrors(getStepVars(model, state, s).all, ctx) > 0;
  };
  const onNext = () => {
    if (stepHasErrors(step)) {
      setShowErrors(true);
      return;
    }
    props.goTo(nextStep);
  };
  const onSave = () => {
    if (hasErrors) {
      setShowErrors(true);
      const firstWithErrors = steps.find(stepHasErrors);
      if (firstWithErrors && firstWithErrors !== step) props.goTo(firstWithErrors);
      return;
    }
    onSubmit({ skipConfirmModal: true });
  };

  const childPkgkey = packageInfo ? `${packageInfo.name}-${packageInfo.version}` : '';
  const browseHref = getHref('integrations_all', {});
  const canStepBack = !!prevStep && !saved;
  const backLabel = canStepBack ? 'Previous step' : 'Back to integrations';

  const existingPolicyName = props.existingPolicies.find(
    (p) => p.id === props.existingPolicyId
  )?.name;
  const agentPolicyName =
    props.policyMode === 'new' ? props.newAgentPolicy.name : existingPolicyName;

  const groupIcon = (
    <PackageIcon packageName={group.name} version={group.version} icons={group.icons} size="m" />
  );

  const stepBody = (() => {
    if (props.packageInfoError) {
      return (
        <EuiCallOut
          announceOnMount
          color="danger"
          iconType="error"
          title={`Couldn't load ${props.pkgName ?? 'the integration'} for this schema`}
        />
      );
    }
    if (step === SCHEMA_STEP) {
      return (
        <SchemaSignalsStep
          groupTitle={group.title}
          schemas={props.schemaChoices}
          schema={schema}
          defaultSchema={props.defaultSchema}
          onSchemaChange={props.onSchemaChange}
          lastSwitch={props.lastSwitch}
          model={model}
          state={state}
          onStreamsChange={props.onStreamsChange}
          policyMode={props.policyMode}
          onPolicyModeChange={props.onPolicyModeChange}
          newPolicyName={props.newAgentPolicy.name}
          onNewPolicyNameChange={(name) => props.setNewAgentPolicy((p) => ({ ...p, name }))}
          existingPolicies={props.existingPolicies}
          existingPolicyId={props.existingPolicyId}
          onExistingPolicyChange={props.onExistingPolicyChange}
          packagePolicy={packagePolicy}
          validationResults={validationResults}
          onPolicyFieldChange={props.onPolicyFieldChange}
        />
      );
    }
    if (step === SUMMARY_STEP) {
      return (
        <SummaryStep
          schema={schema}
          groupTitle={group.title}
          pkgName={props.pkgName ?? ''}
          streams={
            model
              ? getEnabledStreams(model, state).map((stream) => ({
                  stream,
                  dataset: getTargetDataset(
                    stream,
                    getDatasetVarValue(packagePolicy, model, stream)
                  ),
                }))
              : []
          }
          packagePolicyName={saved?.policy.name}
          agentPolicyName={agentPolicyName}
          onAddAgent={() => saved && navigateAddAgent(saved)}
          assetsHref={getHref('integration_details_assets', { pkgkey: childPkgkey })}
        />
      );
    }
    if (!model || !ctx) return null;
    return (
      <SignalStep
        signal={step}
        groupTitle={group.title}
        model={model}
        state={state}
        ctx={ctx}
        icon={groupIcon}
        recap={
          <StepRecap
            schema={schema}
            policyLabel={
              props.policyMode === 'new'
                ? `New policy: ${props.newAgentPolicy.name}`
                : `Policy: ${existingPolicyName ?? '-'}`
            }
            onEdit={() => props.goTo(SCHEMA_STEP)}
          />
        }
      />
    );
  })();

  const footer = (() => {
    if (step === SUMMARY_STEP) {
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
              data-test-subj="groupWizardDone"
            >
              Take me to my integration
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      );
    }
    const isLastConfigStep = nextStep === SUMMARY_STEP;
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
            {showErrors && (isLastConfigStep ? hasErrors : stepHasErrors(step)) && (
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
                  isDisabled={!canSave || !anyStream}
                  onClick={onSave}
                  data-test-subj="groupWizardSave"
                >
                  Add {group.title}
                </EuiButton>
              ) : (
                <EuiButton
                  fill
                  size="s"
                  iconType="sortRight"
                  iconSide="right"
                  isDisabled={!anyStream || (step === SCHEMA_STEP && !policyValid)}
                  onClick={onNext}
                  data-test-subj="groupWizardNext"
                >
                  {step === SCHEMA_STEP ? "Let's go" : 'Next'}
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
      data-test-subj="groupOnboardingWizard"
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
                data-test-subj="groupWizardBack"
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
              {groupIcon}
            </div>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiTitle size="m">
              <h1>{group.title}</h1>
            </EuiTitle>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiBadge color="hollow">Integration</EuiBadge>
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
          {group.description}
        </EuiText>
        <EuiHorizontalRule margin="m" />

        {/* Rail + content */}
        <div css={css({ display: 'flex', gap: euiTheme.size.l, alignItems: 'flex-start' })}>
          <StepRail
            steps={steps}
            current={step}
            completed={(s) => !!saved || steps.indexOf(s) < index}
            canSelect={(s) => !saved && s !== SUMMARY_STEP && props.visited.includes(s)}
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
