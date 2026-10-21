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
import type { PackagePolicyValidationResults } from '../../../../../../../../common/services';
import { SetupTechnology } from '../../../../../../../../common/types';

import type {
  CarryOverReport,
  InstallSummary,
  SchemaModel,
  SchemaState,
  WizardInput,
  WizardStream,
} from './model';
import {
  getEnabledSignals,
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
}

export const CollectStep: React.FC<{
  title: string;
  schemas: SchemaChoice[];
  schema: string;
  defaultSchema?: string;
  onSchemaChange: (schema: string) => void;
  lastSwitch?: { from: string; to: string; report: CarryOverReport };
  model?: SchemaModel;
  state: SchemaState;
  onStreamsChange: (enabled: Record<string, boolean>) => void;
}> = (props) => {
  const { euiTheme } = useEuiTheme();
  const { model, state, onStreamsChange, title } = props;
  // Default (recommended) schema first
  const schemas = [...props.schemas].sort(
    (a, b) => Number(b.schema === props.defaultSchema) - Number(a.schema === props.defaultSchema)
  );
  const switchNote =
    props.lastSwitch && props.lastSwitch.to === props.schema ? props.lastSwitch : undefined;
  const noSignals = !!model && getEnabledStreams(model, state).length === 0;

  return (
    <div css={sectionGap}>
      {/* Single-schema integrations skip the choice entirely (design I1). */}
      {schemas.length > 1 && (
        <div data-test-subj="groupWizardSchemaChoice">
          <SectionHeading
            title="Data schema"
            info={`How ${title} data is shaped in Elasticsearch. You can't change this after the integration is added - switching later means adding a new integration.`}
          />
          <EuiSpacer size="s" />
          <EuiFlexGroup gutterSize="s" responsive={false}>
            {schemas.map((s) => {
              const info = getSchemaInfo(s.schema);
              return (
                <EuiFlexItem key={s.schema}>
                  <ChoiceCard
                    control="radio"
                    name="groupWizardSchema"
                    title={info.title}
                    description={
                      <>
                        {info.description}
                        {s.signals && (
                          <>
                            <br />
                            {/* PROTOTYPE: makes per-schema coverage gaps visible (Apache OTel has no logs) */}
                            Collects: {s.signals.map((sig) => getSignalInfo(sig).title).join(', ')}
                          </>
                        )}
                      </>
                    }
                    badge={s.schema === props.defaultSchema ? 'Recommended' : undefined}
                    checked={props.schema === s.schema}
                    disabled={!s.isReady}
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
                  title={`Switched to ${getSchemaInfo(switchNote.to).title}`}
                >
                  {switchNote.report.lostSignals.length > 0 && (
                    <p>
                      {getSchemaInfo(switchNote.to).title} doesn&apos;t collect{' '}
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

      <div>
        <SectionHeading
          title="Signals"
          description="Pick what to collect. You can also skip collection and only install the assets."
        />
        <EuiSpacer size="s" />
        {!model ? (
          <EuiLoadingSpinner />
        ) : (
          <EuiFlexGroup gutterSize="s" responsive={false}>
            {model.signals.map((signal) => {
              const info = getSignalInfo(signal);
              const streams = model.streams.filter((s) => s.signal === signal);
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
                    {streams.length > 1 && (
                      <div
                        css={css({
                          display: 'flex',
                          flexWrap: 'wrap',
                          gap: `${euiTheme.size.xs} ${euiTheme.size.l}`,
                          marginTop: euiTheme.size.s,
                        })}
                      >
                        {streams.map((s) => (
                          <EuiCheckbox
                            key={s.id}
                            id={`groupWizardStream-${s.id}`}
                            label={<EuiText size="xs">{getStreamShortTitle(s, title)}</EuiText>}
                            checked={isStreamEnabled(s, state)}
                            onChange={(e) => onStreamsChange({ [s.id]: e.target.checked })}
                          />
                        ))}
                      </div>
                    )}
                  </ChoiceCard>
                </EuiFlexItem>
              );
            })}
          </EuiFlexGroup>
        )}
        {noSignals && (
          <>
            <EuiSpacer size="s" />
            <EuiText size="xs" color="subdued" data-test-subj="groupWizardNoSignalsHint">
              Nothing selected: {title} will be added without collecting data, and only its assets
              (dashboards and other saved objects) are installed.
            </EuiText>
          </>
        )}
      </div>
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
    title: 'Agentless',
    description: 'Elastic collects the data for you. Nothing to install.',
  },
};

export const HowStep: React.FC<{
  methods: SetupTechnology[];
  method: SetupTechnology;
  onMethodChange: (method: SetupTechnology) => void;
  agentPolicySection: React.ReactNode;
}> = ({ methods, method, onMethodChange, agentPolicySection }) => (
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

export const ReviewStep: React.FC<{
  title: string;
  schema: string;
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
}> = (props) => {
  const { euiTheme } = useEuiTheme();
  const { model, state, title } = props;
  const streams = getEnabledStreams(model, state);
  const signals = getEnabledSignals(model, state);
  const summary = props.installSummary;
  const contentNames = summary?.contentPackages.map((c) => `${c.package} ${c.version}`) ?? [];

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

      {streams.length === 0 && (
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
        {row('Data schema', getSchemaInfo(props.schema).title, 'collect')}
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
        {props.showMethod &&
          row(
            'Deployment',
            props.method === SetupTechnology.AGENTLESS ? 'Agentless' : 'Elastic Agent',
            'how'
          )}
        {props.agentPolicyLabel && row('Agent policy', props.agentPolicyLabel, 'how')}
        {summary &&
          row(
            'Installs',
            <>
              {summary.packageTitle} {summary.packageVersion}
              {summary.dashboards + summary.otherKibanaAssets + summary.elasticsearchAssets > 0 &&
                ` with ${summary.dashboards} dashboards and ${
                  summary.otherKibanaAssets + summary.elasticsearchAssets
                } other assets`}
              {contentNames.length > 0 && `, plus assets from ${contentNames.join(', ')}`}
              {summary.dashboards === 0 && contentNames.length === 0 && (
                <>
                  {' '}
                  <EuiText size="xs" color="subdued" component="span">
                    (no dashboards)
                  </EuiText>
                </>
              )}
            </>
          )}
      </EuiPanel>

      {props.agentPolicySection}
      {props.integrationSettings}
    </div>
  );
};

/* ---------- Signal steps (one per selected signal) ---------- */

/** One-line reminder of the "what to collect" choices, with a link back to change them. */
export const StepRecap: React.FC<{
  schema: string;
  detail?: string;
  onEdit: () => void;
}> = ({ schema, detail, onEdit }) => (
  <EuiText size="xs" color="subdued" data-test-subj="groupWizardRecap">
    {getSchemaInfo(schema).title} {detail ? `· ${detail} ` : ''}·{' '}
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
}> = ({ signal, groupTitle, model, state, ctx, icon, recap }) => {
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
        title={info.title}
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
