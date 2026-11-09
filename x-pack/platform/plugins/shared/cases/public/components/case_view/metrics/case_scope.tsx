/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import moment from 'moment';
import prettyMilliseconds from 'pretty-ms';
import {
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiLink,
  EuiPanel,
  EuiSkeletonText,
  EuiText,
  EuiTitle,
  EuiToolTip,
  useEuiTheme,
} from '@elastic/eui';
import type { CaseUI } from '../../../../common/ui/types';
import { CASE_VIEW_PAGE_TABS } from '../../../../common/types';
import { OBSERVABLE_TYPES_BUILTIN } from '../../../../common/constants';
import { CaseMetricsFeature } from '../../../../common/types/api';
import { useGetCaseMetrics } from '../../../containers/use_get_case_metrics';
import { useGetCaseConfiguration } from '../../../containers/configure/use_get_case_configuration';
import { useCasesFeatures } from '../../../common/use_cases_features';
import { useCaseViewNavigation } from '../../../common/navigation';
import {
  caseViewSectionRegistry,
  type CaseImpactedEntity,
} from '../../../client/case_view_sections';
import { CaseScopeMetrics } from './case_scope_metrics';
import * as i18n from './translations';

/** The panel shows at most this many entities and observable types, whatever the case holds. */
const TOP_ENTITIES = 3;
const TOP_TYPES = 4;

const duration = (ms: number) => prettyMilliseconds(ms, { compact: true, verbose: true });

const ENTITY_ICON: Record<CaseImpactedEntity['type'], string> = {
  host: 'compute',
  user: 'user',
  other: 'dot',
};

/** Impacted entities from registered sources first, then the case's alerts, without repeats. */
const useImpactedEntities = (
  caseData: CaseUI,
  alertHosts: Array<{ name?: string; id: string }>,
  alertUsers: Array<{ name: string }>
) =>
  useMemo(() => {
    const seen = new Set<string>();
    const entities: CaseImpactedEntity[] = [];
    const add = (entity: CaseImpactedEntity) => {
      const key = `${entity.type}:${entity.name.toLowerCase()}`;
      if (!entity.name || seen.has(key)) return;
      seen.add(key);
      entities.push(entity);
    };
    for (const source of caseViewSectionRegistry.getVisible('impact', caseData)) {
      source.getEntities(caseData).forEach(add);
    }
    alertHosts.forEach(({ name, id }) => add({ type: 'host', name: name ?? id }));
    alertUsers.forEach(({ name }) => add({ type: 'user', name }));
    return entities;
  }, [caseData, alertHosts, alertUsers]);

const Block: React.FC<{
  title: string;
  testSubj: string;
  divided?: boolean;
  children: React.ReactNode;
}> = ({ title, testSubj, divided = false, children }) => {
  const { euiTheme } = useEuiTheme();
  return (
    // A zero min-width lets the badges inside truncate instead of widening the block.
    <EuiFlexItem
      css={{
        minWidth: 0,
        ...(divided ? { borderLeft: euiTheme.border.thin, paddingLeft: euiTheme.size.l } : {}),
      }}
      data-test-subj={testSubj}
    >
      <EuiTitle size="xxxs">
        <h3>{title}</h3>
      </EuiTitle>
      <EuiFlexGroup direction="column" gutterSize="xs" responsive={false}>
        {children}
      </EuiFlexGroup>
    </EuiFlexItem>
  );
};
Block.displayName = 'ScopeBlock';

/**
 * The top of the case: what was affected, what the attack left behind, and the case's own
 * activity, in a fixed height however many hosts, users, or observables the case carries.
 */
