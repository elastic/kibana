/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// PROTOTYPE: generic onboarding wizard for any integration group (registry `GET /groups`), after
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
  IntegrationGroup,
  NewAgentPolicy,
  PackageInfo,
} from '../../../../../../../types';
import {
  sendGetPackageInfoByKeyForRq,
  sendInstallPackage,
  useAuthz,
  useLink,
  useStartServices,
} from '../../../../../../../hooks';
import { useSpaceSettingsContext } from '../../../../../../../hooks/use_space_settings_context';
import { incrementPolicyName } from '../../../../../../../services';
import type { GroupMemberOption } from '../../../../../../../hooks/use_group_package';
import {
  getDefaultMemberOption,
  getGroupChildVersion,
  getMemberInfoQueryOptions,
} from '../../../../../../../hooks/use_group_package';
import { GroupIcon } from '../group_icon';
import { generateNewAgentPolicyWithDefaults } from '../../../../../../../../common/services/generate_new_agent_policy';
import { getGroupSchemas, validationHasErrors } from '../../../../../../../../common/services';
import { SetupTechnology } from '../../../../../../../../common/types';
import { useOnSubmit } from '../../../../../../fleet/sections/agent_policy/create_package_policy_page/single_page_layout/hooks';
import { useAgentless } from '../../../../../../fleet/sections/agent_policy/create_package_policy_page/single_page_layout/hooks/setup_technology';
import { PackageDocumentationModal } from '../../../../../../fleet/sections/agent_policy/create_package_policy_page/single_page_layout/components';
import { SelectedPolicyTab } from '../../../../../../fleet/sections/agent_policy/create_package_policy_page/components';
import { useAllNonManagedAgentPolicies } from '../../../../../../fleet/sections/agent_policy/create_package_policy_page/components/steps/components/use_policies';
import type { SavedPolicyResult } from '../../../../../../fleet/sections/agent_policy/create_package_policy_page/types';

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
  getEnabledPushSources,
  getGroupSteps,
  getSignalInfo,
  getTargetDataset,
  isSignalStep,
} from './model';
import { StepRail } from './primitives';
import type { AgentPolicyMode, CollectPackage, SchemaChoice } from './steps';
import {
  AgentPolicySection,
  CollectStep,
  HowStep,
  IntegrationSettingsSection,
  ReviewStep,
  PushSourceStep,
  SignalStep,
  StepRecap,
  getStepVars,
} from './steps';
import { DetectStep } from './detect_step';
import type { VarFieldContext } from './var_fields';
import { countVarErrors } from './var_fields';
import type { ExtraPackageInput } from './extra_packages';
import { saveExtraPackagePolicies, useExtraPackagePolicies } from './extra_packages';

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
  group: IntegrationGroup;
  options: GroupMemberOption[];
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

interface MemberPackage {
  packageInfo?: PackageInfo;
  model?: SchemaModel;
  isLoading: boolean;
  error: unknown;
}

/** A selected member package with its loaded info and wizard state. */
export interface WizardUnit {
  packageName: string;
  packageInfo?: PackageInfo;
  model?: SchemaModel;
  state: SchemaState;
}

