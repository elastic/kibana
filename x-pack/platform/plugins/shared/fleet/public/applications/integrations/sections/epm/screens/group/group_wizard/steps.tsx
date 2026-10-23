/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// PROTOTYPE: step bodies for the integration onboarding wizard (integration groups). Generic:
// signals, streams and fields all come from the selected schema's child package (see model.ts).
// Order follows the design's install order: what to collect -> how -> settings per signal ->
// review -> detect and review (detect_step.tsx).

import React from 'react';
import { css } from '@emotion/react';
import {
  EuiCallOut,
  EuiCheckbox,
  EuiCode,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiLink,
  EuiLoadingSpinner,
  EuiPanel,
  EuiRadio,
  EuiSelect,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';

import type { AgentPolicy, NewPackagePolicy } from '../../../../../../../types';
import type { PackageKibanaAssetListItem } from '../../../../../../../../common/types';
import type { PackagePolicyValidationResults } from '../../../../../../../../common/services';
import { SetupTechnology } from '../../../../../../../../common/types';

import type {
  CarryOverReport,
  InstallSummary,
  PushSource,
  SchemaModel,
  SchemaState,
  WizardInput,
  WizardStream,
} from './model';
import {
  MANAGED_INPUTS_BASE_URL,
  getContentInstallText,
  getDataStreamChoices,
  getEnabledPushSources,
  getPushSources,
  isPushSourceEnabled,
  getEnabledSignals,
  isDataStreamChoiceEnabled,
  toggleDataStreamChoice,
  getEnabledStreams,
  getSchemaInfo,
  getSignalInfo,
  getStreamShortTitle,
  getTargetDataset,
  getDatasetVarValue,
  getVarGroupSelections,
  isStreamEnabled,
  toInputVar,
  toPackageVar,
  toStreamVar,
} from './model';
import { ChoiceCard, SectionHeading, SharedSettingsCard, StreamCard } from './primitives';
import { AssetChecklist, getAssetInstallText } from './assets';
import type { VarFieldContext } from './var_fields';
import { VarFieldGrid, VarGroupSelectors, countVarErrors, splitVars } from './var_fields';

const sectionGap = css({ display: 'flex', flexDirection: 'column', gap: 24 });

/* ---------- What to collect: schema + signals ---------- */

export type AgentPolicyMode = 'new' | 'existing';

export interface SchemaChoice {
  schema: string;
  /** Child package resolved and its package info loaded. */
  isReady: boolean;
  /** Signals the schema's child collects, once loaded. */
  signals?: string[];
  /** PROTOTYPE: group `planned_schemas` - no package yet, shown disabled. */
  isPlanned?: boolean;
  /** PROTOTYPE: ECS/OTel always show; no member has this one, shown disabled. */
  isMissing?: boolean;
}

/** A member package of the selected schema. */
export interface CollectPackage {
  packageName: string;
  title: string;
  description?: string;
  model?: SchemaModel;
  state: SchemaState;
  selected: boolean;
  isDefault: boolean;
}

export const CollectStep: React.FC<{
  title: string;
  schemas: SchemaChoice[];
  schema: string;
  defaultSchema?: string;
  schemaLabels?: Record<string, string>;
  onSchemaChange: (schema: string) => void;
  lastSwitch?: { from: string; to: string; report: CarryOverReport };
  /** Member packages of the selected schema. 2+ -> pick-any package cards. */
  packages: CollectPackage[];
  onPackageToggle: (packageName: string, selected: boolean) => void;
  onStreamsChange: (packageName: string, enabled: Record<string, boolean>) => void;
  onPushChange: (packageName: string, id: string, enabled: boolean) => void;
}> = (props) => {
  const { title, schemaLabels } = props;
  // Default (recommended) schema first, then available, unavailable, planned
  const rank = (c: SchemaChoice) =>
    c.schema === props.defaultSchema ? 0 : c.isPlanned ? 3 : c.isMissing ? 2 : 1;
  const schemas = [...props.schemas].sort((a, b) => rank(a) - rank(b));
  const switchNote =
    props.lastSwitch && props.lastSwitch.to === props.schema ? props.lastSwitch : undefined;
  const selectedPackages = props.packages.filter((p) => p.selected);
  const noSignals =
    selectedPackages.length > 0 &&
    selectedPackages.every(
      (p) =>
        !!p.model &&
        getEnabledStreams(p.model, p.state).length === 0 &&
        getEnabledPushSources(p.model, p.state).length === 0
    );
  const single = props.packages.length === 1 ? props.packages[0] : undefined;

  return (
    <div css={sectionGap}>
      {/* PROTOTYPE: always cards, ECS + OTel at minimum (no read-only "Schema: X" label) */}
      {schemas.length > 0 && (
        <div data-test-subj="groupWizardSchemaChoice">
          <SectionHeading
            title="Data schema"
            info={`How ${title} data is shaped in Elasticsearch. You can't change this after the integration is added - switching later means adding a new integration.`}
          />
          <EuiSpacer size="s" />
          <EuiFlexGroup gutterSize="s" responsive={false}>
            {schemas.map((s) => {
              const info = getSchemaInfo(s.schema, schemaLabels);
              return (
                <EuiFlexItem key={s.schema}>
                  <ChoiceCard
                    control="radio"
                    name="groupWizardSchema"
                    title={info.title}
                    description={
                      s.isPlanned || s.isMissing ? (
                        <>
                          {info.description}
                          <br />
                          {s.isPlanned ? 'Not available yet' : `Not available for ${title}`}
                        </>
                      ) : (
                        <>
                          {info.description}
                          {s.signals && (
                            <>
                              <br />
                              {/* PROTOTYPE: makes per-schema coverage gaps visible (Apache OTel has no logs) */}
                              Collects:{' '}
                              {s.signals.map((sig) => getSignalInfo(sig).title).join(', ')}
                            </>
                          )}
                        </>
                      )
                    }
                    badge={s.schema === props.defaultSchema ? 'Recommended' : undefined}
                    checked={props.schema === s.schema}
                    disabled={s.isPlanned || s.isMissing || !s.isReady}
                    onChange={() => props.onSchemaChange(s.schema)}
                    data-test-subj={`groupWizardSchema-${s.schema}`}
                  />
                </EuiFlexItem>
              );
            })}
          </EuiFlexGroup>
          {switchNote &&
            (switchNote.report.dropped.length > 0 || switchNote.report.lostSignals.length > 0) && (
              <>
                <EuiSpacer size="s" />
                <EuiCallOut
                  announceOnMount
                  size="s"
                  color="warning"
                  iconType="info"
                  data-test-subj="groupWizardCarryOver"
                  title={`Switched to ${getSchemaInfo(switchNote.to, schemaLabels).title}`}
                >
                  {switchNote.report.lostSignals.length > 0 && (
                    <p>
                      {getSchemaInfo(switchNote.to, schemaLabels).title} doesn&apos;t collect{' '}
                      {switchNote.report.lostSignals
                        .map((sig) => getSignalInfo(sig).title.toLowerCase())
                        .join(' or ')}{' '}
                      for {title}.
                    </p>
                  )}
                  {switchNote.report.dropped.length > 0 && (
                    <p>
                      These settings have no equivalent and were reset to defaults:{' '}
                      {[...new Set(switchNote.report.dropped.map((d) => d.title))].join(', ')}.
                    </p>
                  )}
                </EuiCallOut>
              </>
            )}
        </div>
      )}

      {single ? (
        <div>
          <SectionHeading
            title="Signals"
            description="Pick what to collect. You can also skip collection and only install the assets."
          />
          <EuiSpacer size="s" />
          {!single.model ? (
            <EuiLoadingSpinner />
          ) : (
            <SignalPicker
              model={single.model}
              state={single.state}
              title={title}
              onStreamsChange={(enabled) => props.onStreamsChange(single.packageName, enabled)}
              onPushChange={(id, enabled) => props.onPushChange(single.packageName, id, enabled)}
            />
          )}
        </div>
      ) : (
        <div data-test-subj="groupWizardPackages">
          <SectionHeading
            title="Integrations"
            description={`Pick one or more. Each one is added as its own integration on the same agent policy.`}
          />
          <EuiSpacer size="s" />
          <div css={css({ display: 'flex', flexDirection: 'column', gap: 8 })}>
            {props.packages.map((pkg) => (
              <ChoiceCard
                key={pkg.packageName}
                control="checkbox"
                title={pkg.title}
                description={pkg.description ?? ''}
                badge={pkg.isDefault ? 'Recommended' : undefined}
                checked={pkg.selected}
                // At least one package stays selected: unchecking the last one is a no-op
                // (wizard state), not a disabled card - that greyed out its data streams too.
                onChange={() => props.onPackageToggle(pkg.packageName, !pkg.selected)}
                data-test-subj={`groupWizardPackage-${pkg.packageName}`}
              >
                {pkg.selected &&
                  (pkg.model ? (
                    <PackageStreamsPicker
                      model={pkg.model}
                      state={pkg.state}
                      title={title}
                      onStreamsChange={(enabled) => props.onStreamsChange(pkg.packageName, enabled)}
                    />
                  ) : (
                    <EuiLoadingSpinner />
                  ))}
              </ChoiceCard>
            ))}
          </div>
        </div>
      )}
      {noSignals && (
        <EuiText size="xs" color="subdued" data-test-subj="groupWizardNoSignalsHint">
          Nothing selected: {title} will be added without collecting data, and only its assets
          (dashboards and other saved objects) are installed.
        </EuiText>
      )}
    </div>
  );
};

/** Signal cards (one per data stream type) with a checkbox per data stream. */
const SignalPicker: React.FC<{
  model: SchemaModel;
  state: SchemaState;
  title: string;
  onStreamsChange: (enabled: Record<string, boolean>) => void;
  onPushChange?: (id: string, enabled: boolean) => void;
}> = ({ model, state, title, onStreamsChange, onPushChange }) => {
  const { euiTheme } = useEuiTheme();
  return (
    <EuiFlexGroup gutterSize="s" responsive={false}>
      {/* PROTOTYPE: signals pushed by the technology (Supabase Log Drain), see PUSH_SOURCES */}
      {getPushSources(model).map((source) => (
        <EuiFlexItem key={source.id}>
          <ChoiceCard
            control="checkbox"
            title={getSignalInfo(source.signal).title}
            description={
              <>
                {getSignalInfo(source.signal).description}
                <br />
                <strong>{source.title}</strong>: {source.description}
              </>
            }
            checked={isPushSourceEnabled(source, state)}
            onChange={() => onPushChange?.(source.id, !isPushSourceEnabled(source, state))}
            data-test-subj={`groupWizardPush-${source.id}`}
          />
        </EuiFlexItem>
      ))}
      {model.signals.map((signal) => {
        const info = getSignalInfo(signal);
        const streams = model.streams.filter((s) => s.signal === signal);
        const choices = getDataStreamChoices(model, signal);
        const checked = streams.some((s) => isStreamEnabled(s, state));
        return (
          <EuiFlexItem key={signal}>
            <ChoiceCard
              control="checkbox"
              title={info.title}
              description={info.description}
              checked={checked}
              onChange={() =>
                onStreamsChange(Object.fromEntries(streams.map((s) => [s.id, !checked])))
              }
              data-test-subj={`groupWizardSignal-${signal}`}
            >
              {choices.length > 1 && (
                <div
                  css={css({
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: `${euiTheme.size.xs} ${euiTheme.size.l}`,
                    marginTop: euiTheme.size.s,
                  })}
                >
                  {choices.map((c) => (
                    <EuiCheckbox
                      key={c.key}
                      id={`groupWizardStream-${c.key}`}
                      label={
                        <EuiText size="xs">{getStreamShortTitle(c.streams[0], title)}</EuiText>
                      }
                      checked={isDataStreamChoiceEnabled(c, state)}
                      onChange={(e) => onStreamsChange(toggleDataStreamChoice(c, e.target.checked))}
                    />
                  ))}
                </div>
              )}
            </ChoiceCard>
          </EuiFlexItem>
        );
      })}
    </EuiFlexGroup>
  );
};

/** Inside a package card: per signal, a checkbox per data stream. */
const PackageStreamsPicker: React.FC<{
  model: SchemaModel;
  state: SchemaState;
  title: string;
  onStreamsChange: (enabled: Record<string, boolean>) => void;
}> = ({ model, state, title, onStreamsChange }) => {
  const { euiTheme } = useEuiTheme();
  return (
    <div css={css({ marginTop: euiTheme.size.s })}>
      {model.signals.map((signal) => {
        const choices = getDataStreamChoices(model, signal);
        return (
          <div key={signal} css={css({ marginTop: euiTheme.size.xs })}>
            <EuiText size="xs">
              <strong>{getSignalInfo(signal).title}</strong>
            </EuiText>
            <div
              css={css({
                display: 'flex',
                flexWrap: 'wrap',
                gap: `${euiTheme.size.xs} ${euiTheme.size.l}`,
                marginTop: euiTheme.size.xs,
              })}
            >
              {choices.map((c) => (
                <EuiCheckbox
                  key={c.key}
                  id={`groupWizardStream-${model.packageName}-${c.key}`}
                  label={<EuiText size="xs">{getStreamShortTitle(c.streams[0], title)}</EuiText>}
                  checked={isDataStreamChoiceEnabled(c, state)}
                  onChange={(e) => onStreamsChange(toggleDataStreamChoice(c, e.target.checked))}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};

/* ---------- How: deployment method (hidden with a single method) ---------- */

const METHOD_INFO: Record<SetupTechnology, { title: string; description: string }> = {
  [SetupTechnology.AGENT_BASED]: {
    title: 'Elastic Agent',
    description: 'Install Elastic Agent on your hosts. Agent policies manage what it collects.',
  },
  [SetupTechnology.AGENTLESS]: {
    title: 'Managed by Elastic',
    description: 'Elastic collects the data for you. Nothing to install.',
  },
};

export const HowStep: React.FC<{
  methods: SetupTechnology[];
  method: SetupTechnology;
  onMethodChange: (method: SetupTechnology) => void;
  agentPolicySection: React.ReactNode;
  /** Selected data streams the chosen method can't collect (stock: input deployment modes). */
  excludedByMethod?: string[];
  /** PROTOTYPE: other selected packages, not added when agentless. */
  extraPackageTitles?: string[];
}> = ({
  methods,
  method,
  onMethodChange,
  agentPolicySection,
  excludedByMethod = [],
  extraPackageTitles = [],
}) => (
  <div css={sectionGap}>
    <div>
      <SectionHeading title="Deployment" description="How the data gets collected." />
      <EuiSpacer size="s" />
      <EuiFlexGroup gutterSize="s" responsive={false}>
        {methods.map((m) => (
          <EuiFlexItem key={m}>
            <ChoiceCard
              control="radio"
              name="groupWizardMethod"
              title={METHOD_INFO[m].title}
              description={METHOD_INFO[m].description}
              checked={method === m}
              onChange={() => onMethodChange(m)}
              data-test-subj={`groupWizardMethod-${m}`}
            />
          </EuiFlexItem>
        ))}
      </EuiFlexGroup>
    </div>
    {method === SetupTechnology.AGENTLESS && excludedByMethod.length > 0 && (
      <EuiCallOut
        announceOnMount
        size="s"
        iconType="info"
        title="Not collected when managed by Elastic"
        data-test-subj="groupWizardAgentlessExcluded"
      >
        <p>
          {excludedByMethod.join(', ')}. These need Elastic Agent on your hosts. Pick Elastic Agent
          to collect them.
        </p>
      </EuiCallOut>
    )}
    {method === SetupTechnology.AGENTLESS && extraPackageTitles.length > 0 && (
      <EuiCallOut
        announceOnMount
        size="s"
        color="warning"
        iconType="warning"
        title={`Prototype: only the first integration is added managed by Elastic`}
      >
        <p>{extraPackageTitles.join(', ')} won&apos;t be added. Pick Elastic Agent to add them.</p>
      </EuiCallOut>
    )}
    {method === SetupTechnology.AGENT_BASED && agentPolicySection}
  </div>
);

/* ---------- Agent policy + integration settings (in "how", or in review when "how" is hidden) ---------- */

export const AgentPolicySection: React.FC<{
  title: string;
  policyMode: AgentPolicyMode;
  onPolicyModeChange: (mode: AgentPolicyMode) => void;
  newPolicyName: string;
  onNewPolicyNameChange: (name: string) => void;
  existingPolicies: AgentPolicy[];
  existingPolicyId?: string;
  onExistingPolicyChange: (id: string) => void;
}> = (props) => (
  <div data-test-subj="groupWizardAgentPolicy">
    <SectionHeading
      title="Agent policy"
      description={`Elastic Agent collects ${props.title} data from your hosts. Agent policies decide which integrations run on a set of agents.`}
    />
    <EuiSpacer size="s" />
    <EuiPanel color="subdued" hasBorder paddingSize="m">
      <EuiFlexGroup gutterSize="l" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiRadio
            id="groupWizardPolicyNew"
            name="groupWizardPolicyMode"
            label="Create a new policy"
            checked={props.policyMode === 'new'}
            onChange={() => props.onPolicyModeChange('new')}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiRadio
            id="groupWizardPolicyExisting"
            name="groupWizardPolicyMode"
            label="Use an existing policy"
            checked={props.policyMode === 'existing'}
            disabled={props.existingPolicies.length === 0}
            onChange={() => props.onPolicyModeChange('existing')}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="m" />
      {props.policyMode === 'new' ? (
        <EuiFormRow
          fullWidth
          css={css({ maxWidth: 480 })}
          label="New agent policy name"
          helpText="Created with this integration. You can add agents after setup."
          isInvalid={!props.newPolicyName.trim()}
          error="A name is required"
        >
          <EuiFieldText
            compressed
            fullWidth
            value={props.newPolicyName}
            isInvalid={!props.newPolicyName.trim()}
            onChange={(e) => props.onNewPolicyNameChange(e.target.value)}
            data-test-subj="groupWizardNewPolicyName"
          />
        </EuiFormRow>
      ) : (
        <EuiFormRow label="Agent policy" fullWidth css={css({ maxWidth: 480 })}>
          <EuiSelect
            compressed
            fullWidth
            hasNoInitialSelection={!props.existingPolicyId}
            value={props.existingPolicyId ?? ''}
            options={props.existingPolicies.map((p) => ({ value: p.id, text: p.name }))}
            onChange={(e) => props.onExistingPolicyChange(e.target.value)}
            data-test-subj="groupWizardExistingPolicy"
          />
        </EuiFormRow>
      )}
    </EuiPanel>
  </div>
);

/** Integration name + namespace. They live above the schema state, so they survive a switch. */
export const IntegrationSettingsSection: React.FC<{
  packagePolicy: NewPackagePolicy;
  validationResults?: PackagePolicyValidationResults;
  onPolicyFieldChange: (field: 'name' | 'namespace', value: string) => void;
}> = ({ packagePolicy, validationResults, onPolicyFieldChange }) => {
  const nameErrors = validationResults?.name;
  const namespaceErrors = validationResults?.namespace;
  return (
    <div>
      <SectionHeading title="Integration settings" />
      <EuiSpacer size="s" />
      <EuiFlexGroup gutterSize="m" css={css({ maxWidth: 720 })}>
        <EuiFlexItem>
          <EuiFormRow
            label="Integration name"
            fullWidth
            isInvalid={!!nameErrors?.length}
            error={nameErrors}
          >
            <EuiFieldText
              compressed
              fullWidth
              value={packagePolicy.name}
              isInvalid={!!nameErrors?.length}
              onChange={(e) => onPolicyFieldChange('name', e.target.value)}
              data-test-subj="groupWizardPolicyName"
            />
          </EuiFormRow>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFormRow
            label="Namespace"
            fullWidth
            isInvalid={!!namespaceErrors?.length}
            error={namespaceErrors}
            labelAppend={
              <EuiText size="xs" color="subdued">
                Optional
              </EuiText>
            }
          >
            <EuiFieldText
              compressed
              fullWidth
              placeholder="Agent policy namespace"
              value={packagePolicy.namespace ?? ''}
              isInvalid={!!namespaceErrors?.length}
              onChange={(e) => onPolicyFieldChange('namespace', e.target.value)}
              data-test-subj="groupWizardNamespace"
            />
          </EuiFormRow>
        </EuiFlexItem>
      </EuiFlexGroup>
    </div>
  );
};

/* ---------- Review ---------- */

/** PROTOTYPE: one package's asset checklist on review. */
export interface AssetSection {
  packageName: string;
  title: string;
  items?: PackageKibanaAssetListItem[];
  isLoading: boolean;
  skippedKeys: string[];
  /** Installed package: its saved choice, read-only. */
  lockedReason?: string;
}

/** PROTOTYPE: another selected package of a pick-any schema, saved as its own package policy. */
export interface ReviewExtraPackage {
  packageName: string;
  model: SchemaModel;
  state: SchemaState;
  packagePolicy?: NewPackagePolicy;
  installSummary?: InstallSummary;
}

export const ReviewStep: React.FC<{
  title: string;
  schema: string;
  schemaLabels?: Record<string, string>;
  model: SchemaModel;
  state: SchemaState;
  packagePolicy: NewPackagePolicy;
  installSummary?: InstallSummary;
  method: SetupTechnology;
  showMethod: boolean;
  /** Agent policy choice, when the "how" step is hidden. */
  agentPolicySection?: React.ReactNode;
  agentPolicyLabel?: string;
  integrationSettings: React.ReactNode;
  onEdit: (step: string) => void;
  /**
   * PROTOTYPE: granular "assets to install", one checklist per package (the first selected
   * package, then extras). Replaces the all-or-nothing "Install content" checkbox.
   */
  assetSections: AssetSection[];
  onSkippedAssetsChange: (packageName: string, skippedKeys: string[]) => void;
  /** PROTOTYPE: pick-any schemas - the other selected packages. */
  extraPackages?: ReviewExtraPackage[];
}> = (props) => {
  const pushSources = getEnabledPushSources(props.model, props.state);
  const { euiTheme } = useEuiTheme();
  const { model, state, title } = props;
  const streams = getEnabledStreams(model, state);
  const signals = getEnabledSignals(model, state);
  const summary = props.installSummary;
  const sectionFor = (packageName: string) =>
    props.assetSections.find((s) => s.packageName === packageName);
  // Asset list loaded and non-empty: "N of M content assets". Else the package-info text
  // (no content, or content from a content package dependency).
  const installsText = (pkgLabel: string, pkgSummary?: InstallSummary, packageName?: string) => {
    const section = packageName ? sectionFor(packageName) : undefined;
    if (section?.items?.length) {
      return getAssetInstallText(pkgLabel, section.items, section.skippedKeys);
    }
    return pkgSummary ? getContentInstallText(pkgSummary, true).installed : undefined;
  };
  const contentText = installsText(
    `${model.packageTitle} ${model.packageVersion}`,
    summary,
    model.packageName
  );
  const extras = props.extraPackages ?? [];
  const isMulti = extras.length > 0;
  const allStreamCount =
    streams.length +
    pushSources.length +
    extras.reduce((n, e) => n + getEnabledStreams(e.model, e.state).length, 0);
  const hasAnyContent = props.assetSections.some((s) => s.isLoading || !!s.items?.length);

  const row = (label: string, value: React.ReactNode, editStep?: string) => (
    <div
      css={css({
        display: 'flex',
        gap: euiTheme.size.m,
        padding: `${euiTheme.size.s} 0`,
        borderTop: `1px solid ${euiTheme.colors.borderBaseSubdued}`,
      })}
    >
      <EuiText size="s" color="subdued" css={css({ width: 160, flexShrink: 0 })}>
        {label}
      </EuiText>
      <EuiText size="s" css={css({ flex: 1 })}>
        {value}
      </EuiText>
      {editStep && (
        <EuiLink
          onClick={() => props.onEdit(editStep)}
          data-test-subj={`groupWizardEdit-${editStep}`}
        >
          Edit
        </EuiLink>
      )}
    </div>
  );

  return (
    <div css={sectionGap} data-test-subj="groupWizardReview">
      <div>
        <EuiTitle size="xs">
          <h2>Review</h2>
        </EuiTitle>
        <EuiText size="xs" color="subdued" css={css({ marginTop: 4 })}>
          Check what gets collected and installed, then add {title}.
        </EuiText>
      </div>

      {allStreamCount === 0 && (
        <EuiCallOut
          announceOnMount
          iconType="info"
          title="No data will be collected"
          data-test-subj="groupWizardAssetsOnly"
        >
          <p>
            No signals are selected. {title} is added with every input turned off, so its assets get
            installed but nothing is collected. You can turn inputs on later from the
            integration&apos;s policy.
          </p>
        </EuiCallOut>
      )}

      <EuiPanel hasBorder paddingSize="m">
        {row('Data schema', getSchemaInfo(props.schema, props.schemaLabels).title, 'collect')}
        {isMulti && row('Integration', `${model.packageTitle} (${props.packagePolicy.name})`)}
        {row(
          'Collect',
          streams.length
            ? signals
                .map(
                  (sig) =>
                    `${getSignalInfo(sig).title}: ${streams
                      .filter((s) => s.signal === sig)
                      .map((s) => getStreamShortTitle(s, title))
                      .join(', ')}`
                )
                .join(' · ')
            : 'Nothing (assets only)',
          'collect'
        )}
        {streams.length > 0 &&
          row(
            'Data streams',
            streams
              .map(
                (s) =>
                  `${s.signal}-${getTargetDataset(
                    s,
                    getDatasetVarValue(props.packagePolicy, model, s)
                  )}-*`
              )
              .join(', ')
          )}
        {pushSources.map((source) =>
          row(
            `${getSignalInfo(source.signal).title} (pushed)`,
            `${source.title}: set up in ${title}, sends to ${MANAGED_INPUTS_BASE_URL}${source.endpointPath}`,
            source.signal
          )
        )}
        {props.showMethod &&
          row(
            'Deployment',
            props.method === SetupTechnology.AGENTLESS ? 'Managed by Elastic' : 'Elastic Agent',
            'how'
          )}
        {props.agentPolicyLabel && row('Agent policy', props.agentPolicyLabel, 'how')}
        {contentText &&
          row('Installs', <div data-test-subj="groupWizardInstalls">{contentText}</div>)}
      </EuiPanel>

      {extras.map((extra) => {
        const extraStreams = getEnabledStreams(extra.model, extra.state);
        const extraContent = installsText(
          `${extra.model.packageTitle} ${extra.model.packageVersion}`,
          extra.installSummary,
          extra.packageName
        );
        return (
          <EuiPanel
            key={extra.packageName}
            hasBorder
            paddingSize="m"
            data-test-subj={`groupWizardReviewExtra-${extra.packageName}`}
          >
            {row(
              'Integration',
              `${extra.model.packageTitle}${
                extra.packagePolicy ? ` (${extra.packagePolicy.name})` : ''
              }`
            )}
            {row(
              'Collect',
              extraStreams.length
                ? getEnabledSignals(extra.model, extra.state)
                    .map(
                      (sig) =>
                        `${getSignalInfo(sig).title}: ${extraStreams
                          .filter((s) => s.signal === sig)
                          .map((s) => getStreamShortTitle(s, title))
                          .join(', ')}`
                    )
                    .join(' · ')
                : 'Nothing (assets only)',
              'collect'
            )}
            {extraStreams.length > 0 &&
              extra.packagePolicy &&
              row(
                'Data streams',
                extraStreams
                  .map(
                    (s) =>
                      `${s.signal}-${getTargetDataset(
                        s,
                        getDatasetVarValue(extra.packagePolicy!, extra.model, s)
                      )}-*`
                  )
                  .join(', ')
              )}
            {extraContent && row('Installs', extraContent)}
          </EuiPanel>
        );
      })}

      {hasAnyContent && (
        <div data-test-subj="groupWizardContent">
          <SectionHeading
            title="Content to install"
            description="Pick the dashboards, saved searches, alert and SLO templates and other content to install. Index templates and ingest pipelines always install."
          />
          <EuiSpacer size="s" />
          {props.assetSections.map((section) => (
            <div key={section.packageName} css={css({ marginBottom: euiTheme.size.m })}>
              {props.assetSections.length > 1 && (
                <EuiTitle size="xxs">
                  <h3>{section.title}</h3>
                </EuiTitle>
              )}
              <AssetChecklist
                packageName={section.packageName}
                items={section.items}
                isLoading={section.isLoading}
                skippedKeys={section.skippedKeys}
                lockedReason={section.lockedReason}
                onChange={(keys) => props.onSkippedAssetsChange(section.packageName, keys)}
              />
            </div>
          ))}
        </div>
      )}

      {props.agentPolicySection}
      {props.integrationSettings}
    </div>
  );
};

/* ---------- Push source step (prototype special case) ---------- */

export const PushSourceStep: React.FC<{
  source: PushSource;
  recap: React.ReactNode;
}> = ({ source, recap }) => {
  const endpoint = `${MANAGED_INPUTS_BASE_URL}${source.endpointPath}`;
  return (
    <div css={sectionGap} data-test-subj={`groupWizardPushStep-${source.id}`}>
      <StepIntro
        title={`${getSignalInfo(source.signal).title}: ${source.title}`}
        description={source.description}
        recap={recap}
      />
      <EuiPanel hasBorder paddingSize="m">
        <EuiText size="s">
          <ol>
            {source.setupSteps.map((text) => (
              <li key={text}>{text}</li>
            ))}
          </ol>
        </EuiText>
        <EuiSpacer size="m" />
        <EuiFormRow label="Endpoint" fullWidth>
          <EuiCode transparentBackground={false}>{endpoint}</EuiCode>
        </EuiFormRow>
        <EuiFormRow label="Header" fullWidth>
          <EuiCode transparentBackground={false}>
            {'Authorization: ApiKey <your Elastic API key>'}
          </EuiCode>
        </EuiFormRow>
      </EuiPanel>
      <EuiText size="xs" color="subdued">
        Nothing is installed for this signal. Logs land in Elasticsearch as OpenTelemetry data.
      </EuiText>
    </div>
  );
};

/* ---------- Signal steps (one per selected signal) ---------- */

/** One-line reminder of the "what to collect" choices, with a link back to change them. */
export const StepRecap: React.FC<{
  schema: string;
  schemaLabels?: Record<string, string>;
  detail?: string;
  onEdit: () => void;
}> = ({ schema, schemaLabels, detail, onEdit }) => (
  <EuiText size="xs" color="subdued" data-test-subj="groupWizardRecap">
    {getSchemaInfo(schema, schemaLabels).title} {detail ? `· ${detail} ` : ''}·{' '}
    <EuiLink onClick={onEdit} data-test-subj="groupWizardRecapEdit">
      Change
    </EuiLink>
  </EuiText>
);

const StepIntro: React.FC<{ title: string; description: string; recap: React.ReactNode }> = ({
  title,
  description,
  recap,
}) => (
  <EuiFlexGroup alignItems="flexStart" responsive={false}>
    <EuiFlexItem>
      <EuiTitle size="xs">
        <h2>{title}</h2>
      </EuiTitle>
      <EuiText size="xs" color="subdued" css={css({ marginTop: 4 })}>
        {description}
      </EuiText>
    </EuiFlexItem>
    <EuiFlexItem grow={false}>{recap}</EuiFlexItem>
  </EuiFlexGroup>
);

/**
 * Inputs whose vars show on this signal's step: inputs with an enabled stream of this signal, and
 * no enabled stream of an earlier signal (an input spanning signals shows its vars once).
 */
export const getStepInputs = (
  model: SchemaModel,
  state: SchemaState,
  signal: string
): WizardInput[] => {
  const signals = getEnabledSignals(model, state);
  return model.inputs.filter((input) => {
    const inputSignals = signals.filter((sig) =>
      model.streams.some(
        (s) => s.inputKey === input.key && s.signal === sig && isStreamEnabled(s, state)
      )
    );
    return inputSignals[0] === signal;
  });
};

/** Package-level vars go on the first signal step. */
export const getStepVars = (model: SchemaModel, state: SchemaState, signal: string) => {
  const isFirst = getEnabledSignals(model, state)[0] === signal;
  const packageVars = isFirst ? model.packageVars.map(toPackageVar) : [];
  const inputVars = getStepInputs(model, state, signal).flatMap((input) =>
    input.vars.map((def) => toInputVar(input, def))
  );
  const streams = model.streams.filter((s) => s.signal === signal && isStreamEnabled(s, state));
  const streamVars = streams.flatMap((s) => s.vars.map((def) => toStreamVar(s, def)));
  return { packageVars, inputVars, streams, all: [...packageVars, ...inputVars, ...streamVars] };
};

export const SignalStep: React.FC<{
  signal: string;
  groupTitle: string;
  model: SchemaModel;
  state: SchemaState;
  ctx: VarFieldContext;
  icon: React.ReactNode;
  recap: React.ReactNode;
  /** PROTOTYPE: pick-any schemas render one section per selected package. */
  packageTitle?: string;
}> = ({ signal, groupTitle, model, state, ctx, icon, recap, packageTitle }) => {
  const info = getSignalInfo(signal);
  const { packageVars, streams } = getStepVars(model, state, signal);
  const stepInputs = getStepInputs(model, state, signal);
  const pkgSelections = getVarGroupSelections(
    model.packageVarGroups,
    state.varGroupSelections.package
  );
  const shared = splitVars(
    [...packageVars, ...stepInputs.flatMap((i) => i.vars.map((def) => toInputVar(i, def)))],
    model.packageVarGroups,
    pkgSelections
  );
  const hasPackageVarGroups = packageVars.length > 0 && !!model.packageVarGroups?.length;
  const multipleInputs = new Set(streams.map((s) => s.inputKey)).size > 1;

  return (
    <div css={sectionGap}>
      <StepIntro
        title={packageTitle ? `${packageTitle}: ${info.title}` : info.title}
        description={`Collect ${streams
          .map((s) => getStreamShortTitle(s, groupTitle).toLowerCase())
          .join(', ')} from ${groupTitle}.`}
        recap={recap}
      />
      {(shared.visible.length > 0 || shared.advanced.length > 0 || hasPackageVarGroups) && (
        <SharedSettingsCard
          title="Global settings"
          description={`Applies to all ${groupTitle} ${info.title.toLowerCase()} streams.`}
          forceOpenAdvanced={ctx.showErrors && countVarErrors(shared.advanced, ctx) > 0}
          advanced={
            shared.advanced.length ? <VarFieldGrid vars={shared.advanced} ctx={ctx} /> : undefined
          }
        >
          {hasPackageVarGroups && (
            <VarGroupSelectors
              scopeKey="package"
              varGroups={model.packageVarGroups}
              selections={pkgSelections}
              ctx={ctx}
            />
          )}
          <VarFieldGrid
            vars={shared.visible}
            ctx={ctx}
            varGroups={model.packageVarGroups}
            selections={pkgSelections}
          />
        </SharedSettingsCard>
      )}
      {streams.map((stream) => (
        <SignalStreamCard
          key={stream.id}
          stream={stream}
          model={model}
          state={state}
          ctx={ctx}
          icon={icon}
          inputTitle={
            multipleInputs ? model.inputs.find((i) => i.key === stream.inputKey)?.title : undefined
          }
        />
      ))}
    </div>
  );
};

const SignalStreamCard: React.FC<{
  stream: WizardStream;
  model: SchemaModel;
  state: SchemaState;
  ctx: VarFieldContext;
  icon: React.ReactNode;
  inputTitle?: string;
}> = ({ stream, model, state, ctx, icon, inputTitle }) => {
  const selections = getVarGroupSelections(stream.varGroups, state.varGroupSelections[stream.id]);
  const { visible, advanced } = splitVars(
    stream.vars.map((def) => toStreamVar(stream, def)),
    stream.varGroups,
    selections
  );
  const visibleErrors = countVarErrors(visible, ctx);
  const advancedErrors = countVarErrors(advanced, ctx);
  const target = getTargetDataset(stream, getDatasetVarValue(ctx.packagePolicy, model, stream));
  return (
    <StreamCard
      title={stream.title}
      description={[inputTitle, stream.description].filter(Boolean).join(' · ')}
      icon={icon}
      forceOpen={ctx.showErrors && visibleErrors + advancedErrors > 0}
      forceOpenAdvanced={ctx.showErrors && advancedErrors > 0}
      data-test-subj={`groupWizardStreamCard-${stream.dataset}`}
      advanced={
        advanced.length ? (
          <VarFieldGrid
            vars={advanced}
            ctx={ctx}
            varGroups={stream.varGroups}
            selections={selections}
          />
        ) : undefined
      }
      footer={
        <EuiText size="xs" color="subdued">
          Sends data to <EuiCode>{`${stream.signal}-${target}-<namespace>`}</EuiCode>
        </EuiText>
      }
    >
      {stream.varGroups?.length ? (
        <VarGroupSelectors
          scopeKey={stream.id}
          varGroups={stream.varGroups}
          selections={selections}
          ctx={ctx}
        />
      ) : null}
      {visible.length ? (
        <VarFieldGrid
          vars={visible}
          ctx={ctx}
          varGroups={stream.varGroups}
          selections={selections}
        />
      ) : (
        <EuiText size="xs" color="subdued">
          No settings needed.{advanced.length ? ' Defaults are in Advanced options.' : ''}
        </EuiText>
      )}
    </StreamCard>
  );
};
