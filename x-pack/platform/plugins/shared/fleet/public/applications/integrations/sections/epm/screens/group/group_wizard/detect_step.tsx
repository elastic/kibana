/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// PROTOTYPE: last step, "Detect and review" (provisional name, DETECT_STEP_LABEL). One row per
// selected data stream with its own status: waiting (with the reason), receiving (event count in
// the last 15 minutes + last seen), or error (unhealthy agent input). Non-blocking: the user can
// leave at any time; errors stay on their row.

import React, { useEffect, useState } from 'react';
import { css } from '@emotion/react';
import moment from 'moment';
import { lastValueFrom } from 'rxjs';
import {
  EuiBadge,
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiCode,
  EuiFlexGrid,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLink,
  EuiLoadingSpinner,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';

import type { DataStream, PackagePolicy } from '../../../../../../../types';
import {
  ElasticsearchAssetType,
  KibanaSavedObjectType,
} from '../../../../../../../../common/types';
import {
  sendGetAgents,
  sendGetBulkAssets,
  sendGetDataStreams,
  sendGetPackageInfoByKey,
  useStartServices,
} from '../../../../../../../hooks';
import { useDiscoverLocator } from '../../../../../../../hooks/use_locator';

import type { DetectAgents, DetectStatus, WizardStream } from './model';
import { DETECT_STEP_LABEL, getAgentInputErrors, getDetectStatus, getSchemaInfo } from './model';
import { SectionHeading } from './primitives';

const POLL_MS = 5000;

export interface DetectRow {
  stream: WizardStream;
  /** Target dataset (with `.otel` where it applies). */
  dataset: string;
}

/** Polls data streams, recent event counts and the agent policy's agents. */
const useDetectPoll = ({
  rows,
  agentPolicyId,
  packagePolicy,
}: {
  rows: DetectRow[];
  agentPolicyId?: string;
  packagePolicy?: PackagePolicy;
}) => {
  const { data } = useStartServices();
  const [dataStreams, setDataStreams] = useState<DataStream[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>();
  const [agents, setAgents] = useState<DetectAgents>();
  const patterns = rows.map((r) => `${r.stream.signal}-${r.dataset}-*`).join(',');

  useEffect(() => {
    let cancelled = false;
    const poll = async () => {
      // PROTOTYPE: every call is best effort, a failing source just leaves its part unknown.
      const [dsRes, agentsRes, countRes] = await Promise.allSettled([
        sendGetDataStreams(),
        agentPolicyId
          ? sendGetAgents({
              kuery: `policy_id:"${agentPolicyId}"`,
              perPage: 50,
              showInactive: false,
            })
          : Promise.resolve(undefined),
        patterns
          ? lastValueFrom(
              data.search.search<any, any>({
                params: {
                  index: patterns,
                  ignore_unavailable: true,
                  allow_no_indices: true,
                  size: 0,
                  track_total_hits: false,
                  body: {
                    query: { range: { '@timestamp': { gte: 'now-15m' } } },
                    aggs: { datasets: { terms: { field: 'data_stream.dataset', size: 50 } } },
                  },
                },
              })
            )
          : Promise.resolve(undefined),
      ]);
      if (cancelled) return;
      if (dsRes.status === 'fulfilled' && dsRes.value) {
        setDataStreams(dsRes.value.data_streams);
      }
      if (agentsRes.status === 'fulfilled' && agentsRes.value?.data) {
        const items = agentsRes.value.data.items;
        setAgents({
          total: agentsRes.value.data.total,
          online: items.filter((a) => a.status !== 'offline').length,
          inputErrors: packagePolicy ? getAgentInputErrors(items, packagePolicy) : {},
        });
      }
      if (countRes.status === 'fulfilled' && countRes.value) {
        const buckets: Array<{ key: string; doc_count: number }> =
          countRes.value.rawResponse?.aggregations?.datasets?.buckets ?? [];
        setCounts(Object.fromEntries(buckets.map((b) => [b.key, b.doc_count])));
      }
    };
    poll();
    const interval = setInterval(poll, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [agentPolicyId, packagePolicy, patterns, data.search]);

  return { dataStreams, counts, agents };
};

const WAITING_TEXT: Record<Extract<DetectStatus, { kind: 'waiting' }>['reason'], string> = {
  checking: 'Checking',
  no_agents: 'Waiting - no Elastic Agent enrolled in this agent policy yet',
  agents_offline: 'Waiting - the agents on this policy are offline',
  no_data_yet: 'Waiting for the first events',
  agentless: 'Waiting - agentless collection is starting',
};

const StatusIcon: React.FC<{ status: DetectStatus }> = ({ status }) =>
  status.kind === 'receiving' ? (
    <EuiIcon type="checkCircle" color="success" aria-hidden={true} />
  ) : status.kind === 'error' ? (
    <EuiIcon type="error" color="danger" aria-hidden={true} />
  ) : (
    <EuiLoadingSpinner size="m" />
  );

const statusText = (status: DetectStatus) =>
  status.kind === 'receiving'
    ? `Receiving data${
        status.count !== undefined ? ` · ${status.count.toLocaleString()} events in 15 min` : ''
      } · last event ${moment(status.lastSeenMs).fromNow()}`
    : status.kind === 'error'
    ? `Error: ${status.message}`
    : WAITING_TEXT[status.reason];

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

export const DetectStep: React.FC<{
  title: string;
  schema: string;
  /** PROTOTYPE: group `schema_labels`. */
  schemaLabels?: Record<string, string>;
  pkgName: string;
  rows: DetectRow[];
  /** Saved package policy (agent-based), for agent input health. */
  packagePolicy?: PackagePolicy;
  isAgentless: boolean;
  agentPolicyId?: string;
  agentPolicyName?: string;
  onAddAgent: () => void;
  assetsHref: string;
}> = ({
  title,
  schema,
  schemaLabels,
  pkgName,
  rows,
  packagePolicy,
  isAgentless,
  agentPolicyId,
  agentPolicyName,
  onAddAgent,
  assetsHref,
}) => {
  const { euiTheme } = useEuiTheme();
  const discoverLocator = useDiscoverLocator();
  const { dataStreams, counts, agents } = useDetectPoll({
    rows,
    agentPolicyId: isAgentless ? undefined : agentPolicyId,
    packagePolicy,
  });
  const content = useInstalledContent(pkgName);
  const statuses = rows.map((r) => ({
    ...r,
    status: getDetectStatus({ ...r, dataStreams, counts, agents, isAgentless }),
  }));
  const receiving = statuses.filter((r) => r.status.kind === 'receiving');
  const errors = statuses.filter((r) => r.status.kind === 'error');
  const [exploreHref, setExploreHref] = useState<string>();
  const patterns = receiving.map((r) => `${r.stream.signal}-${r.dataset}-*`).join(', ');
  useEffect(() => {
    if (!discoverLocator || !patterns) return setExploreHref(undefined);
    discoverLocator
      .getUrl({ query: { esql: `FROM ${patterns}` }, timeRange: { from: 'now-15m', to: 'now' } })
      .then(setExploreHref)
      .catch(() => setExploreHref(undefined));
  }, [discoverLocator, patterns]);

  const headline =
    rows.length === 0
      ? `${title} was added without data collection`
      : receiving.length === rows.length
      ? `${title} is sending data · ${rows.length} data streams`
      : errors.length
      ? `${errors.length} of ${rows.length} data streams have errors`
      : `${receiving.length} of ${rows.length} data streams receiving data`;

  return (
    <div css={css({ display: 'flex', flexDirection: 'column', gap: 32 })}>
      <div>
        <EuiTitle size="xs">
          <h2>{DETECT_STEP_LABEL}</h2>
        </EuiTitle>
        <EuiText size="xs" color="subdued" css={css({ marginTop: 4 })}>
          {title} is added. Status updates live - you can leave this page at any time.
        </EuiText>
      </div>

      <EuiPanel hasBorder paddingSize="l" data-test-subj="groupWizardStatusCard">
        <EuiFlexGroup alignItems="center" responsive={false}>
          <EuiFlexItem>
            <EuiTitle size="xs">
              <h3>{headline}</h3>
            </EuiTitle>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiBadge color="hollow">{isAgentless ? 'Agentless' : 'Elastic Agent'}</EuiBadge>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiBadge color="hollow">{getSchemaInfo(schema, schemaLabels).title}</EuiBadge>
              </EuiFlexItem>
              {!isAgentless && agents?.total === 0 && rows.length > 0 && (
                <EuiFlexItem grow={false}>
                  <EuiButton
                    size="s"
                    fill
                    iconType="plusInCircle"
                    onClick={onAddAgent}
                    css={css({ marginLeft: euiTheme.size.s })}
                    data-test-subj="groupWizardAddAgent"
                  >
                    Add Elastic Agent
                  </EuiButton>
                </EuiFlexItem>
              )}
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
        {!isAgentless && agentPolicyName && rows.length > 0 && (
          <EuiText size="xs" color="subdued" css={css({ marginTop: euiTheme.size.xs })}>
            Agent policy: {agentPolicyName}
            {agents ? ` · ${agents.total} agents enrolled, ${agents.online} online` : ''}
          </EuiText>
        )}
        <EuiSpacer size="m" />
        {rows.length === 0 && (
          <EuiText size="s" color="subdued" data-test-subj="groupWizardDetectAssetsOnly">
            Every input is turned off, so there is nothing to detect. The assets below are
            installed. Turn inputs on from the integration&apos;s policy to start collecting.
          </EuiText>
        )}
        {statuses.map((r) => (
          <div
            key={r.stream.id}
            data-test-subj={`groupWizardDetectRow-${r.stream.dataset}`}
            css={css({
              display: 'flex',
              alignItems: 'center',
              gap: euiTheme.size.m,
              padding: `${euiTheme.size.s} 0`,
              borderTop: `1px solid ${euiTheme.colors.borderBaseSubdued}`,
            })}
          >
            <StatusIcon status={r.status} />
            <EuiText size="s" css={css({ flex: 1 })}>
              {r.stream.title} <EuiCode>{`${r.stream.signal}-${r.dataset}-*`}</EuiCode>
            </EuiText>
            <EuiText
              size="xs"
              color={
                r.status.kind === 'error'
                  ? 'danger'
                  : r.status.kind === 'receiving'
                  ? 'success'
                  : 'subdued'
              }
              css={css({ maxWidth: '45%', textAlign: 'right' })}
              data-test-subj="groupWizardDetectStatus"
            >
              {statusText(r.status)}
            </EuiText>
          </div>
        ))}
      </EuiPanel>

      {!isAgentless && agents?.total === 0 && rows.length > 0 && (
        <EuiCallOut
          announceOnMount={false}
          iconType="info"
          title="Add Elastic Agent to start collecting"
          data-test-subj="groupWizardAddAgentCallout"
        >
          <p>
            {packagePolicy?.name ? <strong>{packagePolicy.name}</strong> : 'The integration'} was
            added to the <strong>{agentPolicyName ?? 'selected'}</strong> agent policy, which has no
            agents yet. Install Elastic Agent on your {title} hosts with this policy.
          </p>
        </EuiCallOut>
      )}

      <div data-test-subj="groupWizardInstalledContent">
        <EuiFlexGroup alignItems="center" responsive={false}>
          <EuiFlexItem>
            <SectionHeading
              title="Installed assets"
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
