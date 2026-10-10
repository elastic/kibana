/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// PROTOTYPE: hard-coded step bodies for the Nginx onboarding wizard.

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
  EuiComboBox,
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
  EuiSwitch,
  EuiText,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';

import type { AgentPolicy, DataStream } from '../../../../../../../types';
import {
  ElasticsearchAssetType,
  KibanaSavedObjectType,
} from '../../../../../../../../common/types';
import {
  sendGetBulkAssets,
  sendGetDataStreams,
  sendGetPackageInfoByKey,
  useStartServices,
} from '../../../../../../../hooks';
import { useDiscoverLocator } from '../../../../../../../hooks/use_locator';

import type { NginxSchema, NginxStreamId, NginxValues, NginxOverrides } from './model';
import { SCHEMA_INFO, SIGNAL_INFO, STREAM_INFO, STREAM_TYPE, getTargetDataset } from './model';
import { ChoiceCard, SectionHeading, SharedSettingsCard, StreamCard } from './primitives';

const sectionGap = css({ display: 'flex', flexDirection: 'column', gap: 24 });

const MultiTextCombo: React.FC<{
  values: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  isInvalid?: boolean;
  'aria-label': string;
}> = ({ values, onChange, placeholder, isInvalid, 'aria-label': ariaLabel }) => (
  <EuiComboBox
    aria-label={ariaLabel}
    compressed
    noSuggestions
    fullWidth
    isInvalid={isInvalid}
    placeholder={placeholder}
    selectedOptions={values.map((label) => ({ label }))}
    onCreateOption={(value) => onChange([...values, value])}
    onChange={(options) => onChange(options.map((o) => o.label))}
  />
);

/* ---------- Step 1: schema & signals ---------- */

export type AgentPolicyMode = 'new' | 'existing';