/** Full package info (archive-backed, like the stock create page) for every member package. */
const useMemberPackages = (options: GroupMemberOption[]): Record<string, MemberPackage> => {
  const results = useQueries({
    queries: options.map((option) => {
      const version = getGroupChildVersion(option);
      const queryOptions = getMemberInfoQueryOptions(option.child);
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
        option.packageName,
        { packageInfo, model, isLoading: !!results[i]?.isLoading, error: results[i]?.error },
      ];
    })
  );
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
  const packages = useMemberPackages(options);

  // Schemas come from the listed members' `schema`; the default is the default member's schema
  // (group.yml `default`). Planned schemas (group.yml placeholder) show disabled.
  const schemas = useMemo(
    () =>
      getGroupSchemas({
        members: options.map((o) => ({
          package: o.packageName,
          version: o.child.version,
          title: o.child.title,
          schema: o.schema,
        })),
        default: group.default,
      }),
    [group.default, options]
  );
  const defaultSchema = getDefaultMemberOption(group, options)?.schema ?? schemas[0];
  const [schema, setSchema] = useState<string>(defaultSchema);

  // Pick-any: selected member packages per schema. Default: the default member if it has that
  // schema, else the schema's first member.
  const [selectedBySchema, setSelectedBySchema] = useState<Record<string, string[]>>({});
  const membersOf = useCallback((s: string) => options.filter((o) => o.schema === s), [options]);
  const selectedNamesOf = useCallback(
    (s: string) => {
      const members = membersOf(s);
      const picked = selectedBySchema[s] ?? [
        (members.find((o) => o.packageName === group.default) ?? members[0])?.packageName,
      ];
      return members.map((o) => o.packageName).filter((name) => picked.includes(name));
    },
    [membersOf, selectedBySchema, group.default]
  );

  const [packageStates, setPackageStates] = useState<Record<string, SchemaState>>({});
  const [policyOverrides, setPolicyOverrides] = useState<PolicyOverrides>({});
  const [lastSwitch, setLastSwitch] = useState<{
    from: string;
    to: string;
    report: CarryOverReport;
  }>();
  const [visited, setVisited] = useState<WizardStep[]>([COLLECT_STEP]);
  const [saved, setSaved] = useState<SavedPolicyResult>();
  // PROTOTYPE: "Install content" (review step), on by default, kept across schema switches.
  const [installContent, setInstallContent] = useState(true);

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

  const selectedNames = selectedNamesOf(schema);
  const units: WizardUnit[] = selectedNames.map((name) => ({
    packageName: name,
    packageInfo: packages[name]?.packageInfo,
    model: packages[name]?.model,
    state: packageStates[name] ?? EMPTY_STATE,
  }));
  // The first selected package runs the stock create flow; the others are saved alongside it.
  const primary = units[0];
  const model = primary?.model;
  const state = primary?.state ?? EMPTY_STATE;

  // "How" only shows when the child offers more than one deployment method.
  const methods = getDeploymentMethods(model, isAgentlessEnabled);
  const showHow = methods.length > 1;
  const [pickedMethod, setPickedMethod] = useState<SetupTechnology>();
  const method = pickedMethod && methods.includes(pickedMethod) ? pickedMethod : methods[0];

  const unitsKey = units.map((u) => `${u.packageName}:${!!u.model}`).join(',');
  const steps = useMemo(
    () => getGroupSteps(units, { showHow }),
    [unitsKey, packageStates, showHow] // eslint-disable-line react-hooks/exhaustive-deps
  );

  const updateState = useCallback(
    (packageName: string, fn: (s: SchemaState) => SchemaState) =>
      setPackageStates((prev) => ({
        ...prev,
        [packageName]: fn(prev[packageName] ?? emptySchemaState()),
      })),
    []
  );

  const onSchemaChange = (next: string) => {
    if (next === schema) return;
    const fromName = selectedNames[0];
    const toName = selectedNamesOf(next)[0];
    const fromModel = fromName ? packages[fromName]?.model : undefined;
    const toModel = toName ? packages[toName]?.model : undefined;
    if (fromModel && toModel) {
      const result = carryOverSchemaState(
        { model: fromModel, state },
        { model: toModel, state: packageStates[toName] }
      );
      setPackageStates((prev) => ({ ...prev, [toName]: result.state }));
      setLastSwitch({ from: schema, to: next, report: result.report });
    }
    setSchema(next);
  };

  const onPackageToggle = (packageName: string, isSelected: boolean) =>
    setSelectedBySchema((prev) => {
      const current = selectedNamesOf(schema);
      const next = isSelected
        ? [...current, packageName]
        : current.filter((name) => name !== packageName);
      return next.length ? { ...prev, [schema]: next } : prev;
    });

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

  const schemaChoices: SchemaChoice[] = [
    ...schemas.map((s) => {
      const first = packages[selectedNamesOf(s)[0] ?? membersOf(s)[0]?.packageName];
      return { schema: s, isReady: !!first?.model, signals: first?.model?.signals };
    }),
    ...(group.planned_schemas ?? [])
      .filter((s) => !schemas.includes(s))
      .map((s) => ({ schema: s, isReady: false, isPlanned: true })),
  ];
  const collectPackages: CollectPackage[] = membersOf(schema).map((o) => ({
    packageName: o.packageName,
    title: packages[o.packageName]?.packageInfo?.title ?? o.child.title,
    description: packages[o.packageName]?.packageInfo?.description ?? o.child.description,
    model: packages[o.packageName]?.model,
    state: packageStates[o.packageName] ?? EMPTY_STATE,
    selected: selectedNames.includes(o.packageName),
    isDefault: o.packageName === group.default,
  }));

  return (
    <GroupWizardBody
      key={`${schema}:${primary?.packageName}`}
      group={group}
      options={options}
      schema={schema}
      defaultSchema={defaultSchema}
      schemaChoices={schemaChoices}
      onSchemaChange={onSchemaChange}
      lastSwitch={lastSwitch}
      collectPackages={collectPackages}
      onPackageToggle={onPackageToggle}
      units={units}
      pkgName={primary?.packageName}
      packageInfo={primary?.packageInfo}
      packageInfoError={primary ? packages[primary.packageName]?.error : undefined}
      model={model}
      state={state}
      onStreamsChange={(packageName, enabled) =>
        updateState(packageName, (s) => ({ ...s, enabled: { ...s.enabled, ...enabled } }))
      }
      onPushChange={(packageName, id, enabled) =>
        updateState(packageName, (s) => ({ ...s, push: { ...s.push, [id]: enabled } }))
      }
      onValueChange={(packageName, path, value) =>
        updateState(packageName, (s) => ({ ...s, values: { ...s.values, [path]: value } }))
      }
      onVarGroupChange={(packageName, scopeKey, groupName, optionName) =>
        updateState(packageName, (s) => ({
          ...s,
          varGroupSelections: {
            ...s.varGroupSelections,
            [scopeKey]: { ...s.varGroupSelections[scopeKey], [groupName]: optionName },
          },
        }))
      }
      policyOverrides={policyOverrides}
      onPolicyFieldChange={(field, value) => setPolicyOverrides((p) => ({ ...p, [field]: value }))}
      installContent={installContent}
      onInstallContentChange={setInstallContent}
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
          packageName: primary?.packageInfo?.name,
          packageVersion: primary?.packageInfo?.version,
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
  group: IntegrationGroup;
  options: GroupMemberOption[];
  schema: string;
  defaultSchema?: string;
  schemaChoices: SchemaChoice[];
  onSchemaChange: (schema: string) => void;
  lastSwitch?: { from: string; to: string; report: CarryOverReport };
  collectPackages: CollectPackage[];
  onPackageToggle: (packageName: string, selected: boolean) => void;
  /** Selected packages of the schema; the first is `pkgName` / `packageInfo` / `model`. */
  units: WizardUnit[];
  pkgName?: string;
  packageInfo?: PackageInfo;
  packageInfoError?: unknown;
  model?: SchemaModel;
  state: SchemaState;
  onStreamsChange: (packageName: string, enabled: Record<string, boolean>) => void;
  onPushChange: (packageName: string, id: string, enabled: boolean) => void;
  onValueChange: (packageName: string, path: string, value: unknown) => void;
  onVarGroupChange: (
    packageName: string,
    scopeKey: string,
    groupName: string,
    optionName: string
  ) => void;
  policyOverrides: PolicyOverrides;
  onPolicyFieldChange: (field: 'name' | 'namespace', value: string) => void;
  installContent: boolean;
  onInstallContentChange: (installContent: boolean) => void;
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
  const { notifications } = useStartServices();
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

  // PROTOTYPE: pick-any schemas. The other selected packages get their own package policy, saved
  // after the first one on the same agent policy.
  const extraInputs: ExtraPackageInput[] = props.units.slice(1);
  const extras = useExtraPackagePolicies(extraInputs, packagePolicy.namespace);
  const [isSavingExtras, setIsSavingExtras] = useState(false);
  const savingExtras = useRef(false);

  useEffect(() => {
    if (!savedPackagePolicy || saved || savingExtras.current) return;
    if (!extras.length || savedPackagePolicy.type !== 'packagePolicy') {
      props.onSaved(savedPackagePolicy);
      return;
    }
    savingExtras.current = true;
    setIsSavingExtras(true);
    saveExtraPackagePolicies(
      extras,
      savedPackagePolicy.policy.policy_ids ?? [],
      installContent
    ).then(({ errors }) => {
      setIsSavingExtras(false);
      errors.forEach((e) =>
        notifications.toasts.addError(new Error(e.message), {
          title: `Couldn't add ${e.packageName}`,
        })
      );
      props.onSaved(savedPackagePolicy);
    });
  }, [savedPackagePolicy, saved]); // eslint-disable-line react-hooks/exhaustive-deps

  const ctx: VarFieldContext | undefined = model && {
    model,
    packagePolicy,
    validationResults,
    showErrors,
    onChange: (path, value) => props.onValueChange(props.pkgName!, path, value),
    onVarGroupChange: (scopeKey, groupName, optionName) =>
      props.onVarGroupChange(props.pkgName!, scopeKey, groupName, optionName),
  };
  const extraCtxs = extras.map((extra): VarFieldContext | undefined =>
    extra.model && extra.packagePolicy
      ? {
          model: extra.model,
          packagePolicy: extra.packagePolicy,
          validationResults: extra.validationResults,
          showErrors,
          onChange: (path, value) => props.onValueChange(extra.packageName, path, value),
          onVarGroupChange: (scopeKey, groupName, optionName) =>
            props.onVarGroupChange(extra.packageName, scopeKey, groupName, optionName),
        }
      : undefined
  );

  // PROTOTYPE: "Install content". An installed package keeps the choice it was installed with
  // (shown read-only). Otherwise, with content off, install the package without Kibana assets
  // before the stock submit, which then finds it installed. Content on = stock flow, unchanged.
  const installation =
    packageInfo && 'installationInfo' in packageInfo ? packageInfo.installationInfo : undefined;
  const isInstalled = installation?.install_status === 'installed';
  const installContent = isInstalled ? !installation?.skip_kibana_assets : props.installContent;
  const installContentLockedReason = isInstalled
    ? `${packageInfo?.title} is already installed ${
        installContent ? 'with' : 'without'
      } content. Reinstall it to change this.`
    : undefined;
  const [isInstallingPackage, setIsInstallingPackage] = useState(false);

  const index = steps.indexOf(step);
  const nextStep = steps[index + 1];
  const prevStep = steps[index - 1];
  const enabledStreams = model ? getEnabledStreams(model, state) : [];
  const extraEnabledStreams = extras.flatMap((e) =>
    e.model ? getEnabledStreams(e.model, e.state) : []
  );
  const assetsOnly = !!model && enabledStreams.length + extraEnabledStreams.length === 0;
  const isAgentless = props.method === SetupTechnology.AGENTLESS;
  const policyValid =
    isAgentless ||
    (props.policyMode === 'new' ? !!props.newAgentPolicy.name.trim() : !!props.existingPolicyId);
  const isSaving = (formState === 'LOADING' || isInstallingPackage || isSavingExtras) && !saved;
  const hasErrors =
    (validationResults ? validationHasErrors(validationResults) : false) ||
    extras.some((e) => e.validationResults && validationHasErrors(e.validationResults));
  const canSave =
    !!packageInfo && isInitialized && !isSaving && extras.every((e) => !!e.packagePolicy);
  // Agent policy goes on "how" when that step shows, else on review.
  const agentPolicyStep = props.showHow ? HOW_STEP : REVIEW_STEP;

  const stepHasErrors = (s: WizardStep) => {
    if (!model || !ctx) return false;
    if (s === agentPolicyStep && !policyValid) return true;
    if (s === REVIEW_STEP) {
      return !!validationResults?.name?.length || !!validationResults?.namespace?.length;
    }
    if (!isSignalStep(s)) return false;
    return (
      countVarErrors(getStepVars(model, state, s).all, ctx) > 0 ||
      extras.some((extra, i) => {
        const extraCtx = extraCtxs[i];
        return (
          !!extra.model &&
          !!extraCtx &&
          countVarErrors(getStepVars(extra.model, extra.state, s).all, extraCtx) > 0
        );
      })
    );
  };
  const onNext = () => {
    if (stepHasErrors(step)) {
      setShowErrors(true);
      return;
    }
    props.goTo(nextStep);
  };
  const onSave = async () => {
    const firstWithErrors = steps.find(stepHasErrors);
    if (hasErrors || firstWithErrors) {
      setShowErrors(true);
      if (firstWithErrors && firstWithErrors !== step) props.goTo(firstWithErrors);
      return;
    }
    if (packageInfo && !isInstalled && !installContent) {
      setIsInstallingPackage(true);
      const res = await sendInstallPackage(packageInfo.name, packageInfo.version, false, {
        skipKibanaAssets: true,
      });
      setIsInstallingPackage(false);
      if (res.error) {
        notifications.toasts.addError(new Error(res.error.message), {
          title: `Couldn't install ${packageInfo.title}`,
        });
        return;
      }
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

  const groupIcon = <GroupIcon group={group} options={props.options} size="m" />;

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
      schemaLabels={group.schema_labels}
      detail={
        model
          ? [
              ...new Set([
                ...getEnabledPushSources(model, state).map((p) => p.signal),
                ...getEnabledSignals(model, state),
              ]),
            ]
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
          schemaLabels={group.schema_labels}
          onSchemaChange={props.onSchemaChange}
          lastSwitch={props.lastSwitch}
          packages={props.collectPackages}
          onPackageToggle={props.onPackageToggle}
          onStreamsChange={props.onStreamsChange}
          onPushChange={props.onPushChange}
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
          schemaLabels={group.schema_labels}
          pkgName={props.pkgName ?? ''}
          rows={[
            ...(model
              ? enabledStreams.map((stream) => ({
                  stream,
                  dataset: getTargetDataset(
                    stream,
                    getDatasetVarValue(packagePolicy, model, stream)
                  ),
                }))
              : []),
            ...extras.flatMap((extra) =>
              extra.model && extra.packagePolicy
                ? getEnabledStreams(extra.model, extra.state).map((stream) => ({
                    stream,
                    dataset: getTargetDataset(
                      stream,
                      getDatasetVarValue(extra.packagePolicy!, extra.model!, stream)
                    ),
                  }))
                : []
            ),
          ]}
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
          schemaLabels={group.schema_labels}
          extraPackages={extras.flatMap((extra) =>
            extra.model
              ? [
                  {
                    packageName: extra.packageName,
                    model: extra.model,
                    state: extra.state,
                    packagePolicy: extra.packagePolicy,
                    installSummary: extra.packageInfo
                      ? getInstallSummary(extra.packageInfo)
                      : undefined,
                  },
                ]
              : []
          )}
          model={model}
          state={state}
          packagePolicy={packagePolicy}
          installSummary={packageInfo ? getInstallSummary(packageInfo) : undefined}
          installContent={installContent}
          onInstallContentChange={props.onInstallContentChange}
          installContentLockedReason={installContentLockedReason}
          method={props.method}
          showMethod={props.showHow}
          agentPolicySection={!props.showHow ? agentPolicySection : undefined}
          showManagedUnavailable={
            !props.showHow &&
            !!model.supportsAgentless &&
            !props.methods.includes(SetupTechnology.AGENTLESS)
          }
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
    const isMulti = extras.length > 0;
    const sections = [
      { model, state, ctx, packageName: props.pkgName },
      ...extras.map((extra, i) => ({
        model: extra.model,
        state: extra.state,
        ctx: extraCtxs[i],
        packageName: extra.packageName,
      })),
    ].filter(
      (
        sec
      ): sec is {
        model: SchemaModel;
        state: SchemaState;
        ctx: VarFieldContext;
        packageName: string;
      } => !!sec.model && !!sec.ctx && getEnabledSignals(sec.model, sec.state).includes(step)
    );
    const pushSources = getEnabledPushSources(model, state).filter((p) => p.signal === step);
    return (
      <div css={css({ display: 'flex', flexDirection: 'column', gap: euiTheme.size.xl })}>
        {pushSources.map((source) => (
          <PushSourceStep key={source.id} source={source} recap={recap} />
        ))}
        {sections.map((sec) => (
          <SignalStep
            key={sec.packageName}
            signal={step}
            groupTitle={group.title}
            model={sec.model}
            state={sec.state}
            ctx={sec.ctx}
            icon={groupIcon}
            recap={recap}
            packageTitle={isMulti ? sec.model.packageTitle : undefined}
          />
        ))}
      </div>
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
