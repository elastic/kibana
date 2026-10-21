/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// PROTOTYPE: generic onboarding wizard for any integration group (package with `schemas`), after
// the design team's Ingest Workbench prototype. Steps follow the design's install order (hub
// Design direction 3.4): what to collect (schema + signals) -> how (deployment method, hidden with
// a single method) -> settings per selected signal -> review (save) -> detect and review -> exit.
// Signals, streams and fields come from each child's package info (model.ts).
//
// State lives in GroupOnboardingWizard so it survives a schema switch: per-schema state (enabled
// streams, edited var values keyed by var path) plus deployment method, agent policy and
// integration name/namespace. The body is keyed by schema: it runs the stock
// create-package-policy hook (useOnSubmit) for that schema's child package, and the wizard state
// is applied on top of the stock package policy.

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
import { generateNewAgentPolicyWithDefaults } from '../../../../../../../../common/services/generate_new_agent_policy';
import { validationHasErrors } from '../../../../../../../../common/services';
import { SetupTechnology } from '../../../../../../../../common/types';
import { useOnSubmit } from '../../../../../../fleet/sections/agent_policy/create_package_policy_page/single_page_layout/hooks';
import { useAgentless } from '../../../../../../fleet/sections/agent_policy/create_package_policy_page/single_page_layout/hooks/setup_technology';
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
  COLLECT_STEP,
  DETECT_STEP,
  HOW_STEP,
  REVIEW_STEP,
  applySchemaState,
  buildSchemaModel,
  carryOverSchemaState,
  emptySchemaState,
  getDatasetVarValue,
  getDeploymentMethods,
  getEnabledSignals,
  getEnabledStreams,
  getInstallSummary,
  getSignalInfo,
  getSteps,
  getTargetDataset,
  isSignalStep,
  resolveDefaultSchema,
} from './model';
import { StepRail } from './primitives';
import type { AgentPolicyMode, SchemaChoice } from './steps';
import {
  AgentPolicySection,
  CollectStep,
  HowStep,
  IntegrationSettingsSection,
  ReviewStep,
  SignalStep,
  StepRecap,
  getStepVars,
} from './steps';
import { DetectStep } from './detect_step';
import type { VarFieldContext } from './var_fields';
import { countVarErrors } from './var_fields';

/** What the wizard hands back to its host when the user leaves. */
export interface GroupWizardExitResult {
  /** 'done': left from the last step. 'cancel': left before adding the integration. */
  reason: 'done' | 'cancel';
  /** Set once the integration was added. */
  saved?: SavedPolicyResult;
  schema: string;
  packageName?: string;
  packageVersion?: string;
}

/**
 * PROTOTYPE: host contract. The route renders it as a full page with URL step state; an embedding
 * host (browse modal today, Streams "+ Source" or observability onboarding later) renders it
 * `embedded` with local step state and owns the exit.
 */
export interface GroupWizardHostProps {
  /** 'url': step in `?step=` (browser back works). 'local': component state, no URL changes. */
  stepState?: 'url' | 'local';
  /** 'page': full-bleed page with its own header. 'embedded': fills the host container. */
  layout?: 'page' | 'embedded';
  /** Label of the exit button on the last step, declared by the host. */
  exitLabel?: string;
  /** Called on exit. The wizard never navigates on its own when exiting. */
  onExit: (result: GroupWizardExitResult) => void;
  /** Called right after the integration is added (before the user exits). */
  onSaved?: (result: SavedPolicyResult) => void;
}

interface WizardProps extends GroupWizardHostProps {
  group: PackageListItem;
  options: GroupSchemaOption[];
}

/** Current step + navigation, either in the URL (`?step=`) or in local state. */
const useStepState = (mode: 'url' | 'local') => {
  const history = useHistory();
  const location = useLocation();
  const [localStep, setLocalStep] = useState<string | null>(null);
  const requestedStep =
    mode === 'url' ? new URLSearchParams(location.search).get('step') : localStep;
  const navigate = useCallback(
    (next: WizardStep, replace: boolean) => {
      if (mode === 'local') {
        setLocalStep(next);
        return;
      }
      const params = new URLSearchParams(location.search);
      params.set('step', next);
      const to = { ...location, search: `?${params.toString()}` };
      if (replace) history.replace(to);
      else history.push(to);
    },
    [mode, history, location]
  );
  return { requestedStep, navigate };
};

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

/**
 * Solution the user is in: serverless project type, else the active space's solution view
 * (`oblt`, `security`, `es`, `classic`). `isResolved` turns true once the space has loaded.
 */