export const SchemaSignalsStep: React.FC<{
  schema: NginxSchema;
  defaultSchema: NginxSchema;
  onSchemaChange: (schema: NginxSchema) => void;
  enabledStreams: Record<NginxStreamId, boolean>;
  onStreamsChange: (streams: Record<NginxStreamId, boolean>) => void;
  policyMode: AgentPolicyMode;
  onPolicyModeChange: (mode: AgentPolicyMode) => void;
  newPolicyName: string;
  onNewPolicyNameChange: (name: string) => void;
  existingPolicies: AgentPolicy[];
  existingPolicyId?: string;
  onExistingPolicyChange: (id: string) => void;
}> = (props) => {
  const { euiTheme } = useEuiTheme();
  const { enabledStreams, onStreamsChange } = props;
  const schemas: NginxSchema[] = [
    props.defaultSchema,
    props.defaultSchema === 'otel' ? 'ecs' : 'otel',
  ];

  return (
    <div css={sectionGap}>
      <div>
        <SectionHeading
          title="Data schema"
          info="How Nginx data is shaped in Elasticsearch. You can't change this after the integration is added - switching later means adding a new integration."
        />
        <EuiSpacer size="s" />
        <EuiFlexGroup gutterSize="s" responsive={false}>
          {schemas.map((s) => (
            <EuiFlexItem key={s}>
              <ChoiceCard
                control="radio"
                name="nginxWizardSchema"
                title={SCHEMA_INFO[s].title}
                description={SCHEMA_INFO[s].description}
                badge={s === props.defaultSchema ? 'Recommended' : undefined}
                checked={props.schema === s}
                onChange={() => props.onSchemaChange(s)}
                data-test-subj={`nginxWizardSchema-${s}`}
              />
            </EuiFlexItem>
          ))}
        </EuiFlexGroup>
      </div>

      <div>
        <SectionHeading title="Signals" />
        <EuiSpacer size="s" />
        <EuiFlexGroup gutterSize="s" responsive={false}>
          {(Object.keys(SIGNAL_INFO) as Array<keyof typeof SIGNAL_INFO>).map((signal) => {
            const info = SIGNAL_INFO[signal];
            const checked = info.streams.some((s) => enabledStreams[s]);
            return (
              <EuiFlexItem key={signal}>
                <ChoiceCard
                  control="checkbox"
                  title={info.title}
                  description={info.description}
                  checked={checked}
                  onChange={() => {
                    const next = { ...enabledStreams };
                    info.streams.forEach((s) => (next[s] = !checked));
                    onStreamsChange(next);
                  }}
                  data-test-subj={`nginxWizardSignal-${signal}`}
                >
                  <div
                    css={css({
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: `${euiTheme.size.xs} ${euiTheme.size.l}`,
                      marginTop: euiTheme.size.s,
                    })}
                  >
                    {info.streams.map((s) => (
                      <EuiCheckbox
                        key={s}
                        id={`nginxWizardStream-${s}`}
                        label={<EuiText size="xs">{STREAM_INFO[s].shortTitle}</EuiText>}
                        checked={enabledStreams[s]}
                        onChange={(e) =>
                          onStreamsChange({ ...enabledStreams, [s]: e.target.checked })
                        }
                      />
                    ))}
                  </div>
                </ChoiceCard>
              </EuiFlexItem>
            );
          })}
        </EuiFlexGroup>
      </div>

      <div>
        <SectionHeading
          title="Agent policy"
          description="Elastic Agent collects Nginx data from your hosts. Agent policies manage a group of integrations across a set of agents."
        />
        <EuiSpacer size="s" />
        <EuiPanel color="subdued" hasBorder paddingSize="m">
          <EuiFlexGroup gutterSize="l" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiRadio
                id="nginxWizardPolicyNew"
                name="nginxWizardPolicyMode"
                label="Create a new policy"
                checked={props.policyMode === 'new'}
                onChange={() => props.onPolicyModeChange('new')}
              />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiRadio
                id="nginxWizardPolicyExisting"
                name="nginxWizardPolicyMode"
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
                data-test-subj="nginxWizardNewPolicyName"
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
                data-test-subj="nginxWizardExistingPolicy"
              />
            </EuiFormRow>
          )}
        </EuiPanel>
      </div>
    </div>
  );
};

/* ---------- Steps 2 + 3: logs, metrics ---------- */

interface ConfigStepProps {
  schema: NginxSchema;
  values: NginxValues;
  onChange: (overrides: NginxOverrides) => void;
  enabledStreams: Record<NginxStreamId, boolean>;
  recap: React.ReactNode;
}

