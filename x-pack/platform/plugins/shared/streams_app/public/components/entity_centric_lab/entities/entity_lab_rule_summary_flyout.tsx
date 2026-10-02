/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import moment from 'moment';
import {
  EuiBadge,
  EuiButton,
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiCodeBlock,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiDescriptionList,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutResizable,
  EuiHorizontalRule,
  EuiIcon,
  EuiPanel,
  EuiPopover,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { AlertRow } from '@kbn/entity-centric-lab-flyout';
import { useKibana } from '../../../hooks/use_kibana';

export interface EntityLabRuleDetailFlyoutRequest {
  readonly ruleId: string;
  readonly ruleName: string;
  readonly entityName: string;
  readonly alertRow?: AlertRow;
}

interface SyntheticRule {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly tags: readonly string[];
  readonly kind: 'alert' | 'signal';
  readonly query: string;
  readonly dataSource: string;
  readonly groupKey: readonly string[];
  readonly timeField: string;
  readonly everyLabel: string;
  readonly lookbackLabel: string;
  readonly createdBy: string;
  readonly createdAt: string;
  readonly updatedBy: string;
  readonly updatedAt: string;
}

interface RuleProfile {
  readonly match: RegExp;
  readonly description: string;
  readonly tags: readonly string[];
  readonly dataSource: string;
  readonly groupKey: readonly string[];
  readonly buildQuery: (entityName: string) => string;
  readonly everyLabel: string;
  readonly lookbackLabel: string;
}

const RULE_PROFILES: readonly RuleProfile[] = [
  {
    match: /memory/i,
    description: 'Alerts when container memory usage approaches the configured Kubernetes limit.',
    tags: ['kubernetes', 'memory', 'capacity'],
    dataSource: 'metrics-kubernetes.container-*',
    groupKey: ['kubernetes.pod.name'],
    buildQuery: (entityName) =>
      [
        'FROM metrics-kubernetes.container-*',
        `| WHERE service.name == "${entityName}"`,
        '| STATS max_memory_pct = MAX(kubernetes.container.memory.usage.limit.pct) BY kubernetes.pod.name',
        '| WHERE max_memory_pct > 0.9',
      ].join('\n'),
    everyLabel: '1 min',
    lookbackLabel: '5 min',
  },
  {
    match: /cpu/i,
    description: 'Alerts when CPU usage exceeds the Kubernetes CPU limit for a sustained period.',
    tags: ['kubernetes', 'cpu', 'capacity'],
    dataSource: 'metrics-kubernetes.container-*',
    groupKey: ['kubernetes.pod.name'],
    buildQuery: (entityName) =>
      [
        'FROM metrics-kubernetes.container-*',
        `| WHERE service.name == "${entityName}"`,
        '| STATS avg_cpu_pct = AVG(kubernetes.container.cpu.usage.limit.pct) BY kubernetes.pod.name',
        '| WHERE avg_cpu_pct > 0.85',
      ].join('\n'),
    everyLabel: '1 min',
    lookbackLabel: '5 min',
  },
  {
    match: /latency|responsiveness/i,
    description: 'Alerts when p99 transaction latency breaches the service latency objective.',
    tags: ['apm', 'latency', 'slo'],
    dataSource: 'traces-apm-*',
    groupKey: ['service.name', 'transaction.name'],
    buildQuery: (entityName) =>
      [
        'FROM traces-apm-*',
        `| WHERE service.name == "${entityName}" AND processor.event == "transaction"`,
        '| STATS p99_latency_ms = PERCENTILE(transaction.duration.us, 99) / 1000 BY service.name, transaction.name',
        '| WHERE p99_latency_ms > 500',
      ].join('\n'),
    everyLabel: '1 min',
    lookbackLabel: '10 min',
  },
  {
    match: /availability|synthetic/i,
    description: 'Alerts when availability checks fail from more than one location.',
    tags: ['uptime', 'availability'],
    dataSource: 'synthetics-*',
    groupKey: ['monitor.id', 'observer.geo.name'],
    buildQuery: (entityName) =>
      [
        'FROM synthetics-*',
        `| WHERE service.name == "${entityName}"`,
        '| STATS down = COUNT(*) WHERE monitor.status == "down" BY monitor.id, observer.geo.name',
        '| WHERE down > 0',
      ].join('\n'),
    everyLabel: '1 min',
    lookbackLabel: '5 min',
  },
  {
    match: /disk/i,
    description: 'Alerts when filesystem usage on a node exceeds the disk pressure threshold.',
    tags: ['infrastructure', 'disk'],
    dataSource: 'metrics-system.filesystem-*',
    groupKey: ['host.name', 'system.filesystem.mount_point'],
    buildQuery: (entityName) =>
      [
        'FROM metrics-system.filesystem-*',
        `| WHERE service.name == "${entityName}"`,
        '| STATS max_used_pct = MAX(system.filesystem.used.pct) BY host.name, system.filesystem.mount_point',
        '| WHERE max_used_pct > 0.85',
      ].join('\n'),
    everyLabel: '5 min',
    lookbackLabel: '15 min',
  },
  {
    match: /restart/i,
    description: 'Alerts when pods restart more often than expected.',
    tags: ['kubernetes', 'stability'],
    dataSource: 'metrics-kubernetes.container-*',
    groupKey: ['kubernetes.pod.name'],
    buildQuery: (entityName) =>
      [
        'FROM metrics-kubernetes.container-*',
        `| WHERE service.name == "${entityName}"`,
        '| STATS restarts = MAX(kubernetes.container.status.restarts) - MIN(kubernetes.container.status.restarts) BY kubernetes.pod.name',
        '| WHERE restarts > 3',
      ].join('\n'),
    everyLabel: '5 min',
    lookbackLabel: '30 min',
  },
  {
    match: /network|error/i,
    description: 'Alerts when the error rate exceeds the service level objective.',
    tags: ['network', 'errors', 'slo'],
    dataSource: 'logs-*',
    groupKey: ['service.name'],
    buildQuery: (entityName) =>
      [
        'FROM logs-*',
        `| WHERE service.name == "${entityName}"`,
        '| STATS errors = COUNT(*) WHERE log.level == "error", total = COUNT(*) BY service.name',
        '| EVAL error_rate = errors / total',
        '| WHERE error_rate > 0.05',
      ].join('\n'),
    everyLabel: '1 min',
    lookbackLabel: '5 min',
  },
];

const DEFAULT_PROFILE: RuleProfile = {
  match: /.*/,
  description: 'Alerts when the monitored signal breaches its threshold.',
  tags: ['observability'],
  dataSource: 'metrics-*',
  groupKey: ['service.name'],
  buildQuery: (entityName) =>
    ['FROM metrics-*', `| WHERE service.name == "${entityName}"`, '| STATS count = COUNT(*)'].join(
      '\n'
    ),
  everyLabel: '1 min',
  lookbackLabel: '5 min',
};

const buildSyntheticRule = ({
  ruleId,
  ruleName,
  entityName,
}: EntityLabRuleDetailFlyoutRequest): SyntheticRule => {
  const profile = RULE_PROFILES.find(({ match }) => match.test(ruleName)) ?? DEFAULT_PROFILE;
  const isElasticManaged = ruleName.startsWith('[Elastic');
  return {
    id: ruleId,
    name: ruleName,
    description: profile.description,
    tags: isElasticManaged ? [...profile.tags, 'elastic-managed'] : profile.tags,
    kind: 'alert',
    query: profile.buildQuery(entityName),
    dataSource: profile.dataSource,
    groupKey: profile.groupKey,
    timeField: '@timestamp',
    everyLabel: profile.everyLabel,
    lookbackLabel: profile.lookbackLabel,
    createdBy: isElasticManaged ? 'elastic' : 'sre-oncall',
    createdAt: '2025-09-14T08:42:00.000Z',
    updatedBy: isElasticManaged ? 'elastic' : 'sre-oncall',
    updatedAt: '2025-11-28T16:05:00.000Z',
  };
};

const FLYOUT_TITLE_ID = 'entityLabRuleSummaryFlyoutTitle';

const NOT_AVAILABLE_TOAST = i18n.translate(
  'xpack.streams.entityCentricLab.ruleSummaryFlyout.notAvailable',
  { defaultMessage: 'Not available in this prototype' }
);

interface EntityLabRuleSummaryFlyoutProps {
  readonly request: EntityLabRuleDetailFlyoutRequest;
  readonly onClose: () => void;
}

/**
 * Mirrors the Alerting v2 `RuleSummaryFlyout` layout, fed with a synthetic rule
 * derived from the clicked alert row. Rendered as a stacked child flyout.
 */
export const EntityLabRuleSummaryFlyout = ({ request, onClose }: EntityLabRuleSummaryFlyoutProps) => {
  const {
    core: { uiSettings, notifications },
  } = useKibana();
  const rule = useMemo(() => buildSyntheticRule(request), [request]);
  const [isEnabled, setIsEnabled] = useState(true);
  const [isActionsOpen, setIsActionsOpen] = useState(false);

  const dateFormat = uiSettings.get<string>('dateFormat');
  const formatDate = (value: string) => moment(value).format(dateFormat);
  const showNotAvailable = () => notifications.toasts.addInfo(NOT_AVAILABLE_TOAST);

  const actionItems = [
    <EuiContextMenuItem
      key="edit"
      icon={<EuiIcon type="pencil" size="m" aria-hidden={true} />}
      onClick={() => {
        setIsActionsOpen(false);
        showNotAvailable();
      }}
    >
      {i18n.translate('xpack.streams.entityCentricLab.ruleSummaryFlyout.edit', {
        defaultMessage: 'Edit',
      })}
    </EuiContextMenuItem>,
    <EuiContextMenuItem
      key="clone"
      icon={<EuiIcon type="copy" size="m" aria-hidden={true} />}
      onClick={() => {
        setIsActionsOpen(false);
        showNotAvailable();
      }}
    >
      {i18n.translate('xpack.streams.entityCentricLab.ruleSummaryFlyout.clone', {
        defaultMessage: 'Clone',
      })}
    </EuiContextMenuItem>,
    <EuiContextMenuItem
      key="toggleEnabled"
      icon={<EuiIcon type={isEnabled ? 'bellSlash' : 'bell'} size="m" aria-hidden={true} />}
      onClick={() => {
        setIsActionsOpen(false);
        setIsEnabled((enabled) => !enabled);
      }}
    >
      {isEnabled
        ? i18n.translate('xpack.streams.entityCentricLab.ruleSummaryFlyout.disable', {
            defaultMessage: 'Disable',
          })
        : i18n.translate('xpack.streams.entityCentricLab.ruleSummaryFlyout.enable', {
            defaultMessage: 'Enable',
          })}
    </EuiContextMenuItem>,
    <EuiContextMenuItem
      key="delete"
      icon={<EuiIcon type="trash" size="m" color="danger" aria-hidden={true} />}
      onClick={() => {
        setIsActionsOpen(false);
        showNotAvailable();
      }}
    >
      {i18n.translate('xpack.streams.entityCentricLab.ruleSummaryFlyout.delete', {
        defaultMessage: 'Delete',
      })}
    </EuiContextMenuItem>,
  ];

  const conditionItems = [
    {
      title: i18n.translate('xpack.streams.entityCentricLab.ruleSummaryFlyout.dataSource', {
        defaultMessage: 'Data source',
      }),
      description: rule.dataSource,
    },
    {
      title: i18n.translate('xpack.streams.entityCentricLab.ruleSummaryFlyout.groupKey', {
        defaultMessage: 'Group key',
      }),
      description: rule.groupKey.join(', '),
    },
    {
      title: i18n.translate('xpack.streams.entityCentricLab.ruleSummaryFlyout.timeField', {
        defaultMessage: 'Time field',
      }),
      description: rule.timeField,
    },
    {
      title: i18n.translate('xpack.streams.entityCentricLab.ruleSummaryFlyout.schedule', {
        defaultMessage: 'Schedule',
      }),
      description: i18n.translate(
        'xpack.streams.entityCentricLab.ruleSummaryFlyout.scheduleValue',
        { defaultMessage: 'Every {interval}', values: { interval: rule.everyLabel } }
      ),
    },
    {
      title: i18n.translate('xpack.streams.entityCentricLab.ruleSummaryFlyout.lookback', {
        defaultMessage: 'Lookback',
      }),
      description: rule.lookbackLabel,
    },
    {
      title: i18n.translate('xpack.streams.entityCentricLab.ruleSummaryFlyout.mode', {
        defaultMessage: 'Mode',
      }),
      description: i18n.translate('xpack.streams.entityCentricLab.ruleSummaryFlyout.modeAlert', {
        defaultMessage: 'Alerting',
      }),
    },
  ].map(({ title, description }) => ({
    title,
    description: <EuiText size="s">{description}</EuiText>,
  }));

  const metadataItems = [
    {
      title: i18n.translate('xpack.streams.entityCentricLab.ruleSummaryFlyout.createdBy', {
        defaultMessage: 'Created by',
      }),
      description: rule.createdBy,
    },
    {
      title: i18n.translate('xpack.streams.entityCentricLab.ruleSummaryFlyout.createdDate', {
        defaultMessage: 'Created date',
      }),
      description: formatDate(rule.createdAt),
    },
    {
      title: i18n.translate('xpack.streams.entityCentricLab.ruleSummaryFlyout.lastUpdate', {
        defaultMessage: 'Last update',
      }),
      description: formatDate(rule.updatedAt),
    },
    {
      title: i18n.translate('xpack.streams.entityCentricLab.ruleSummaryFlyout.updatedBy', {
        defaultMessage: 'Updated by',
      }),
      description: rule.updatedBy,
    },
  ];

  const divider = (
    <EuiText size="s" color="text" aria-hidden={true}>
      |
    </EuiText>
  );

  return (
    <EuiFlyoutResizable
      size="s"
      session="inherit"
      ownFocus={false}
      hideCloseButton
      paddingSize="none"
      onClose={onClose}
      aria-labelledby={FLYOUT_TITLE_ID}
      data-test-subj="entityLabRuleSummaryFlyout"
    >
      <EuiPanel
        paddingSize="xs"
        hasShadow={false}
        hasBorder={false}
        borderRadius="none"
        color="transparent"
      >
        <EuiFlexGroup
          justifyContent="flexEnd"
          gutterSize="s"
          responsive={false}
          alignItems="center"
        >
          <EuiFlexItem grow={false}>
            <EuiPopover
              button={
                <EuiButtonIcon
                  iconType="boxesHorizontal"
                  color="text"
                  aria-label={i18n.translate(
                    'xpack.streams.entityCentricLab.ruleSummaryFlyout.moreActions',
                    { defaultMessage: 'More actions' }
                  )}
                  onClick={() => setIsActionsOpen((open) => !open)}
                />
              }
              isOpen={isActionsOpen}
              closePopover={() => setIsActionsOpen(false)}
              panelPaddingSize="none"
              anchorPosition="downRight"
              aria-label={i18n.translate(
                'xpack.streams.entityCentricLab.ruleSummaryFlyout.actionsMenu',
                { defaultMessage: 'Rule actions' }
              )}
            >
              <EuiContextMenuPanel size="s" items={actionItems} />
            </EuiPopover>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButtonIcon
              iconType="cross"
              color="text"
              onClick={onClose}
              aria-label={i18n.translate(
                'xpack.streams.entityCentricLab.ruleSummaryFlyout.close',
                { defaultMessage: 'Close' }
              )}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>
      <EuiHorizontalRule margin="none" />
      <EuiFlyoutBody>
        <EuiPanel
          paddingSize="m"
          hasShadow={false}
          hasBorder={false}
          borderRadius="none"
          color="transparent"
        >
          <EuiTitle size="s" id={FLYOUT_TITLE_ID}>
            <h2>
              <EuiFlexGroup direction="column" gutterSize="s">
                <EuiFlexItem grow={false}>
                  <span>{rule.name}</span>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiFlexGroup alignItems="center" gutterSize="m" wrap={false} responsive={false}>
                    <EuiFlexItem grow={false}>
                      <EuiFlexGroup
                        alignItems="center"
                        gutterSize="xs"
                        wrap={false}
                        responsive={false}
                      >
                        <EuiFlexItem grow={false}>
                          <EuiIcon type="bell" size="m" color="text" aria-hidden={true} />
                        </EuiFlexItem>
                        <EuiFlexItem grow={false}>
                          <EuiText size="s" color="text">
                            {i18n.translate(
                              'xpack.streams.entityCentricLab.ruleSummaryFlyout.kindAlert',
                              { defaultMessage: 'Alerting' }
                            )}
                          </EuiText>
                        </EuiFlexItem>
                      </EuiFlexGroup>
                    </EuiFlexItem>
                    <EuiFlexItem grow={false}>{divider}</EuiFlexItem>
                    <EuiFlexItem grow={false}>
                      {isEnabled ? (
                        <EuiBadge color="success">
                          {i18n.translate(
                            'xpack.streams.entityCentricLab.ruleSummaryFlyout.enabled',
                            { defaultMessage: 'Enabled' }
                          )}
                        </EuiBadge>
                      ) : (
                        <EuiBadge color="default">
                          {i18n.translate(
                            'xpack.streams.entityCentricLab.ruleSummaryFlyout.disabled',
                            { defaultMessage: 'Disabled' }
                          )}
                        </EuiBadge>
                      )}
                    </EuiFlexItem>
                  </EuiFlexGroup>
                </EuiFlexItem>
              </EuiFlexGroup>
            </h2>
          </EuiTitle>
          <EuiSpacer size="s" />
          <EuiFlexGroup direction="column" gutterSize="m">
            <EuiFlexItem grow={false}>
              <EuiText size="s" color="subdued">
                {rule.description}
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiFlexGroup gutterSize="xs" wrap responsive={false}>
                {rule.tags.map((tag) => (
                  <EuiFlexItem key={tag} grow={false}>
                    <EuiBadge color="hollow">{tag}</EuiBadge>
                  </EuiFlexItem>
                ))}
              </EuiFlexGroup>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiPanel>
        <EuiHorizontalRule margin="xs" />
        <EuiPanel
          paddingSize="m"
          hasShadow={false}
          hasBorder={false}
          borderRadius="none"
          color="transparent"
        >
          <EuiTitle size="s">
            <h2>
              {i18n.translate('xpack.streams.entityCentricLab.ruleSummaryFlyout.conditions', {
                defaultMessage: 'Rule conditions',
              })}
            </h2>
          </EuiTitle>
          <EuiSpacer size="m" />
          <EuiTitle size="xxs">
            <h3>
              {i18n.translate('xpack.streams.entityCentricLab.ruleSummaryFlyout.esqlQuery', {
                defaultMessage: 'ES|QL query',
              })}
            </h3>
          </EuiTitle>
          <EuiSpacer size="s" />
          <EuiCodeBlock language="esql" isCopyable overflowHeight={360} paddingSize="m">
            {rule.query}
          </EuiCodeBlock>
          <EuiSpacer size="l" />
          <EuiDescriptionList
            compressed
            type="column"
            listItems={conditionItems}
            css={{ maxWidth: 600 }}
          />
          <EuiHorizontalRule />
          <EuiTitle size="s">
            <h2>
              {i18n.translate('xpack.streams.entityCentricLab.ruleSummaryFlyout.metadata', {
                defaultMessage: 'Metadata',
              })}
            </h2>
          </EuiTitle>
          <EuiSpacer size="m" />
          <EuiDescriptionList
            compressed
            type="column"
            listItems={metadataItems}
            css={{ maxWidth: 600 }}
          />
        </EuiPanel>
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiPanel
          paddingSize="m"
          hasShadow={false}
          hasBorder={false}
          borderRadius="none"
          color="transparent"
        >
          <EuiFlexGroup justifyContent="spaceBetween">
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty onClick={onClose}>
                {i18n.translate('xpack.streams.entityCentricLab.ruleSummaryFlyout.cancel', {
                  defaultMessage: 'Cancel',
                })}
              </EuiButtonEmpty>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButton fill onClick={showNotAvailable}>
                {i18n.translate('xpack.streams.entityCentricLab.ruleSummaryFlyout.openDetails', {
                  defaultMessage: 'Open details',
                })}
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiPanel>
      </EuiFlyoutFooter>
    </EuiFlyoutResizable>
  );
};