export const useActiveSolution = () => {
  const { cloud, spaces } = useStartServices();
  const projectType = cloud?.serverless?.projectType;
  const [space, setSpace] = useState<{ solution?: string; resolved: boolean }>({
    resolved: !!projectType || !spaces,
  });
  useEffect(() => {
    if (projectType || !spaces) return;
    let cancelled = false;
    Promise.resolve(spaces.getActiveSpace())
      .then((s) => !cancelled && setSpace({ solution: s?.solution, resolved: true }))
      .catch(() => !cancelled && setSpace({ resolved: true }));
    return () => {
      cancelled = true;
    };
  }, [projectType, spaces]);
  return { solution: projectType ?? space.solution, isResolved: space.resolved };
};

export const GroupOnboardingWizard: React.FC<WizardProps> = ({
  group,
  options,
  stepState = 'url',
  layout = 'page',
  exitLabel = 'Done',
  onExit,
  onSaved,
}) => {
  const spaceSettings = useSpaceSettingsContext();
  const existingPolicies = useAllNonManagedAgentPolicies();
  const { isAgentlessEnabled } = useAgentless();
  const packages = useSchemaPackages(options);

  // Default schema by solution (Nima): Observability -> otel, Security -> ecs, when the group has
  // it; else the manifest's `default: true`; else the first schema.
  const { solution, isResolved: isSolutionResolved } = useActiveSolution();
  const defaultSchema = useMemo(
    () =>
      resolveDefaultSchema(
        Object.fromEntries(options.map((o) => [o.schema, group.schemas?.[o.schema]])),
        solution
      ),
    [group.schemas, options, solution]
  );
  const [schema, setSchema] = useState<string>(defaultSchema ?? options[0].schema);
  const userPickedSchema = useRef(false);
  useEffect(() => {
    if (isSolutionResolved && !userPickedSchema.current && defaultSchema) setSchema(defaultSchema);
  }, [defaultSchema, isSolutionResolved]);

  const [schemaStates, setSchemaStates] = useState<Record<string, SchemaState>>({});
  const [policyOverrides, setPolicyOverrides] = useState<PolicyOverrides>({});
  const [lastSwitch, setLastSwitch] = useState<{
    from: string;
    to: string;
    report: CarryOverReport;
  }>();
  const [visited, setVisited] = useState<WizardStep[]>([COLLECT_STEP]);
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

  // "How" only shows when the child offers more than one deployment method.
  const methods = getDeploymentMethods(model, isAgentlessEnabled);
  const showHow = methods.length > 1;
  const [pickedMethod, setPickedMethod] = useState<SetupTechnology>();
  const method = pickedMethod && methods.includes(pickedMethod) ? pickedMethod : methods[0];

  const steps = useMemo(() => getSteps(model, state, { showHow }), [model, state, showHow]);

  const updateState = useCallback(
    (fn: (s: SchemaState) => SchemaState) =>
      setSchemaStates((prev) => ({ ...prev, [schema]: fn(prev[schema] ?? emptySchemaState()) })),
    [schema]
  );

  const onSchemaChange = (next: string) => {
    if (next === schema) return;
    userPickedSchema.current = true;
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

  // Page: the current step lives in `?step=` so browser back/forward moves between steps.
  // Embedded: local state, the host's URL is left alone.
  const { requestedStep, navigate } = useStepState(stepState);
  const step: WizardStep = saved
    ? DETECT_STEP
    : requestedStep &&
      requestedStep !== DETECT_STEP &&
      steps.includes(requestedStep) &&
      visited.includes(requestedStep)
    ? requestedStep
    : // Unknown, unvisited, or removed by unchecking a signal: last step visited.
      [...steps].reverse().find((s) => s !== DETECT_STEP && visited.includes(s)) ?? COLLECT_STEP;

  const goTo = useCallback(
    (next: WizardStep, { replace = false }: { replace?: boolean } = {}) => {
      setVisited((v) => (v.includes(next) ? v : [...v, next]));
      navigate(next, replace);
    },
    [navigate]
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
      methods={methods}
      method={method}
      onMethodChange={setPickedMethod}
      showHow={showHow}
      steps={steps}
      step={step}
      visited={visited}
      goTo={goTo}
      saved={saved}
      onSaved={(result) => {
        setSaved(result);
        goTo(DETECT_STEP, { replace: true });
        onSaved?.(result);
      }}
      layout={layout}
      exitLabel={exitLabel}
      onExit={(reason) =>
        onExit({
          reason,
          saved,
          schema,
          packageName: packages[schema]?.packageInfo?.name,
          packageVersion: packages[schema]?.packageInfo?.version,
        })
      }
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
  methods: SetupTechnology[];
  method: SetupTechnology;
  onMethodChange: (method: SetupTechnology) => void;
  showHow: boolean;
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
  layout: 'page' | 'embedded';
  exitLabel: string;
  onExit: (reason: GroupWizardExitResult['reason']) => void;
}

const GroupWizardBody: React.FC<BodyProps> = (props) => {
  const { schema, model, state, steps, step, saved, packageInfo, group } = props;
  const { euiTheme } = useEuiTheme();
  const { getHref } = useLink();
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
    selectedSetupTechnology,
    handleSetupTechnologyChange,
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

  // Keep the hook's deployment method in sync with the "how" step.
  useEffect(() => {
    if (props.showHow && selectedSetupTechnology !== props.method) {
      handleSetupTechnologyChange(props.method);
    }
  }, [props.showHow, props.method, selectedSetupTechnology, handleSetupTechnologyChange]);

  // Keep the hook's agent policy selection in sync with the wizard.
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
  const enabledStreams = model ? getEnabledStreams(model, state) : [];
  const assetsOnly = !!model && enabledStreams.length === 0;
  const isAgentless = props.method === SetupTechnology.AGENTLESS;
  const policyValid =
    isAgentless ||
    (props.policyMode === 'new' ? !!props.newAgentPolicy.name.trim() : !!props.existingPolicyId);
  const isSaving = formState === 'LOADING' && !saved;
  const hasErrors = validationResults ? validationHasErrors(validationResults) : false;
  const canSave = !!packageInfo && isInitialized && !isSaving;
  // Agent policy goes on "how" when that step shows, else on review.
  const agentPolicyStep = props.showHow ? HOW_STEP : REVIEW_STEP;

  const stepHasErrors = (s: WizardStep) => {
    if (!model || !ctx) return false;
    if (s === agentPolicyStep && !policyValid) return true;
    if (s === REVIEW_STEP) {
      return !!validationResults?.name?.length || !!validationResults?.namespace?.length;
    }
    if (!isSignalStep(s)) return false;
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
    const firstWithErrors = steps.find(stepHasErrors);
    if (hasErrors || firstWithErrors) {
      setShowErrors(true);
      if (firstWithErrors && firstWithErrors !== step) props.goTo(firstWithErrors);
      return;
    }
    onSubmit({ skipConfirmModal: true });
  };

  const childPkgkey = packageInfo ? `${packageInfo.name}-${packageInfo.version}` : '';
  const canStepBack = !!prevStep && !saved;
  const backLabel = canStepBack ? 'Previous step' : 'Back to integrations';
  const isEmbedded = props.layout === 'embedded';

  const existingPolicyName = props.existingPolicies.find(
    (p) => p.id === props.existingPolicyId
  )?.name;
  const agentPolicyName =
    props.policyMode === 'new' ? props.newAgentPolicy.name : existingPolicyName;
  const savedAgentPolicyId =
    saved?.type === 'packagePolicy' ? saved.policy.policy_ids?.[0] : undefined;

  const groupIcon = (
    <PackageIcon packageName={group.name} version={group.version} icons={group.icons} size="m" />
  );

  const agentPolicySection = (
    <AgentPolicySection
      title={group.title}
      policyMode={props.policyMode}
      onPolicyModeChange={props.onPolicyModeChange}
      newPolicyName={props.newAgentPolicy.name}
      onNewPolicyNameChange={(name) => props.setNewAgentPolicy((p) => ({ ...p, name }))}
      existingPolicies={props.existingPolicies}
      existingPolicyId={props.existingPolicyId}
      onExistingPolicyChange={props.onExistingPolicyChange}
    />
  );

  const recap = (
    <StepRecap
      schema={schema}
      detail={
        model
          ? getEnabledSignals(model, state)
              .map((s) => getSignalInfo(s).title)
              .join(', ')
          : undefined
      }
      onEdit={() => props.goTo(COLLECT_STEP)}
    />
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
    if (step === COLLECT_STEP) {
      return (
        <CollectStep
          title={group.title}
          schemas={props.schemaChoices}
          schema={schema}
          defaultSchema={props.defaultSchema}
          onSchemaChange={props.onSchemaChange}
          lastSwitch={props.lastSwitch}
          model={model}
          state={state}
          onStreamsChange={props.onStreamsChange}
        />
      );
    }
    if (step === HOW_STEP) {
      return (
        <HowStep
          methods={props.methods}
          method={props.method}
          onMethodChange={props.onMethodChange}
          agentPolicySection={agentPolicySection}
        />
      );
    }
    if (step === DETECT_STEP) {
      return (
        <DetectStep
          title={group.title}
          schema={schema}
          pkgName={props.pkgName ?? ''}
          rows={
            model
              ? enabledStreams.map((stream) => ({
                  stream,
                  dataset: getTargetDataset(
                    stream,
                    getDatasetVarValue(packagePolicy, model, stream)
                  ),
                }))
              : []
          }
          packagePolicy={saved?.type === 'packagePolicy' ? saved.policy : undefined}
          isAgentless={saved?.type === 'agentless'}
          agentPolicyId={savedAgentPolicyId}
          agentPolicyName={agentPolicyName}
          onAddAgent={() => saved && navigateAddAgent(saved)}
          assetsHref={getHref('integration_details_assets', { pkgkey: childPkgkey })}
        />
      );
    }
    if (!model || !ctx) return null;
    if (step === REVIEW_STEP) {
      return (
        <ReviewStep
          title={group.title}
          schema={schema}
          model={model}
          state={state}
          packagePolicy={packagePolicy}
          installSummary={packageInfo ? getInstallSummary(packageInfo) : undefined}
          method={props.method}
          showMethod={props.showHow}
          agentPolicySection={!props.showHow ? agentPolicySection : undefined}
          agentPolicyLabel={
            props.showHow && !isAgentless
              ? props.policyMode === 'new'
                ? `New: ${props.newAgentPolicy.name}`
                : existingPolicyName
              : undefined
          }
          integrationSettings={
            <IntegrationSettingsSection
              packagePolicy={packagePolicy}
              validationResults={validationResults}
              onPolicyFieldChange={props.onPolicyFieldChange}
            />
          }
          onEdit={props.goTo}
        />
      );
    }
    return (
      <SignalStep
        signal={step}
        groupTitle={group.title}
        model={model}
        state={state}
        ctx={ctx}
        icon={groupIcon}
        recap={recap}
      />
    );
  })();

  const footer = (() => {
    if (step === DETECT_STEP) {
      return (
        <EuiFlexGroup justifyContent="flexEnd" gutterSize="s" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiButton
              fill
              size="s"
              iconType="sortRight"
              iconSide="right"
              onClick={() => props.onExit('done')}
              data-test-subj="groupWizardDone"
            >
              {props.exitLabel}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      );
    }
    const isReview = step === REVIEW_STEP;
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
            {showErrors && (isReview ? hasErrors || stepHasErrors(step) : stepHasErrors(step)) && (
              <EuiFlexItem grow={false}>
                <EuiText size="xs" color="danger">
                  Fix the highlighted settings to continue.
                </EuiText>
              </EuiFlexItem>
            )}
            <EuiFlexItem grow={false}>
              {isReview ? (
                <EuiButton
                  fill
                  size="s"
                  iconType="check"
                  isLoading={isSaving}
                  isDisabled={!canSave}
                  onClick={onSave}
                  data-test-subj="groupWizardSave"
                >
                  {assetsOnly ? 'Install assets only' : `Add ${group.title}`}
                </EuiButton>
              ) : (
                <EuiButton
                  fill
                  size="s"
                  iconType="sortRight"
                  iconSide="right"
                  isDisabled={!model}
                  onClick={onNext}
                  data-test-subj="groupWizardNext"
                >
                  {step === COLLECT_STEP ? "Let's go" : 'Next'}
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
        minHeight: isEmbedded ? undefined : 'calc(100vh - var(--euiFixedHeadersOffset, 0px))',
      })}
    >
      <div
        css={css(
          isEmbedded
            ? {}
            : {
                maxWidth: 1440,
                margin: '0 auto',
                padding: `${euiTheme.size.l} ${euiTheme.size.xl} ${euiTheme.size.xl}`,
              }
        )}
      >
        {/* Header: page only, an embedding host renders its own (title, close). */}
        {!isEmbedded && (
          <>
            <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiToolTip content={backLabel} disableScreenReaderOutput>
                  <EuiButtonIcon
                    iconType="sortLeft"
                    size="xs"
                    aria-label={backLabel}
                    onClick={() =>
                      canStepBack ? props.goTo(prevStep) : props.onExit(saved ? 'done' : 'cancel')
                    }
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
          </>
        )}

        {isEmbedded && (
          <EuiFlexGroup justifyContent="flexEnd" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                size="xs"
                iconType="documentation"
                isDisabled={!packageInfo}
                onClick={() => setIsDocModalOpen(true)}
              >
                View documentation
              </EuiButtonEmpty>
            </EuiFlexItem>
          </EuiFlexGroup>
        )}

        {/* Rail + content */}
        <div css={css({ display: 'flex', gap: euiTheme.size.l, alignItems: 'flex-start' })}>
          <StepRail
            steps={steps}
            current={step}
            completed={(s) => !!saved || steps.indexOf(s) < index}
            canSelect={(s) => !saved && s !== DETECT_STEP && props.visited.includes(s)}
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