/** One-line reminder of the step 1 choices, with a link back to change them. */
export const StepRecap: React.FC<{
  schema: NginxSchema;
  policyLabel: string;
  onEdit: () => void;
}> = ({ schema, policyLabel, onEdit }) => (
  <EuiText size="xs" color="subdued" data-test-subj="nginxWizardRecap">
    {SCHEMA_INFO[schema].title} · {policyLabel} ·{' '}
    <EuiLink onClick={onEdit} data-test-subj="nginxWizardRecapEdit">
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

const TagsRow: React.FC<{ values: string[]; onChange: (v: string[]) => void }> = ({
  values,
  onChange,
}) => (
  <EuiFormRow label="Tags" fullWidth>
    <MultiTextCombo aria-label="Tags" values={values} onChange={onChange} />
  </EuiFormRow>
);

export const LogsStep: React.FC<ConfigStepProps> = ({
  schema,
  values,
  onChange,
  enabledStreams,
  recap,
}) => {
  const logStream = (id: 'access' | 'error') => {
    const pathsKey = id === 'access' ? 'accessPaths' : 'errorPaths';
    const olderKey = id === 'access' ? 'accessIgnoreOlder' : 'errorIgnoreOlder';
    const tagsKey = id === 'access' ? 'accessTags' : 'errorTags';
    return (
      <StreamCard
        key={id}
        title={STREAM_INFO[id].title}
        description={STREAM_INFO[id].description}
        data-test-subj={`nginxWizardStreamCard-${id}`}
        advanced={
          schema === 'ecs' ? (
            <TagsRow values={values[tagsKey]} onChange={(v) => onChange({ [tagsKey]: v })} />
          ) : undefined
        }
      >
        <EuiFlexGroup gutterSize="m">
          <EuiFlexItem grow={2}>
            <EuiFormRow
              label="Paths"
              fullWidth
              isInvalid={values[pathsKey].length === 0}
              error="At least one path is required"
            >
              <MultiTextCombo
                aria-label="Paths"
                values={values[pathsKey]}
                isInvalid={values[pathsKey].length === 0}
                placeholder="/var/log/nginx/*.log"
                onChange={(v) => onChange({ [pathsKey]: v })}
              />
            </EuiFormRow>
          </EuiFlexItem>
          <EuiFlexItem grow={1}>
            <EuiFormRow
              label="Ignore events older than"
              fullWidth
              labelAppend={
                schema === 'otel' ? (
                  <EuiText size="xs" color="subdued">
                    Optional
                  </EuiText>
                ) : undefined
              }
            >
              <EuiFieldText
                compressed
                fullWidth
                placeholder="72h"
                value={values[olderKey]}
                onChange={(e) => onChange({ [olderKey]: e.target.value })}
              />
            </EuiFormRow>
          </EuiFlexItem>
        </EuiFlexGroup>
      </StreamCard>
    );
  };
  const streams = (['access', 'error'] as const).filter((id) => enabledStreams[id]);

  return (
    <div css={sectionGap}>
      <StepIntro
        title="Logs"
        description={
          streams.length === 2
            ? 'Collect access and error logs from Nginx instances.'
            : `Collect ${streams[0]} logs from Nginx instances.`
        }
        recap={recap}
      />
      <SharedSettingsCard
        title="Global settings"
        description="Applies to all Nginx log inputs."
        advanced={
          schema === 'otel' ? (
            <EuiFormRow
              label="Read new files from"
              helpText="Where to start reading files seen for the first time."
            >
              <EuiSelect
                compressed
                value={values.readFrom}
                options={[
                  { value: 'end', text: 'End of file (new lines only)' },
                  { value: 'beginning', text: 'Beginning of file' },
                ]}
                onChange={(e) => onChange({ readFrom: e.target.value as 'end' | 'beginning' })}
              />
            </EuiFormRow>
          ) : (
            <EuiSwitch
              label="Preserve original event"
              checked={values.preserveOriginalEvent}
              onChange={(e) => onChange({ preserveOriginalEvent: e.target.checked })}
              compressed
            />
          )
        }
      />
      {streams.map(logStream)}
    </div>
  );
};

export const MetricsStep: React.FC<ConfigStepProps> = ({ schema, values, onChange, recap }) => (
  <div css={sectionGap}>
    <StepIntro
      title="Metrics"
      description="Collect stub_status connection and request metrics from Nginx instances."
      recap={recap}
    />
    <SharedSettingsCard title="Global settings" description="Applies to all Nginx metrics inputs.">
      <EuiFormRow
        label="Host"
        fullWidth
        helpText="Base URL of the Nginx server that exposes stub_status."
        isInvalid={!values.host.trim()}
        error="A host is required"
      >
        <EuiFieldText
          isInvalid={!values.host.trim()}
          compressed
          fullWidth
          value={values.host}
          onChange={(e) => onChange({ host: e.target.value })}
          data-test-subj="nginxWizardHost"
        />
      </EuiFormRow>
    </SharedSettingsCard>
    <StreamCard
      title={STREAM_INFO.metrics.title}
      description={STREAM_INFO.metrics.description}
      data-test-subj="nginxWizardStreamCard-metrics"
      advanced={
        schema === 'ecs' ? (
          <TagsRow values={values.metricsTags} onChange={(v) => onChange({ metricsTags: v })} />
        ) : undefined
      }
    >
      <EuiFlexGroup gutterSize="m">
        <EuiFlexItem>
          <EuiFormRow label="Period" fullWidth>
            <EuiFieldText
              compressed
              fullWidth
              value={values.period}
              onChange={(e) => onChange({ period: e.target.value })}
            />
          </EuiFormRow>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFormRow label="Server status path" fullWidth>
            <EuiFieldText
              compressed
              fullWidth
              value={values.statusPath}
              onChange={(e) => onChange({ statusPath: e.target.value })}
            />
          </EuiFormRow>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="s" />
      <EuiText size="xs" color="subdued">
        Collects from <EuiCode>{`${values.host.replace(/\/+$/, '')}${values.statusPath}`}</EuiCode>
      </EuiText>
    </StreamCard>
  </div>
);

/* ---------- Step 4: summary ---------- */

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
  schema: NginxSchema;
  pkgName: string;
  enabledStreams: Record<NginxStreamId, boolean>;
  agentPolicyName?: string;
  packagePolicyName?: string;
  onAddAgent: () => void;
  assetsHref: string;
}> = ({
  schema,
  pkgName,
  enabledStreams,
  agentPolicyName,
  packagePolicyName,
  onAddAgent,
  assetsHref,
}) => {
  const { euiTheme } = useEuiTheme();
  const discoverLocator = useDiscoverLocator();
  const dataStreams = useDataStreamPoll();
  const content = useInstalledContent(pkgName);
  const streams = (Object.keys(enabledStreams) as NginxStreamId[]).filter((s) => enabledStreams[s]);
  const rows = streams.map((id) => {
    const dataset = getTargetDataset(schema, id);
    const match = dataStreams
      .filter((ds) => ds.dataset === dataset && ds.type === STREAM_TYPE[id])
      .sort((a, b) => b.last_activity_ms - a.last_activity_ms)[0];
    const live = !!match && Date.now() - match.last_activity_ms < RECENT_MS;
    return { id, dataset, pattern: `${STREAM_TYPE[id]}-${dataset}-*`, match, live };
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
      <EuiPanel hasBorder paddingSize="l" data-test-subj="nginxWizardStatusCard">
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
                {allLive ? `Nginx is sending data · ${rows.length} streams` : 'Waiting for data'}
              </h3>
            </EuiTitle>
            <EuiText size="s" color="subdued">
              {allLive
                ? 'All selected data streams are receiving documents.'
                : `${liveRows.length} of ${rows.length} streams receiving · data shows up once an agent on this policy can reach Nginx`}
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiBadge color="hollow">Agent-based</EuiBadge>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiBadge color="hollow">{SCHEMA_INFO[schema].title}</EuiBadge>
              </EuiFlexItem>
              {exploreHref && (
                <EuiFlexItem grow={false}>
                  <EuiButton
                    size="s"
                    iconType="discoverApp"
                    href={exploreHref}
                    css={css({ marginLeft: euiTheme.size.s })}
                    data-test-subj="nginxWizardExploreDiscover"
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
            key={r.id}
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
              {STREAM_INFO[r.id].title} <EuiCode>{r.pattern}</EuiCode>
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
          data-test-subj="nginxWizardAddAgentCallout"
          text={
            <p>
              {packagePolicyName ? <strong>{packagePolicyName}</strong> : 'The integration'} was
              added to the <strong>{agentPolicyName ?? 'selected'}</strong> agent policy. Install
              Elastic Agent on your Nginx hosts with this policy, or check that existing agents can
              read the log paths and status URL.
            </p>
          }
          actionProps={{
            primary: {
              children: 'Add Elastic Agent',
              onClick: onAddAgent,
              'data-test-subj': 'nginxWizardAddAgent',
            },
          }}
        />
      )}

      <div data-test-subj="nginxWizardInstalledContent">
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
