/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// PROTOTYPE: step bodies for the integration group onboarding wizard. Generic: signals, streams
// and fields all come from the selected schema's child package (see model.ts).

import React, { useEffect, useState } from 'react';
import { css } from '@emotion/react';
import moment from 'moment';
import {
  EuiBadge,
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiCheckbox,
  EuiCode,
  EuiFieldText,
  EuiFlexGrid,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiIcon,
  EuiLink,
  EuiLoadingSpinner,
  EuiPanel,
  EuiProgress,
  EuiRadio,
  EuiSelect,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';

import type { AgentPolicy, DataStream, NewPackagePolicy } from '../../../../../../../types';
import {
  ElasticsearchAssetType,
  KibanaSavedObjectType,
} from '../../../../../../../../common/types';
import type { PackagePolicyValidationResults } from '../../../../../../../../common/services';
import {
  sendGetBulkAssets,
  sendGetDataStreams,
  sendGetPackageInfoByKey,
  useStartServices,
} from '../../../../../../../hooks';
import { useDiscoverLocator } from '../../../../../../../hooks/use_locator';

import type { CarryOverReport, SchemaModel, SchemaState, WizardInput, WizardStream } from './model';
import {
  getDatasetVarValue,
  getEnabledSignals,
  getSchemaInfo,
  getSignalInfo,
  getStreamShortTitle,
  getTargetDataset,
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

/* ---------- Step 1: schema & signals ---------- */

export type AgentPolicyMode = 'new' | 'existing';

export interface SchemaChoice {
  schema: string;
  /** Child package resolved and its package info loaded. */
  isReady: boolean;
  /** Signals the schema's child collects, once loaded. */
  signals?: string[];
}

export const SchemaSignalsStep: React.FC<{
  groupTitle: string;
  schemas: SchemaChoice[];
  schema: string;
  defaultSchema?: string;
  onSchemaChange: (schema: string) => void;
  lastSwitch?: { from: string; to: string; report: CarryOverReport };
  model?: SchemaModel;
  state: SchemaState;
  onStreamsChange: (enabled: Record<string, boolean>) => void;
  policyMode: AgentPolicyMode;
  onPolicyModeChange: (mode: AgentPolicyMode) => void;
  newPolicyName: string;
  onNewPolicyNameChange: (name: string) => void;
  existingPolicies: AgentPolicy[];
  existingPolicyId?: string;
  onExistingPolicyChange: (id: string) => void;
  packagePolicy: NewPackagePolicy;
  validationResults?: PackagePolicyValidationResults;
  onPolicyFieldChange: (field: 'name' | 'namespace', value: string) => void;
}> = (props) => {
  const { euiTheme } = useEuiTheme();
  const { model, state, onStreamsChange, groupTitle } = props;
  // Default (recommended) schema first
  const schemas = [...props.schemas].sort(
    (a, b) => Number(b.schema === props.defaultSchema) - Number(a.schema === props.defaultSchema)
  );
  const switchNote =
    props.lastSwitch && props.lastSwitch.to === props.schema ? props.lastSwitch : undefined;
  const nameErrors = props.validationResults?.name;
  const namespaceErrors = props.validationResults?.namespace;

  return (
    <div css={sectionGap}>
      {/* PROTOTYPE: single-schema groups skip the choice entirely (design I1). */}
      {schemas.length > 1 && (
        <div>
          <SectionHeading
            title="Data schema"
            info={`How ${groupTitle} data is shaped in Elasticsearch. You can't change this after the integration is added - switching later means adding a new integration.`}
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
                      for {groupTitle}.
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
        <SectionHeading title="Signals" />
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
                            label={
                              <EuiText size="xs">{getStreamShortTitle(s, groupTitle)}</EuiText>
                            }
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
      </div>

      <div>
        <SectionHeading
          title="Agent policy"
          description={`Elastic Agent collects ${groupTitle} data from your hosts. Agent policies manage a group of integrations across a set of agents.`}
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

      {/* PROTOTYPE: integration name + namespace live above the schema, so they survive a switch. */}
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
                value={props.packagePolicy.name}
                isInvalid={!!nameErrors?.length}
                onChange={(e) => props.onPolicyFieldChange('name', e.target.value)}
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
                value={props.packagePolicy.namespace ?? ''}
                isInvalid={!!namespaceErrors?.length}
                onChange={(e) => props.onPolicyFieldChange('namespace', e.target.value)}
                data-test-subj="groupWizardNamespace"
              />
            </EuiFormRow>
          </EuiFlexItem>
        </EuiFlexGroup>
      </div>
    </div>
  );
};

/* ---------- Signal steps (one per selected signal) ---------- */

/** One-line reminder of the step 1 choices, with a link back to change them. */
export const StepRecap: React.FC<{
  schema: string;
  policyLabel: string;
  onEdit: () => void;
}> = ({ schema, policyLabel, onEdit }) => (
  <EuiText size="xs" color="subdued" data-test-subj="groupWizardRecap">
    {getSchemaInfo(schema).title} · {policyLabel} ·{' '}
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

/* ---------- Summary ---------- */

const RECENT_MS = 10 * 60 * 1000;

const useDataStreamPoll = () => {
  const [dataStreams, setDataStreams] = useState<DataStream[]>([]);
  useEffect(() => {
    let cancelled = false;
    const poll = async () => {
      try {
        const res = await sendGetDataStreams();
        if (!cancelled && res) setDataStreams(res.data_streams);
      } catch {
        // PROTOTYPE: ignore polling errors
      }
    };
    poll();
    const interval = setInterval(poll, 5000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);
  return dataStreams;
};

interface InstalledContent {
  dashboards: Array<{ id: string; title: string; href?: string }>;
  pipelines: number;
  templates: number;
}

/** Installed assets of the child package plus its content dependencies (e.g. nginx_otel). */
const useInstalledContent = (pkgName: string) => {
  const { http } = useStartServices();
  const [content, setContent] = useState<InstalledContent>();
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: child } = await sendGetPackageInfoByKey(pkgName, undefined, {
        prerelease: true,
      });
      const deps = child?.item.requires?.content?.map((d) => d.package) ?? [];
      const depInfos = await Promise.all(
        deps.map((dep) => sendGetPackageInfoByKey(dep, undefined, { prerelease: true }))
      );
      const infos = [child?.item, ...depInfos.map((r) => r.data?.item)];
      const kibana = infos.flatMap((i) => i?.installationInfo?.installed_kibana ?? []);
      const es = infos.flatMap((i) => i?.installationInfo?.installed_es ?? []);
      const dashboardRefs = kibana.filter((a) => a.type === KibanaSavedObjectType.dashboard);
      const { data: assets } = dashboardRefs.length
        ? await sendGetBulkAssets({
            assetIds: dashboardRefs.map(({ id, type }) => ({ id, type })),
          })
        : { data: undefined };
      if (cancelled) return;
      const basePath = http.basePath.get();
      setContent({
        dashboards: (
          assets?.items ??
          dashboardRefs.map((a) => ({ ...a, attributes: {} as { title?: string } }))
        )
          .map((a) => ({
            id: a.id,
            title: a.attributes.title ?? a.id,
            href:
              'appLink' in a && a.appLink
                ? a.appLink.startsWith(basePath)
                  ? a.appLink
                  : http.basePath.prepend(a.appLink)
                : undefined,
          }))
          .sort((a, b) => a.title.localeCompare(b.title)),
        pipelines: es.filter((a) => a.type === ElasticsearchAssetType.ingestPipeline).length,
        templates: es.filter((a) => a.type === ElasticsearchAssetType.indexTemplate).length,
      });
    })().catch(() => {
      // PROTOTYPE: content list is best effort
    });
    return () => {
      cancelled = true;
    };
  }, [pkgName, http.basePath]);
  return content;
};

export const SummaryStep: React.FC<{
  schema: string;
  groupTitle: string;
  pkgName: string;
  /** Enabled streams with their target dataset (computed before save). */
  streams: Array<{ stream: WizardStream; dataset: string }>;
  agentPolicyName?: string;
  packagePolicyName?: string;
  onAddAgent: () => void;
  assetsHref: string;
}> = ({
  schema,
  groupTitle,
  pkgName,
  streams,
  agentPolicyName,
  packagePolicyName,
  onAddAgent,
  assetsHref,
}) => {
  const { euiTheme } = useEuiTheme();
  const discoverLocator = useDiscoverLocator();
  const dataStreams = useDataStreamPoll();
  const content = useInstalledContent(pkgName);
  const rows = streams.map(({ stream, dataset }) => {
    const match = dataStreams
      .filter((ds) => ds.dataset === dataset && ds.type === stream.signal)
      .sort((a, b) => b.last_activity_ms - a.last_activity_ms)[0];
    const live = !!match && Date.now() - match.last_activity_ms < RECENT_MS;
    return { stream, dataset, pattern: `${stream.signal}-${dataset}-*`, match, live };
  });
  const liveRows = rows.filter((r) => r.live);
  const allLive = liveRows.length === rows.length;
  const [exploreHref, setExploreHref] = useState<string>();
  const patterns = liveRows.map((r) => r.pattern).join(', ');
  useEffect(() => {
    if (!discoverLocator || !patterns) return setExploreHref(undefined);
    discoverLocator
      .getUrl({ query: { esql: `FROM ${patterns}` }, timeRange: { from: 'now-15m', to: 'now' } })
      .then(setExploreHref)
      .catch(() => setExploreHref(undefined));
  }, [discoverLocator, patterns]);

  return (
    <div css={css({ display: 'flex', flexDirection: 'column', gap: 32 })}>
      <EuiPanel hasBorder paddingSize="l" data-test-subj="groupWizardStatusCard">
        <EuiFlexGroup alignItems="center" responsive={false}>
          <EuiFlexItem grow={false}>
            {allLive ? (
              <EuiIcon type="checkCircleFill" color="success" size="l" aria-hidden={true} />
            ) : (
              <EuiLoadingSpinner size="l" />
            )}
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiTitle size="xs">
              <h3>
                {allLive
                  ? `${groupTitle} is sending data · ${rows.length} streams`
                  : 'Waiting for data'}
              </h3>
            </EuiTitle>
            <EuiText size="s" color="subdued">
              {allLive
                ? 'All selected data streams are receiving documents.'
                : `${liveRows.length} of ${rows.length} streams receiving · data shows up once an agent on this policy can reach ${groupTitle}`}
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiBadge color="hollow">Agent-based</EuiBadge>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiBadge color="hollow">{getSchemaInfo(schema).title}</EuiBadge>
              </EuiFlexItem>
              {exploreHref && (
                <EuiFlexItem grow={false}>
                  <EuiButton
                    size="s"
                    iconType="discoverApp"
                    href={exploreHref}
                    css={css({ marginLeft: euiTheme.size.s })}
                    data-test-subj="groupWizardExploreDiscover"
                  >
                    Explore in Discover
                  </EuiButton>
                </EuiFlexItem>
              )}
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
        {!allLive && (
          <>
            <EuiSpacer size="m" />
            <EuiProgress size="xs" color="primary" />
          </>
        )}
        <EuiSpacer size="m" />
        {rows.map((r) => (
          <div
            key={r.stream.id}
            css={css({
              display: 'flex',
              alignItems: 'center',
              gap: euiTheme.size.m,
              padding: `${euiTheme.size.s} 0`,
              borderTop: `1px solid ${euiTheme.colors.borderBaseSubdued}`,
            })}
          >
            {r.live ? (
              <EuiIcon type="checkCircle" color="success" aria-hidden={true} />
            ) : (
              <EuiLoadingSpinner size="m" />
            )}
            <EuiText size="s" css={css({ flex: 1 })}>
              {r.stream.title} <EuiCode>{r.pattern}</EuiCode>
            </EuiText>
            <EuiText size="xs" color="subdued">
              {r.live && r.match
                ? `last event ${moment(r.match.last_activity_ms).fromNow()}`
                : 'waiting'}
            </EuiText>
          </div>
        ))}
      </EuiPanel>

      {!allLive && (
        <EuiCallOut
          announceOnMount={false}
          iconType="info"
          title="Add Elastic Agent to start collecting"
          data-test-subj="groupWizardAddAgentCallout"
          text={
            <p>
              {packagePolicyName ? <strong>{packagePolicyName}</strong> : 'The integration'} was
              added to the <strong>{agentPolicyName ?? 'selected'}</strong> agent policy. Install
              Elastic Agent on your {groupTitle} hosts with this policy, or check that existing
              agents can reach the configured paths and endpoints.
            </p>
          }
          actionProps={{
            primary: {
              children: 'Add Elastic Agent',
              onClick: onAddAgent,
              'data-test-subj': 'groupWizardAddAgent',
            },
          }}
        />
      )}

      <div data-test-subj="groupWizardInstalledContent">
        <EuiFlexGroup alignItems="center" responsive={false}>
          <EuiFlexItem>
            <SectionHeading
              title="Installed content"
              description={
                content
                  ? `${content.dashboards.length} dashboards · ${content.pipelines} ingest pipelines · ${content.templates} index templates`
                  : 'Loading installed assets...'
              }
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              size="s"
              iconType="chevronSingleRight"
              iconSide="right"
              href={assetsHref}
            >
              View all assets
            </EuiButtonEmpty>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer size="s" />
        {content && content.dashboards.length > 0 && (
          <EuiFlexGrid columns={2} gutterSize="s">
            {content.dashboards.map((d) => (
              <EuiFlexItem key={d.id}>
                <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
                  <EuiFlexItem grow={false}>
                    <EuiIcon type="dashboardApp" color="subdued" aria-hidden={true} />
                  </EuiFlexItem>
                  <EuiFlexItem>
                    <EuiText size="s">
                      {d.href ? <EuiLink href={d.href}>{d.title}</EuiLink> : d.title}
                    </EuiText>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiFlexItem>
            ))}
          </EuiFlexGrid>
        )}
      </div>
    </div>
  );
};