export const CaseScope = React.memo(({ caseData }: { caseData: CaseUI }) => {
  const { metricsFeatures, observablesAuthorized, isObservablesFeatureEnabled } =
    useCasesFeatures();
  const { data, isLoading } = useGetCaseMetrics(caseData.id, metricsFeatures);
  const { data: configuration } = useGetCaseConfiguration();
  const { navigateToCaseView } = useCaseViewNavigation();
  const metrics = data?.metrics;

  const alertHosts = useMemo(() => metrics?.alerts?.hosts?.values ?? [], [metrics]);
  const alertUsers = useMemo(() => metrics?.alerts?.users?.values ?? [], [metrics]);
  const entities = useImpactedEntities(caseData, alertHosts, alertUsers);
  // The alerts total can exceed the top values the metrics return; take the larger of the two.
  const hosts = Math.max(
    entities.filter(({ type }) => type === 'host').length,
    metrics?.alerts?.hosts?.total ?? 0
  );
  const users = Math.max(
    entities.filter(({ type }) => type === 'user').length,
    metrics?.alerts?.users?.total ?? 0
  );
  const others = entities.filter(({ type }) => type === 'other').length;
  const totalEntities = hosts + users + others;

  const observableTypes = useMemo(() => {
    const labels = new Map(
      [...OBSERVABLE_TYPES_BUILTIN, ...(configuration?.observableTypes ?? [])].map(
        ({ key, label }) => [key, label]
      )
    );
    const counts = new Map<string, number>();
    for (const { typeKey } of caseData.observables ?? []) {
      counts.set(typeKey, (counts.get(typeKey) ?? 0) + 1);
    }
    return [...counts]
      .map(([key, count]) => ({ key, label: labels.get(key) ?? key, count }))
      .sort((a, b) => b.count - a.count);
  }, [caseData.observables, configuration?.observableTypes]);
  const showIndicators = observablesAuthorized && isObservablesFeatureEnabled;

  const goTo = (tabId: CASE_VIEW_PAGE_TABS) =>
    navigateToCaseView({ detailName: caseData.id, tabId });

  const lifespan = metricsFeatures.includes(CaseMetricsFeature.LIFESPAN)
    ? metrics?.lifespan
    : undefined;
  const status = lifespan?.statusInfo;

  return (
    <EuiPanel hasBorder hasShadow={false} paddingSize="m" data-test-subj="case-view-scope">
      <EuiFlexGroup gutterSize="l" wrap responsive={false} alignItems="flexStart">
        <Block title={i18n.SCOPE_IMPACTED} testSubj="case-view-scope-impacted">
          <EuiText size="s">
            <strong>{i18n.SCOPE_HOSTS(hosts)}</strong>
            {' · '}
            <strong>{i18n.SCOPE_USERS(users)}</strong>
          </EuiText>
          {entities.length === 0 ? (
            <EuiText size="xs" color="subdued">
              {i18n.SCOPE_NO_IMPACTED}
            </EuiText>
          ) : (
            <EuiFlexGroup gutterSize="xs" wrap responsive={false} alignItems="center">
              {entities.slice(0, TOP_ENTITIES).map((entity) => (
                <EuiFlexItem
                  grow={false}
                  key={`${entity.type}:${entity.name}`}
                  css={{ minWidth: 0 }}
                >
                  <EuiToolTip content={entity.name}>
                    <EuiBadge
                      color="hollow"
                      iconType={ENTITY_ICON[entity.type]}
                      css={{ maxWidth: '14em' }}
                      tabIndex={0}
                      data-test-subj="case-view-scope-entity"
                    >
                      {entity.name}
                    </EuiBadge>
                  </EuiToolTip>
                </EuiFlexItem>
              ))}
              {totalEntities > TOP_ENTITIES && (
                <EuiFlexItem grow={false}>
                  <EuiLink
                    aria-label={i18n.SCOPE_SHOW_IMPACT}
                    onClick={() => goTo(CASE_VIEW_PAGE_TABS.ATTACHMENTS)}
                    data-test-subj="case-view-scope-impacted-more"
                  >
                    <EuiText size="xs" className="eui-textNoWrap">
                      {i18n.SCOPE_MORE(totalEntities - TOP_ENTITIES)}
                    </EuiText>
                  </EuiLink>
                </EuiFlexItem>
              )}
            </EuiFlexGroup>
          )}
        </Block>

        {showIndicators && (
          <Block divided title={i18n.SCOPE_INDICATORS} testSubj="case-view-scope-indicators">
            <div>
              <EuiText size="s">
                <strong>{i18n.SCOPE_OBSERVABLES(caseData.observables?.length ?? 0)}</strong>
              </EuiText>
              {observableTypes.length === 0 ? (
                <EuiText size="xs" color="subdued">
                  {i18n.SCOPE_NO_OBSERVABLES}
                </EuiText>
              ) : (
                // Wraps rather than shrinking: at most TOP_TYPES chips, so never past two rows.
                <EuiFlexGroup gutterSize="xs" wrap responsive={false} alignItems="center">
                  {observableTypes.slice(0, TOP_TYPES).map((type) => (
                    <EuiFlexItem grow={false} key={type.key} css={{ minWidth: 0 }}>
                      <EuiBadge
                        color="hollow"
                        css={{ maxWidth: '12em' }}
                        onClick={() => goTo(CASE_VIEW_PAGE_TABS.OBSERVABLES)}
                        onClickAriaLabel={i18n.SCOPE_SHOW_TYPE(type.label)}
                        data-test-subj={`case-view-scope-type-${type.key}`}
                      >
                        {`${type.label} · ${type.count}`}
                      </EuiBadge>
                    </EuiFlexItem>
                  ))}
                  {observableTypes.length > TOP_TYPES && (
                    <EuiFlexItem grow={false}>
                      <EuiText size="xs" color="subdued" className="eui-textNoWrap">
                        {i18n.SCOPE_MORE_TYPES(observableTypes.length - TOP_TYPES)}
                      </EuiText>
                    </EuiFlexItem>
                  )}
                </EuiFlexGroup>
              )}
            </div>
          </Block>
        )}

        <Block divided title={i18n.SCOPE_ACTIVITY} testSubj="case-view-scope-activity">
          <div>
            {isLoading || !metrics ? (
              <EuiSkeletonText lines={2} size="s" />
            ) : (
              <EuiText size="xs" color="subdued">
                <div>
                  {[
                    metricsFeatures.includes(CaseMetricsFeature.ALERTS_COUNT)
                      ? i18n.SCOPE_ALERTS(metrics.alerts?.count ?? 0)
                      : undefined,
                    metricsFeatures.includes(CaseMetricsFeature.CONNECTORS)
                      ? i18n.SCOPE_CONNECTORS(metrics.connectors?.total ?? 0)
                      : undefined,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </div>
                {lifespan && status && (
                  <>
                    <div>
                      <EuiToolTip content={moment(lifespan.creationDate).format('LLL')}>
                        <span tabIndex={0}>
                          {i18n.SCOPE_OPENED(moment(lifespan.creationDate).fromNow())}
                        </span>
                      </EuiToolTip>
                      {status.openDuration > 0 &&
                        ` · ${i18n.SCOPE_OPEN_FOR(duration(status.openDuration))}`}
                    </div>
                    <div>
                      {[
                        status.inProgressDuration > 0 ? (
                          <span
                            key="in-progress"
                            data-test-subj="case-metrics-lifespan-item-inProgress-duration"
                          >
                            {i18n.SCOPE_IN_PROGRESS_FOR(duration(status.inProgressDuration))}
                          </span>
                        ) : undefined,
                        // A paused case says so even before any paused time has accrued.
                        status.pausedDuration > 0 || caseData.pausedAt ? (
                          <span
                            key="paused"
                            data-test-subj="case-metrics-lifespan-item-paused-duration"
                          >
                            {status.pausedDuration > 0
                              ? i18n.SCOPE_PAUSED_FOR(duration(status.pausedDuration))
                              : i18n.SCOPE_PAUSED_NOW}
                          </span>
                        ) : undefined,
                        lifespan.closeDate ? (
                          <span
                            key="closed"
                            data-test-subj="case-metrics-lifespan-item-open-to-close-duration"
                          >
                            {i18n.SCOPE_CLOSED_AFTER(
                              duration(
                                moment(lifespan.closeDate).diff(moment(lifespan.creationDate))
                              )
                            )}
                          </span>
                        ) : undefined,
                      ]
                        .filter(Boolean)
                        .flatMap((item, index) => (index > 0 ? [' · ', item] : [item]))}
                    </div>
                  </>
                )}
              </EuiText>
            )}
          </div>
        </Block>
      </EuiFlexGroup>
      {metricsFeatures.length > 0 && (
        <>
          <EuiHorizontalRule margin="s" />
          <CaseScopeMetrics metrics={metrics} features={metricsFeatures} isLoading={isLoading} />
        </>
      )}
    </EuiPanel>
  );
});
CaseScope.displayName = 'CaseScope';
