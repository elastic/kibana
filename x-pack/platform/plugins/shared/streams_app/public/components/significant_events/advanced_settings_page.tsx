/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiBadge,
  EuiBasicTable,
  EuiBottomBar,
  EuiButton,
  EuiButtonEmpty,
  EuiButtonGroup,
  EuiButtonIcon,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiFieldSearch,
  EuiFilterButton,
  EuiFilterGroup,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiHealth,
  EuiIcon,
  EuiLink,
  EuiLoadingSpinner,
  EuiPanel,
  EuiPopover,
  EuiSelect,
  EuiSplitButton,
  EuiSwitch,
  EuiText,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import React, { useState } from 'react';
import { useStreamsAppBreadcrumbs } from '../../hooks/use_streams_app_breadcrumbs';
import { StreamsAppPageTemplate } from '../streams_app_page_template';
import { JobsTab } from './jobs_tab';
import { RuleDetailFlyout } from './rule_detail_flyout';
import { SuggestedRulesFlyout, MOCK_RULES } from './suggested_rules_flyout';
import type { SuggestedRule } from './suggested_rules_flyout';

// ─── Types ────────────────────────────────────────────────────────────────────

interface StreamRow {
  id: string;
  name: string;
  kis: number | null;
  queries: number | null;
  rules: number | null;
  events: number;
  sparkline: number[];
}

// ─── Mock data ────────────────────────────────────────────────────────────────

const MOCK_STREAMS: StreamRow[] = [
  {
    id: 'logs',
    name: 'logs',
    kis: 27,
    queries: 27,
    rules: 8,
    events: 6700,
    sparkline: [2, 3, 5, 4, 8, 12, 9, 14, 11, 16, 18, 14],
  },
  {
    id: 'logs.auditbeat.8.16.0',
    name: 'logs.auditbeat.8.16.0',
    kis: 43,
    queries: 43,
    rules: 22,
    events: 8600,
    sparkline: [4, 6, 5, 9, 7, 11, 14, 10, 16, 13, 18, 16],
  },
  {
    id: 'logs.awsfirehose',
    name: 'logs.awsfirehose',
    kis: 77,
    queries: 77,
    rules: 17,
    events: 7900,
    sparkline: [6, 8, 10, 7, 12, 9, 15, 13, 18, 16, 20, 18],
  },
  {
    id: 'logs.awsfirehose.us-west-1',
    name: 'logs.awsfirehose.us-west-1',
    kis: 85,
    queries: 85,
    rules: 12,
    events: 3700,
    sparkline: [3, 5, 4, 7, 6, 9, 8, 11, 10, 8, 12, 9],
  },
  {
    id: 'logs.awsfirehose.us-east-1',
    name: 'logs.awsfirehose.us-east-1',
    kis: 12,
    queries: 12,
    rules: 4,
    events: 2900,
    sparkline: [2, 3, 2, 4, 3, 5, 4, 6, 5, 7, 6, 8],
  },
  {
    id: 'logs.awsfirehose.us-east-1-cloudtrail',
    name: 'logs.awsfirehose.us-east-1-cloudtrail',
    kis: 41,
    queries: 41,
    rules: 9,
    events: 9200,
    sparkline: [5, 7, 9, 8, 12, 14, 11, 16, 18, 15, 20, 22],
  },
  {
    id: 'logs.awsfirehose.us-east-1-vpcflow',
    name: 'logs.awsfirehose.us-east-1-vpcflow',
    kis: 43,
    queries: 43,
    rules: 23,
    events: 3600,
    sparkline: [4, 5, 3, 6, 5, 8, 7, 9, 8, 10, 9, 11],
  },
  {
    id: 'logs.apache',
    name: 'logs.apache',
    kis: null,
    queries: null,
    rules: null,
    events: 2100,
    sparkline: [3, 2, 4, 3, 5, 4, 6, 5, 4, 6, 5, 7],
  },
  {
    id: 'logs.system',
    name: 'logs.system',
    kis: 54,
    queries: 54,
    rules: 2,
    events: 2100,
    sparkline: [2, 3, 4, 3, 5, 4, 6, 5, 7, 6, 8, 7],
  },
];

const TABS = [
  {
    id: 'streams' as const,
    label: i18n.translate('xpack.streams.settings.tabs.streams', {
      defaultMessage: 'Streams',
    }),
  },
  {
    id: 'knowledge_indicators' as const,
    label: i18n.translate('xpack.streams.settings.tabs.knowledgeIndicators', {
      defaultMessage: 'Knowledge indicators',
    }),
  },
  {
    id: 'rules' as const,
    label: i18n.translate('xpack.streams.settings.tabs.rules', {
      defaultMessage: 'Rules',
    }),
  },
  {
    id: 'advanced' as const,
    label: i18n.translate('xpack.streams.settings.tabs.advanced', {
      defaultMessage: 'Advanced',
    }),
  },
  {
    id: 'jobs' as const,
    label: i18n.translate('xpack.streams.settings.tabs.jobs', {
      defaultMessage: 'Workflows',
    }),
  },
];

type TabId = (typeof TABS)[number]['id'];

// ─── Sparkline ────────────────────────────────────────────────────────────────

function Sparkline({ values }: { values: number[] }) {
  const { euiTheme } = useEuiTheme();
  const max = Math.max(...values);
  const height = 24;
  const barWidth = 4;
  const gap = 1;

  return (
    <div
      css={css`
        display: flex;
        align-items: flex-end;
        gap: ${gap}px;
        height: ${height}px;
      `}
    >
      {values.map((v, i) => (
        <div
          key={i}
          css={css`
            width: ${barWidth}px;
            height: ${Math.max(2, Math.round((v / max) * height))}px;
            background: ${euiTheme.colors.vis.euiColorVisDanger0};
            border-radius: 1px;
          `}
        />
      ))}
    </div>
  );
}

// ─── Tab content ──────────────────────────────────────────────────────────────

function StreamsTab() {
  const { euiTheme } = useEuiTheme();
  const [selectedItems, setSelectedItems] = useState<StreamRow[]>([]);
  const [isGeneratePopoverOpen, setIsGeneratePopoverOpen] = useState(false);

  const columns = [
    {
      field: 'name' as const,
      name: i18n.translate('xpack.streams.settings.streamsTab.nameColumn', {
        defaultMessage: 'Name',
      }),
      sortable: true,
      render: (name: string) => (
        <EuiLink>
          <span
            css={css`
              font-size: 14px;
              font-weight: ${euiTheme.font.weight.regular};
            `}
          >
            {name}
          </span>
        </EuiLink>
      ),
    },
    {
      field: 'kis' as const,
      name: i18n.translate('xpack.streams.settings.streamsTab.kisColumn', {
        defaultMessage: 'KIs',
      }),
      width: '80px',
      align: 'right' as const,
      render: (v: number | null) =>
        v === null ? (
          <EuiText size="s" color="subdued">
            <span>—</span>
          </EuiText>
        ) : (
          <EuiText size="s">
            <span>{v}</span>
          </EuiText>
        ),
    },
    {
      field: 'queries' as const,
      name: i18n.translate('xpack.streams.settings.streamsTab.queriesColumn', {
        defaultMessage: 'Queries',
      }),
      width: '90px',
      align: 'right' as const,
      render: (v: number | null) =>
        v === null ? (
          <EuiText size="s" color="subdued">
            <span>—</span>
          </EuiText>
        ) : (
          <EuiText size="s">
            <span>{v}</span>
          </EuiText>
        ),
    },
    {
      field: 'rules' as const,
      name: i18n.translate('xpack.streams.settings.streamsTab.rulesColumn', {
        defaultMessage: 'Rules',
      }),
      width: '80px',
      align: 'right' as const,
      render: (v: number | null) =>
        v === null ? (
          <EuiText size="s" color="subdued">
            <span>—</span>
          </EuiText>
        ) : (
          <EuiText size="s">
            <span>{v}</span>
          </EuiText>
        ),
    },
    {
      field: 'events' as const,
      name: i18n.translate('xpack.streams.settings.streamsTab.eventsColumn', {
        defaultMessage: 'Events',
      }),
      width: '200px',
      render: (events: number, row: StreamRow) => (
        <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiText size="s">
              <span>{events.toLocaleString()}</span>
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <Sparkline values={row.sparkline} />
          </EuiFlexItem>
        </EuiFlexGroup>
      ),
    },
    {
      name: i18n.translate('xpack.streams.settings.streamsTab.actionsColumn', {
        defaultMessage: 'Actions',
      }),
      width: '60px',
      actions: [
        {
          render: () => (
            <EuiButtonIcon
              iconType="boxesVertical"
              size="xs"
              color="text"
              aria-label={i18n.translate('xpack.streams.settings.streamsTab.rowActionsAriaLabel', {
                defaultMessage: 'Row actions',
              })}
            />
          ),
        },
      ],
    },
  ];

  const selection = {
    onSelectionChange: setSelectedItems,
    selected: selectedItems,
  };

  return (
    <div>
      {/* Toolbar */}
      <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiText size="s" color="subdued">
            <span>
              {i18n.translate('xpack.streams.settings.streamsTab.streamCount', {
                defaultMessage: '{count} Streams',
                values: { count: MOCK_STREAMS.length },
              })}
            </span>
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiSplitButton size="s" data-test-subj="streamsSettingsGenerateButton">
            <EuiSplitButton.ActionPrimary iconType="sparkles">
              {i18n.translate('xpack.streams.settings.streamsTab.generateButton', {
                defaultMessage: 'Generate',
              })}
            </EuiSplitButton.ActionPrimary>
            <EuiSplitButton.ActionSecondary
              aria-label={i18n.translate('xpack.streams.settings.streamsTab.generateOptions', {
                defaultMessage: 'More generation options',
              })}
              onClick={() => setIsGeneratePopoverOpen((open) => !open)}
              popoverProps={{
                isOpen: isGeneratePopoverOpen,
                closePopover: () => setIsGeneratePopoverOpen(false),
                panelPaddingSize: 'none',
                children: (
                  <EuiContextMenuPanel
                    items={[
                      <EuiContextMenuItem
                        key="feature"
                        icon="indexPatternApp"
                        data-test-subj="streamsSettingsFeatureGenerationItem"
                        onClick={() => setIsGeneratePopoverOpen(false)}
                      >
                        {i18n.translate('xpack.streams.settings.streamsTab.featureGeneration', {
                          defaultMessage: 'Feature generation',
                        })}
                      </EuiContextMenuItem>,
                      <EuiContextMenuItem
                        key="query"
                        icon="search"
                        data-test-subj="streamsSettingsQueryGenerationItem"
                        onClick={() => setIsGeneratePopoverOpen(false)}
                      >
                        {i18n.translate('xpack.streams.settings.streamsTab.queryGeneration', {
                          defaultMessage: 'Query generation',
                        })}
                      </EuiContextMenuItem>,
                    ]}
                  />
                ),
              }}
            />
          </EuiSplitButton>
        </EuiFlexItem>
      </EuiFlexGroup>

      {/* Table */}
      <EuiBasicTable<StreamRow>
        items={MOCK_STREAMS}
        itemId="id"
        columns={columns}
        selection={selection}
        tableCaption={i18n.translate('xpack.streams.settings.streamsTab.tableCaption', {
          defaultMessage: 'Streams table',
        })}
        css={css`
          margin-top: ${euiTheme.size.s};

          .euiTableHeaderCell .euiTableCellContent {
            font-weight: ${euiTheme.font.weight.semiBold};
          }
        `}
      />
    </div>
  );
}

// ─── LLM options ──────────────────────────────────────────────────────────────


const LLM_SELECT_OPTIONS = [
  {
    value: 'elastic_managed',
    text: i18n.translate('xpack.streams.settings.advancedTab.llm.elasticManaged', {
      defaultMessage: 'Elastic Managed LLM',
    }),
  },
  {
    value: 'openai',
    text: i18n.translate('xpack.streams.settings.advancedTab.llm.openai', {
      defaultMessage: 'OpenAI',
    }),
  },
  {
    value: 'anthropic',
    text: i18n.translate('xpack.streams.settings.advancedTab.llm.anthropic', {
      defaultMessage: 'Anthropic Claude',
    }),
  },
];

interface LlmConfig {
  mode: string;
  singleLlm: string;
  kiLlm: string;
  rulesLlm: string;
  sigEventLlm: string;
}

const DEFAULT_LLM_CONFIG: LlmConfig = {
  mode: 'single',
  singleLlm: 'elastic_managed',
  kiLlm: 'elastic_managed',
  rulesLlm: 'elastic_managed',
  sigEventLlm: 'elastic_managed',
};

function configsEqual(a: LlmConfig, b: LlmConfig) {
  return (
    a.mode === b.mode &&
    a.singleLlm === b.singleLlm &&
    a.kiLlm === b.kiLlm &&
    a.rulesLlm === b.rulesLlm &&
    a.sigEventLlm === b.sigEventLlm
  );
}

function AdvancedTab() {
  const { euiTheme } = useEuiTheme();
  const [savedConfig, setSavedConfig] = useState<LlmConfig>(DEFAULT_LLM_CONFIG);
  const [currentConfig, setCurrentConfig] = useState<LlmConfig>(DEFAULT_LLM_CONFIG);

  const isDirty = !configsEqual(currentConfig, savedConfig);

  const handleCancel = () => setCurrentConfig(savedConfig);
  const handleSave = () => setSavedConfig(currentConfig);

  const selectCss = css`
    min-width: 320px;
  `;

  return (
    <div
      css={css`
        display: flex;
        flex-direction: column;
        gap: ${euiTheme.size.l};
      `}
    >
      {/* LLM configuration section */}
      <EuiPanel
        paddingSize="none"
        hasBorder
        hasShadow={false}
        css={css`
          overflow: hidden;
        `}
      >
        {/* Section header */}
        <div
          css={css`
            background: ${euiTheme.colors.backgroundBaseSubdued};
            padding: ${euiTheme.size.base};
            border-bottom: 1px solid ${euiTheme.colors.borderBaseSubdued};
          `}
        >
          <EuiTitle size="xs">
            <h3>
              {i18n.translate('xpack.streams.settings.advancedTab.llmConfig.title', {
                defaultMessage: 'LLM configuration',
              })}
            </h3>
          </EuiTitle>
        </div>

        {/* Section body */}
        <div
          css={css`
            padding: ${euiTheme.size.l} ${euiTheme.size.base};
          `}
        >
          <EuiFlexGroup gutterSize="xl" alignItems="flexStart" responsive={false}>
            {/* Left: label + description */}
            <EuiFlexItem
              grow={false}
              css={css`
                width: 435px;
              `}
            >
              <EuiText size="s">
                <strong>
                  {i18n.translate('xpack.streams.settings.advancedTab.defaultLlm.label', {
                    defaultMessage: 'Default LLM',
                  })}
                </strong>
              </EuiText>
              <EuiText size="xs" color="subdued">
                <p>
                  {i18n.translate('xpack.streams.settings.advancedTab.defaultLlm.description', {
                    defaultMessage:
                      'Specify the LLM to use for each step of the pipeline.',
                  })}
                </p>
              </EuiText>
            </EuiFlexItem>

            {/* Right: three pipeline dropdowns */}
            <EuiFlexItem grow={false}>
              <EuiFlexGroup direction="column" gutterSize="m" responsive={false}>
                <EuiFlexItem grow={false}>
                  <EuiFormRow
                    label={i18n.translate('xpack.streams.settings.advancedTab.kiConfig.label', {
                      defaultMessage: 'Knowledge indicator config',
                    })}
                  >
                    <EuiSelect
                      options={LLM_SELECT_OPTIONS}
                      value={currentConfig.kiLlm}
                      onChange={(e) =>
                        setCurrentConfig((prev) => ({ ...prev, kiLlm: e.target.value }))
                      }
                      css={selectCss}
                      data-test-subj="streamsSettingsKiLlmSelect"
                    />
                  </EuiFormRow>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiFormRow
                    label={i18n.translate(
                      'xpack.streams.settings.advancedTab.rulesConfig.label',
                      { defaultMessage: 'Rules generation config' }
                    )}
                  >
                    <EuiSelect
                      options={LLM_SELECT_OPTIONS}
                      value={currentConfig.rulesLlm}
                      onChange={(e) =>
                        setCurrentConfig((prev) => ({ ...prev, rulesLlm: e.target.value }))
                      }
                      css={selectCss}
                      data-test-subj="streamsSettingsRulesLlmSelect"
                    />
                  </EuiFormRow>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiFormRow
                    label={i18n.translate(
                      'xpack.streams.settings.advancedTab.sigEventLlm.label',
                      { defaultMessage: 'Significant event LLM' }
                    )}
                  >
                    <EuiSelect
                      options={LLM_SELECT_OPTIONS}
                      value={currentConfig.sigEventLlm}
                      onChange={(e) =>
                        setCurrentConfig((prev) => ({ ...prev, sigEventLlm: e.target.value }))
                      }
                      css={selectCss}
                      data-test-subj="streamsSettingsSigEventLlmSelect"
                    />
                  </EuiFormRow>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
          </EuiFlexGroup>
        </div>
      </EuiPanel>

      {/* Save footer — right-aligned, only visible when there are unsaved changes */}
      {isDirty && (
        <EuiBottomBar usePortal={false} paddingSize="s">
          <EuiFlexGroup
            justifyContent="flexEnd"
            alignItems="center"
            gutterSize="s"
            responsive={false}
          >
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                color="text"
                size="s"
                onClick={handleCancel}
                data-test-subj="streamsSettingsAdvancedCancelButton"
              >
                {i18n.translate('xpack.streams.settings.advancedTab.cancelButton', {
                  defaultMessage: 'Cancel',
                })}
              </EuiButtonEmpty>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButton
                fill
                color="primary"
                size="s"
                onClick={handleSave}
                data-test-subj="streamsSettingsAdvancedSaveButton"
              >
                {i18n.translate('xpack.streams.settings.advancedTab.saveButton', {
                  defaultMessage: 'Save changes',
                })}
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiBottomBar>
      )}
    </div>
  );
}

// ─── Knowledge Indicators tab ─────────────────────────────────────────────────

interface KiRow {
  id: string;
  name: string;
  events: number | null;
  sparkline: number[] | null;
  type: string;
  confidence: number;
  stream: string;
}

const MOCK_KI: KiRow[] = [
  { id: '1', name: 'OpenSSH Service', events: null, sparkline: null, type: 'Infrastructure', confidence: 99, stream: 'logs.nginx' },
  { id: '2', name: 'Docker Container', events: 99, sparkline: [2, 4, 3, 6, 8, 5, 9, 7, 11, 8, 12, 10], type: 'Query', confidence: 85, stream: 'docker.logs' },
  { id: '3', name: 'MySQL Database', events: null, sparkline: null, type: 'Database', confidence: 70, stream: 'mysql.logs' },
  { id: '4', name: 'Apache Server', events: null, sparkline: null, type: 'Web', confidence: 90, stream: 'apache.logs' },
  { id: '5', name: 'Kubernetes Cluster', events: null, sparkline: null, type: 'Orchestration', confidence: 95, stream: 'k8s.logs' },
  { id: '6', name: 'Redis Cache', events: null, sparkline: null, type: 'Cache', confidence: 80, stream: 'redis.logs' },
  { id: '7', name: 'Jenkins CI', events: null, sparkline: null, type: 'CI/CD', confidence: 75, stream: 'jenkins.logs' },
  { id: '8', name: 'PostgreSQL Database', events: null, sparkline: null, type: 'Database', confidence: 65, stream: 'postgresql.logs' },
  { id: '9', name: 'Nginx Load Balancer', events: null, sparkline: null, type: 'Load Balancing', confidence: 88, stream: 'nginx.logs' },
  { id: '10', name: 'RabbitMQ Message Broker', events: null, sparkline: null, type: 'Messaging', confidence: 78, stream: 'rabbitmq.logs' },
  { id: '11', name: 'Elasticsearch Service', events: null, sparkline: null, type: 'Search', confidence: 92, stream: 'elasticsearch.logs' },
  { id: '12', name: 'MongoDB', events: null, sparkline: null, type: 'Database', confidence: 82, stream: 'mongodb.logs' },
  { id: '13', name: 'VPN Service', events: null, sparkline: null, type: 'Networking', confidence: 86, stream: 'vpn.logs' },
  { id: '14', name: 'Grafana Dashboard', events: 348, sparkline: [3, 5, 4, 8, 6, 10, 8, 14, 11, 16, 13, 18], type: 'Query', confidence: 91, stream: 'grafana.logs' },
  { id: '15', name: 'Prometheus Monitor', events: null, sparkline: null, type: 'Monitoring', confidence: 89, stream: 'prometheus.logs' },
  { id: '16', name: 'AWS Lambda Function', events: null, sparkline: null, type: 'Serverless', confidence: 84, stream: 'lambda.logs' },
];

const MOCK_KI_EXCLUDED: KiRow[] = [
  { id: 'e1', name: 'Legacy Syslog Collector', events: null, sparkline: null, type: 'Infrastructure', confidence: 42, stream: 'syslog.legacy' },
  { id: 'e2', name: 'Deprecated Log Shipper', events: null, sparkline: null, type: 'Logging', confidence: 38, stream: 'logs.deprecated' },
  { id: 'e3', name: 'Old Metrics Agent', events: 12, sparkline: [1, 1, 2, 1, 3, 2, 1, 2, 1, 1, 2, 1], type: 'Monitoring', confidence: 55, stream: 'metrics.old' },
  { id: 'e4', name: 'Unused Proxy Service', events: null, sparkline: null, type: 'Networking', confidence: 48, stream: 'proxy.unused' },
  { id: 'e5', name: 'Test Environment Agent', events: null, sparkline: null, type: 'CI/CD', confidence: 61, stream: 'test.env' },
  { id: 'e6', name: 'Archived Database Connector', events: null, sparkline: null, type: 'Database', confidence: 44, stream: 'db.archive' },
  { id: 'e7', name: 'Decommissioned Load Balancer', events: null, sparkline: null, type: 'Load Balancing', confidence: 35, stream: 'lb.old' },
  { id: 'e8', name: 'Stale Cache Node', events: null, sparkline: null, type: 'Cache', confidence: 52, stream: 'cache.stale' },
];

function confidenceColor(score: number): 'success' | 'warning' | 'danger' {
  if (score >= 88) return 'success';
  if (score >= 72) return 'warning';
  return 'danger';
}

const KI_FILTER_OPTIONS = [
  {
    id: 'active',
    label: i18n.translate('xpack.streams.settings.kiTab.filter.active', {
      defaultMessage: 'Active',
    }),
  },
  {
    id: 'excluded',
    label: i18n.translate('xpack.streams.settings.kiTab.filter.excluded', {
      defaultMessage: 'Excluded',
    }),
  },
];

function KiActionsButton({ row }: { row: KiRow }) {
  const [isOpen, setIsOpen] = useState(false);
  const isQuery = row.type === 'Query';

  const items = [
    <EuiContextMenuItem
      key="open"
      icon="inspect"
      onClick={() => setIsOpen(false)}
    >
      {i18n.translate('xpack.streams.settings.kiTab.actions.openDetails', {
        defaultMessage: 'Open details',
      })}
    </EuiContextMenuItem>,
    <EuiContextMenuItem
      key="duplicate"
      icon="copy"
      onClick={() => setIsOpen(false)}
    >
      {i18n.translate('xpack.streams.settings.kiTab.actions.duplicate', {
        defaultMessage: 'Duplicate',
      })}
    </EuiContextMenuItem>,
    ...(isQuery
      ? [
          <EuiContextMenuItem
            key="exclude"
            icon="minusInCircle"
            onClick={() => setIsOpen(false)}
          >
            {i18n.translate('xpack.streams.settings.kiTab.actions.exclude', {
              defaultMessage: 'Exclude',
            })}
          </EuiContextMenuItem>,
        ]
      : []),
    <EuiContextMenuItem
      key="delete"
      icon="trash"
      onClick={() => setIsOpen(false)}
    >
      {i18n.translate('xpack.streams.settings.kiTab.actions.delete', {
        defaultMessage: 'Delete',
      })}
    </EuiContextMenuItem>,
  ];

  return (
    <EuiPopover
      button={
        <EuiButtonIcon
          iconType="boxesVertical"
          size="xs"
          color="text"
          aria-label={i18n.translate('xpack.streams.settings.kiTab.rowActionsAriaLabel', {
            defaultMessage: 'Row actions for {name}',
            values: { name: row.name },
          })}
          onClick={() => setIsOpen((v) => !v)}
        />
      }
      isOpen={isOpen}
      closePopover={() => setIsOpen(false)}
      panelPaddingSize="none"
      anchorPosition="leftCenter"
    >
      <EuiContextMenuPanel items={items} />
    </EuiPopover>
  );
}

function KnowledgeIndicatorsTab() {
  const { euiTheme } = useEuiTheme();
  const [selectedItems, setSelectedItems] = useState<KiRow[]>([]);
  const [pageIndex, setPageIndex] = useState(0);
  const [kiFilter, setKiFilter] = useState<'active' | 'excluded'>('active');
  const pageSize = 20;

  const rows = kiFilter === 'active' ? MOCK_KI : MOCK_KI_EXCLUDED;

  const columns = [
    {
      field: 'name' as const,
      name: i18n.translate('xpack.streams.settings.kiTab.nameColumn', {
        defaultMessage: 'Knowledge indicators',
      }),
      render: (name: string) => (
        <EuiLink>
          <span
            css={css`
              font-size: 14px;
              font-weight: ${euiTheme.font.weight.regular};
            `}
          >
            {name}
          </span>
        </EuiLink>
      ),
    },
    {
      field: 'events' as const,
      name: i18n.translate('xpack.streams.settings.kiTab.eventsColumn', {
        defaultMessage: 'Events',
      }),
      width: '160px',
      render: (events: number | null, row: KiRow) =>
        events !== null && row.sparkline ? (
          <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiText size="s">
                <span>{events}</span>
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <Sparkline values={row.sparkline} />
            </EuiFlexItem>
          </EuiFlexGroup>
        ) : null,
    },
    {
      field: 'type' as const,
      name: i18n.translate('xpack.streams.settings.kiTab.typeColumn', {
        defaultMessage: 'Type',
      }),
      width: '160px',
      render: (type: string) => <EuiBadge color="hollow">{type}</EuiBadge>,
    },
    {
      field: 'confidence' as const,
      name: i18n.translate('xpack.streams.settings.kiTab.confidenceColumn', {
        defaultMessage: 'Confidence',
      }),
      width: '110px',
      render: (score: number) => (
        <EuiHealth color={confidenceColor(score)}>
          <EuiText size="s">
            <span>{score}</span>
          </EuiText>
        </EuiHealth>
      ),
    },
    {
      field: 'stream' as const,
      name: i18n.translate('xpack.streams.settings.kiTab.streamColumn', {
        defaultMessage: 'Stream',
      }),
      width: '160px',
      render: (stream: string) => <EuiBadge color="hollow">{stream}</EuiBadge>,
    },
    {
      name: i18n.translate('xpack.streams.settings.kiTab.actionsColumn', {
        defaultMessage: 'Actions',
      }),
      width: '60px',
      actions: [
        {
          render: (row: KiRow) => <KiActionsButton row={row} />,
        },
      ],
    },
  ];

  const selection = {
    onSelectionChange: setSelectedItems,
    selected: selectedItems,
  };

  const pagination = {
    pageIndex,
    pageSize,
    totalItemCount: rows.length,
    pageSizeOptions: [10, 20, 50],
    showPerPageOptions: true,
  };

  return (
    <div
      css={css`
        display: flex;
        flex-direction: column;
        gap: ${euiTheme.size.m};
      `}
    >
      {/* Toolbar */}
      <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
        {/* Active / Excluded toggle */}
        <EuiFlexItem grow={false}>
          <EuiButtonGroup
            legend={i18n.translate('xpack.streams.settings.kiTab.filter.legend', {
              defaultMessage: 'Filter knowledge indicators',
            })}
            options={KI_FILTER_OPTIONS}
            idSelected={kiFilter}
            onChange={(id) => {
              setKiFilter(id as 'active' | 'excluded');
              setPageIndex(0);
              setSelectedItems([]);
            }}
            buttonSize="s"
            color="primary"
            data-test-subj="streamsKiTabFilterToggle"
          />
        </EuiFlexItem>

        {/* Search — grows to fill space */}
        <EuiFlexItem>
          <EuiFieldSearch
            placeholder={i18n.translate('xpack.streams.settings.kiTab.searchPlaceholder', {
              defaultMessage: 'Significant event, query name ...',
            })}
            fullWidth
            compressed
            data-test-subj="streamsKiTabSearch"
          />
        </EuiFlexItem>

        {/* "All streams" filter */}
        <EuiFlexItem grow={false}>
          <EuiFilterGroup compressed>
            <EuiFilterButton
              hasActiveFilters={false}
              iconType="arrowDown"
              iconSide="right"
              numFilters={rows.length}
            >
              {i18n.translate('xpack.streams.settings.kiTab.allStreamsFilter', {
                defaultMessage: 'All streams',
              })}
            </EuiFilterButton>
          </EuiFilterGroup>
        </EuiFlexItem>

        {/* "All" type filter */}
        <EuiFlexItem grow={false}>
          <EuiFilterGroup compressed>
            <EuiFilterButton hasActiveFilters={false} iconType="arrowDown" iconSide="right">
              {i18n.translate('xpack.streams.settings.kiTab.allTypesFilter', {
                defaultMessage: 'All',
              })}
            </EuiFilterButton>
          </EuiFilterGroup>
        </EuiFlexItem>

        {/* Generate more */}
        <EuiFlexItem grow={false}>
          <EuiButton
            fill
            size="s"
            iconType="sparkles"
            data-test-subj="streamsKiTabGenerateMore"
          >
            {i18n.translate('xpack.streams.settings.kiTab.generateMore', {
              defaultMessage: 'Generate more',
            })}
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>

      {/* Excluded education banner — only shown in "Excluded" view */}
      {kiFilter === 'excluded' && (
        <div
          css={css`
            display: flex;
            align-items: center;
            gap: ${euiTheme.size.m};
            padding: ${euiTheme.size.s} ${euiTheme.size.m};
            background: ${euiTheme.colors.backgroundLightPrimary};
            border: 1px solid ${euiTheme.colors.borderBaseSubdued};
            border-radius: ${euiTheme.border.radius.medium};
          `}
        >
          {/* Illustration */}
          <div
            css={css`
              flex-shrink: 0;
              width: 64px;
              height: 36px;
              display: flex;
              align-items: center;
              justify-content: center;
            `}
          >
            <svg
              width="64"
              height="36"
              viewBox="0 0 86 48"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <path d="M19.4775 43.9738L16.5303 41.6534L67.928 2.35156L69.9111 3.89939L19.4775 43.9738Z" fill="#101C3F" stroke="#101C3F" strokeWidth="0.117725" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M19.4239 16.7147C9.23176 29.5816 12.1332 43.1326 25.9045 46.9816C39.6749 50.8307 59.1009 43.5202 69.2922 30.6527C79.4835 17.7859 76.582 4.23486 62.8116 0.385837C49.0412 -3.46319 29.6152 3.84722 19.4239 16.7147Z" fill="#101C3F" stroke="#101C3F" strokeWidth="0.117725" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M17.6576 15.3397C7.46548 28.2066 10.3669 41.7576 24.1382 45.6066C37.9087 49.4557 57.3346 42.1452 67.5259 29.2777C77.718 16.4109 74.8166 2.85986 61.0462 -0.989163C47.2757 -4.83819 27.8497 2.47222 17.6584 15.3397H17.6576Z" fill="#F5F7FA" stroke="#101C3F" strokeWidth="0.117725" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M39.0652 1.87603C46.0795 -0.571043 53.3968 -1.22099 59.5177 0.489836C72.3774 4.08408 75.0873 16.7386 65.5696 28.7548L42.2847 22.2464L39.0652 1.87603Z" fill="url(#paint0_linear_497_57693)"/>
              <path d="M23.9306 37.3418C25.2743 38.3369 26.9145 39.1293 28.8385 39.667C35.5822 41.5517 44.145 39.8464 51.3799 35.7344" stroke="#101C3F" strokeWidth="0.117725" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="0.26 0.26"/>
              <path d="M24.8018 16.1641C23.1375 17.8852 21.7088 20.3891 20.9737 22.0109" stroke="#101C3F" strokeWidth="0.117725" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M64.7031 21.4178C67.498 13.9581 64.4425 7.19905 56.3484 4.93689C47.8114 2.55077 36.3579 5.91901 28.3746 12.639" stroke="#101C3F" strokeWidth="0.117725" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="0.26 0.26"/>
              <path d="M37.0288 34.2384C43.2796 34.3891 50.6436 31.0147 54.8305 25.7281C59.8308 19.4149 58.4072 12.7667 51.651 10.8785C44.8948 8.9903 35.3637 12.577 30.3634 18.8895C25.3631 25.2021 26.7868 31.8509 33.5429 33.7391" stroke="#101C3F" strokeWidth="0.117725" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M46.9473 16.8047C43.6986 15.8965 39.1154 17.6217 36.7102 20.6571C34.3058 23.6932 34.9901 26.8902 38.2387 27.7983C41.4874 28.7065 46.0706 26.9813 48.4758 23.9459C49.0769 23.1871 49.4849 22.4179 49.708 21.6769" stroke="#101C3F" strokeWidth="0.117725" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="0.26 0.26"/>
              <path d="M58.1768 26.6624L51.558 24.8125" stroke="#101C3F" strokeWidth="0.117725" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M33.6221 19.8008L15.047 14.6094" stroke="#101C3F" strokeWidth="0.117725" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M22.2109 48.043L35.958 30.6875" stroke="#101C3F" strokeWidth="0.117725" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M49.2335 13.9265L62.9814 -3.42969" stroke="#101C3F" strokeWidth="0.117725" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M42.1628 22.3577L43.0361 22.2645L39.4553 -0.390625L38.6153 -0.0837989L42.1628 22.3577Z" fill="#101C3F"/>
              <path d="M41.5897 22.0291C41.1784 22.5483 41.295 23.0955 41.8511 23.251C42.4072 23.4064 43.1915 23.1112 43.6028 22.5914C44.0141 22.0723 43.8975 21.5251 43.3414 21.3696C42.7852 21.2141 42.001 21.5093 41.5897 22.0291Z" fill="#101C3F" stroke="#101C3F" strokeWidth="0.117725" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M68.9871 39.7535C64.6194 39.7535 61.0787 36.8408 61.0787 33.2479C61.0787 29.6549 64.6194 26.7422 68.9871 26.7422C73.3548 26.7422 76.8955 29.6549 76.8955 33.2479C76.8955 36.8408 73.3548 39.7535 68.9871 39.7535Z" fill="#FA744E" stroke="#101C3F" strokeWidth="0.117725" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M63.4972 28.726C64.1882 28.1562 64.9774 27.7165 65.8192 27.4062C65.7351 27.4693 65.6526 27.5343 65.5719 27.6008C62.7412 29.9362 62.7412 33.7229 65.5719 36.0583C68.4026 38.3938 72.9933 38.3938 75.824 36.0583C75.9047 35.9912 75.9838 35.9234 76.0596 35.8542C75.6841 36.5487 75.1513 37.2 74.4602 37.7698C71.4331 40.2676 66.5243 40.2676 63.4972 37.7698C60.47 35.2721 60.47 31.2231 63.4972 28.726Z" fill="#E55940"/>
              <path d="M74.131 30.6907C74.0702 30.6606 74.0169 30.6181 73.9753 30.5661C73.7555 30.2825 73.4999 30.0175 73.2143 29.7778C73.0295 29.6223 73.0328 29.373 73.2218 29.2216C73.4108 29.0696 73.7139 29.0723 73.8979 29.2278C74.2292 29.5065 74.5264 29.8141 74.7812 30.1428C74.9236 30.3263 74.8578 30.5695 74.6355 30.6859C74.4765 30.7695 74.2808 30.766 74.1301 30.6907H74.131Z" fill="#FF957D"/>
              <path d="M68.8392 28.2302C68.6968 28.1597 68.6036 28.0302 68.6086 27.8837C68.6152 27.6666 68.8342 27.4946 69.0981 27.5001C69.6892 27.5118 70.277 27.5864 70.844 27.7207C71.4284 27.8597 71.9912 28.0624 72.5166 28.3234C72.7422 28.4357 72.8146 28.6774 72.6781 28.8637C72.5415 29.0493 72.2476 29.1089 72.0212 28.9966C71.5674 28.7713 71.0821 28.5959 70.5784 28.4761C70.0897 28.3603 69.5835 28.296 69.074 28.2857C68.9874 28.2836 68.9074 28.2638 68.8383 28.2295L68.8392 28.2302Z" fill="#FF957D"/>
              <path d="M62.5357 33.804C63.3433 35.171 64.7345 35.4436 66.4953 35.0224C66.6585 34.9833 66.666 34.7943 66.507 34.7457L62.7571 33.6033C62.6073 33.5574 62.4666 33.6855 62.5365 33.804H62.5357Z" fill="white"/>
              <path d="M75.3388 33.804C74.5312 35.171 73.14 35.4436 71.3792 35.0224C71.216 34.9833 71.2085 34.7943 71.3675 34.7457L75.1174 33.6033C75.2672 33.5574 75.4079 33.6855 75.338 33.804H75.3388Z" fill="white"/>
              <path d="M56.7743 29.9287C51.5358 36.5426 53.0269 43.5078 60.1053 45.4857C67.1837 47.4643 77.1677 43.7064 82.4069 37.0925C87.6453 30.4786 86.1542 23.5134 79.0759 21.5355C71.9975 19.5569 62.0135 23.3148 56.7743 29.9287Z" stroke="#101C3F" strokeWidth="0.117725" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M83.7471 37.463L77.5629 35.7344" stroke="#101C3F" strokeWidth="0.117725" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M60.4893 30.9662L55.4398 29.5547" stroke="#101C3F" strokeWidth="0.117725" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M59.1166 46.7396L62.958 41.8906" stroke="#101C3F" strokeWidth="0.117725" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M77.0352 24.1097L80.0674 20.2812" stroke="#101C3F" strokeWidth="0.117725" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M10.6233 35.6756C7.61663 35.6756 5.17924 33.6705 5.17924 31.1972C5.17924 28.7238 7.61663 26.7188 10.6233 26.7188C13.63 26.7188 16.0674 28.7238 16.0674 31.1972C16.0674 33.6705 13.63 35.6756 10.6233 35.6756Z" fill="#F04E98" stroke="#101C3F" strokeWidth="0.117725" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M6.86586 28.0915C7.33959 27.7012 7.87991 27.3998 8.45687 27.1875C8.39943 27.2306 8.34281 27.2752 8.28786 27.3211C6.34801 28.9209 6.34801 31.5153 8.28786 33.1151C10.2277 34.715 13.3723 34.715 15.3121 33.1151C15.3679 33.0692 15.4212 33.0227 15.4736 32.9754C15.2164 33.4514 14.8509 33.8973 14.378 34.2876C12.3041 35.9985 8.94141 35.9985 6.86669 34.2876C4.7928 32.5768 4.7928 29.8024 6.86669 28.0915H6.86586Z" fill="#DD0A73"/>
              <path d="M14.1618 29.4333C14.1201 29.4128 14.0827 29.3833 14.0552 29.347C13.9037 29.1518 13.728 28.9697 13.5315 28.8039C13.4041 28.6971 13.4066 28.5252 13.5365 28.4211C13.6664 28.3163 13.8754 28.3183 14.0019 28.4252C14.23 28.6169 14.434 28.8293 14.6097 29.0553C14.7071 29.1813 14.6621 29.3491 14.5089 29.4292C14.3999 29.4867 14.265 29.484 14.1609 29.4326L14.1618 29.4333Z" fill="#F990C6"/>
              <path d="M10.5249 27.745C10.4275 27.6963 10.3626 27.6073 10.3659 27.5066C10.3701 27.3573 10.5216 27.2388 10.7031 27.2423C11.1102 27.2505 11.5149 27.3018 11.9053 27.3943C12.3074 27.4895 12.6954 27.6292 13.0567 27.8093C13.2124 27.8867 13.2624 28.0532 13.1683 28.1812C13.0742 28.3093 12.8719 28.3504 12.7162 28.273C12.404 28.1175 12.0702 27.997 11.723 27.9148C11.3866 27.8347 11.0386 27.7908 10.6873 27.784C10.6282 27.7826 10.5724 27.7689 10.5249 27.745Z" fill="#F990C6"/>
              <path d="M6.18411 31.5817C6.74026 32.5227 7.6977 32.7104 8.9099 32.4207C9.02229 32.394 9.02729 32.2638 8.91739 32.2303L6.33564 31.444C6.2324 31.4125 6.13583 31.5009 6.18329 31.5817H6.18411Z" fill="white"/>
              <path d="M14.9994 31.5817C14.4433 32.5227 13.4859 32.7104 12.2737 32.4207C12.1613 32.394 12.1563 32.2638 12.2662 32.2303L14.8479 31.444C14.9512 31.4125 15.0477 31.5009 15.0003 31.5817H14.9994Z" fill="white"/>
              <path d="M2.21305 28.9144C-1.39358 33.4675 -0.367036 38.2623 4.5059 39.6246C9.37884 40.9868 16.2524 38.4 19.8582 33.8469C23.4648 29.2938 22.4383 24.499 17.5653 23.1368C12.6924 21.7745 5.81884 24.3613 2.21305 28.9144Z" stroke="#101C3F" strokeWidth="0.117725" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M20.7861 34.1037L16.5285 32.9141" stroke="#101C3F" strokeWidth="0.117725" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M4.77051 29.6281L1.2946 28.6562" stroke="#101C3F" strokeWidth="0.117725" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M3.82163 40.4787L6.46582 37.1406" stroke="#101C3F" strokeWidth="0.117725" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M16.1599 24.901L18.2471 22.2656" stroke="#101C3F" strokeWidth="0.117725" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M21.4242 6.28218C19.8609 6.28218 18.5935 5.23964 18.5935 3.95359C18.5935 2.66755 19.8609 1.625 21.4242 1.625C22.9875 1.625 24.2549 2.66755 24.2549 3.95359C24.2549 5.23964 22.9875 6.28218 21.4242 6.28218Z" fill="#FEC514" stroke="#101C3F" strokeWidth="0.117725" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M19.517 2.395C19.7568 2.19775 20.0298 2.04503 20.3221 1.9375C20.2929 1.95942 20.2646 1.98202 20.2363 2.00462C19.2547 2.81415 19.2547 4.12706 20.2363 4.93659C21.2179 5.74612 22.8089 5.74612 23.7905 4.93659C23.8188 4.9133 23.8454 4.89002 23.8721 4.86605C23.7422 5.10712 23.5574 5.33245 23.3176 5.53038C22.2686 6.39607 20.5668 6.39607 19.517 5.53038C18.468 4.66469 18.468 3.26137 19.517 2.395Z" fill="#FFAD18"/>
              <path d="M23.1199 3.22231C23.0983 3.21135 23.0791 3.19628 23.0641 3.17779C22.9859 3.07643 22.8943 2.98123 22.7919 2.89562C22.7261 2.84015 22.7269 2.75111 22.7944 2.69632C22.8618 2.64222 22.9701 2.6429 23.0367 2.69838C23.1549 2.79837 23.2614 2.90863 23.353 3.02575C23.4038 3.0915 23.3805 3.17848 23.3006 3.22026C23.244 3.25039 23.174 3.24902 23.1199 3.22231Z" fill="#FFDF56"/>
              <path d="M21.2302 2.33977C21.1794 2.31443 21.1461 2.26786 21.1478 2.21581C21.1503 2.13773 21.2285 2.07678 21.3234 2.07815C21.5349 2.08226 21.7455 2.10897 21.9487 2.15691C22.1577 2.2069 22.3591 2.2795 22.5473 2.37265C22.6281 2.41305 22.6539 2.49935 22.6056 2.56578C22.5565 2.63222 22.4516 2.65345 22.3708 2.61372C22.2084 2.53291 22.0344 2.47058 21.8546 2.42744C21.6798 2.38566 21.4983 2.36306 21.3159 2.35963C21.2851 2.35963 21.256 2.35141 21.2319 2.33977H21.2302Z" fill="#FFDF56"/>
              <path d="M13.5927 50.0038C11.4882 50.0038 9.78212 48.6003 9.78212 46.8691C9.78212 45.1378 11.4882 43.7344 13.5927 43.7344C15.6973 43.7344 17.4033 45.1378 17.4033 46.8691C17.4033 48.6003 15.6973 50.0038 13.5927 50.0038Z" fill="#FA744E" stroke="#101C3F" strokeWidth="0.117725" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M10.9855 44.7275C11.3135 44.457 11.6873 44.2488 12.0869 44.1016C12.047 44.1317 12.0078 44.1618 11.9695 44.194C10.6275 45.3015 10.6275 47.0965 11.9695 48.204C13.3116 49.3114 15.4887 49.3114 16.8308 48.204C16.8691 48.1725 16.9066 48.1403 16.9424 48.1074C16.7642 48.4369 16.5111 48.7457 16.1839 49.0156C14.7486 50.1997 12.4208 50.1997 10.9855 49.0156C9.55014 47.8314 9.55014 45.9117 10.9855 44.7269V44.7275Z" fill="#E55940"/>
              <path d="M15.8745 45.8717C15.8454 45.8573 15.8196 45.8367 15.7996 45.8114C15.6939 45.6751 15.5707 45.547 15.4333 45.4313C15.3442 45.3566 15.3459 45.2361 15.4366 45.1635C15.5274 45.0902 15.6739 45.0916 15.7621 45.1662C15.922 45.3005 16.0652 45.4491 16.1876 45.6073C16.2558 45.6956 16.2242 45.8128 16.1176 45.8689C16.041 45.9093 15.947 45.9073 15.8745 45.871V45.8717Z" fill="#FF957D"/>
              <path d="M13.3327 44.6958C13.2644 44.6616 13.2195 44.5993 13.2211 44.5287C13.2245 44.4239 13.3302 44.3411 13.4567 44.3438C13.7415 44.3493 14.0245 44.3856 14.2984 44.45C14.5799 44.5171 14.8513 44.6143 15.1044 44.7404C15.2134 44.7945 15.2484 44.9109 15.1826 45.0006C15.1168 45.0903 14.9753 45.1191 14.8663 45.065C14.6481 44.9561 14.4142 44.8719 14.1711 44.8143C13.9355 44.7582 13.6915 44.7274 13.4459 44.7226C13.4043 44.7219 13.366 44.7116 13.3327 44.6952V44.6958Z" fill="#FF957D"/>
              <path d="M80.8726 5.96376C78.4825 5.96376 76.545 4.36989 76.545 2.40375C76.545 0.437618 78.4825 -1.15625 80.8726 -1.15625C83.2627 -1.15625 85.2002 0.437618 85.2002 2.40375C85.2002 4.36989 83.2627 5.96376 80.8726 5.96376Z" fill="#F04E98" stroke="#101C3F" strokeWidth="0.117725" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M77.9114 -0.0312822C78.2836 -0.338108 78.7082 -0.575077 79.1619 -0.742188C79.117 -0.707944 79.072 -0.6737 79.0287 -0.637401C77.5043 0.620038 77.5043 2.65961 79.0287 3.91705C80.5531 5.17449 83.025 5.17449 84.5494 3.91705C84.5927 3.88075 84.6351 3.84445 84.6768 3.80747C84.4744 4.18141 84.1872 4.53207 83.8151 4.8389C82.1849 6.184 79.5416 6.184 77.9114 4.8389C76.2813 3.49379 76.2813 1.31314 77.9114 -0.0312822Z" fill="#DD0A73"/>
              <path d="M83.4662 1.28002C83.4329 1.26358 83.4038 1.2403 83.3813 1.21153C83.2614 1.05675 83.1207 0.911555 82.965 0.780058C82.8643 0.695133 82.8659 0.558842 82.9692 0.475286C83.0724 0.392416 83.2381 0.393786 83.3397 0.478711C83.5212 0.631439 83.6835 0.799919 83.8234 0.979358C83.9008 1.07935 83.865 1.2129 83.7434 1.2766C83.6569 1.32248 83.5495 1.32043 83.467 1.27934L83.4662 1.28002Z" fill="#F990C6"/>
              <path d="M80.5695 -0.0687217C80.492 -0.107075 80.4404 -0.178303 80.4429 -0.258433C80.4462 -0.377603 80.5661 -0.471431 80.711 -0.468692C81.0349 -0.462528 81.3562 -0.421435 81.6668 -0.348153C81.9865 -0.272131 82.2945 -0.16118 82.5817 -0.0180405C82.7058 0.0435987 82.7449 0.17578 82.67 0.277828C82.5951 0.379875 82.4344 0.412064 82.3103 0.350425C82.0622 0.227146 81.7966 0.131263 81.5211 0.0655146C81.2538 0.0018208 80.9766 -0.0331081 80.6977 -0.0385871C80.6502 -0.039272 80.6061 -0.0509148 80.5686 -0.0694065L80.5695 -0.0687217Z" fill="#F990C6"/>
              <path d="M17.6418 0.34375C17.8916 0.822481 18.3112 1.356 18.9189 1.93884" stroke="#101C3F" strokeWidth="0.117725" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="0.24 0.24"/>
              <path d="M30.9502 0.758778C22.8261 -3.46214 16.4521 -3.05326 17.4612 -0.0692418" stroke="#101C3F" strokeWidth="0.117725" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M27.4542 -0.273438C27.4542 -0.273438 27.659 -0.198101 28.0361 -0.0214018" stroke="#101C3F" strokeWidth="0.117725" strokeLinecap="round" strokeLinejoin="round"/>
              <defs>
                <linearGradient id="paint0_linear_497_57693" x1="61.9438" y1="27.0584" x2="54.9524" y2="6.37081" gradientUnits="userSpaceOnUse">
                  <stop stopColor="white" stopOpacity="0"/>
                  <stop offset="0.09" stopColor="#E0FBF6" stopOpacity="0.18"/>
                  <stop offset="0.22" stopColor="#BBF7EC" stopOpacity="0.39"/>
                  <stop offset="0.35" stopColor="#9CF4E3" stopOpacity="0.58"/>
                  <stop offset="0.48" stopColor="#82F1DB" stopOpacity="0.73"/>
                  <stop offset="0.61" stopColor="#6EEFD6" stopOpacity="0.85"/>
                  <stop offset="0.74" stopColor="#60EED2" stopOpacity="0.93"/>
                  <stop offset="0.87" stopColor="#57EDCF" stopOpacity="0.98"/>
                  <stop offset="1" stopColor="#55EDCF"/>
                </linearGradient>
              </defs>
            </svg>
          </div>

          {/* Text */}
          <EuiText size="s">
            <p>
              {i18n.translate('xpack.streams.settings.kiTab.excludedBanner', {
                defaultMessage:
                  'Excluding knowledge indicators ensures they will not appear in the next generation run. Excluded indicators remain stored and can be re-activated at any time.',
              })}
            </p>
          </EuiText>
        </div>
      )}

      {/* Table */}
      <EuiBasicTable<KiRow>
        items={rows.slice(pageIndex * pageSize, (pageIndex + 1) * pageSize)}
        itemId="id"
        columns={columns}
        selection={selection}
        pagination={pagination}
        onChange={({ page }) => {
          if (page) setPageIndex(page.index);
        }}
        tableCaption={i18n.translate('xpack.streams.settings.kiTab.tableCaption', {
          defaultMessage: 'Knowledge indicators table',
        })}
        css={css`
          .euiTableHeaderCell .euiTableCellContent {
            font-weight: ${euiTheme.font.weight.semiBold};
          }
        `}
      />
    </div>
  );
}

// ─── Rules tab ────────────────────────────────────────────────────────────────

interface RuleRow {
  id: string;
  name: string;
  severity: 'critical' | 'high' | 'medium' | 'warning';
  status: 'running' | 'stopped';
  lastOccurred: string;
  stream: string;
  enabled: boolean;
}

const MOCK_RULES_TAB: RuleRow[] = [
  { id: 'r1', name: 'SSH Authentication Failures', severity: 'critical', status: 'running', lastOccurred: 'Mar 26, 2023 @ 12:39:39.668', stream: 'logs.nginx', enabled: true },
  { id: 'r2', name: 'Database Connection Error', severity: 'high', status: 'stopped', lastOccurred: 'Mar 26, 2023 @ 16:25:10.112', stream: 'logs.nginx', enabled: false },
  { id: 'r3', name: 'API Timeout', severity: 'medium', status: 'running', lastOccurred: 'Mar 26, 2023 @ 16:29:45.087', stream: 'logs.nginx', enabled: true },
  { id: 'r4', name: 'Disk Space Low', severity: 'warning', status: 'running', lastOccurred: 'Mar 26, 2023 @ 16:27:30.321', stream: 'logs.nginx', enabled: true },
  { id: 'r5', name: 'Memory Leak Detected', severity: 'critical', status: 'running', lastOccurred: 'Mar 26, 2023 @ 16:28:15.450', stream: 'logs.nginx', enabled: true },
  { id: 'r6', name: 'Service Unavailable', severity: 'high', status: 'stopped', lastOccurred: 'Mar 26, 2023 @ 16:29:00.560', stream: 'logs.nginx', enabled: false },
  { id: 'r7', name: 'Network Latency Issue', severity: 'medium', status: 'running', lastOccurred: 'Mar 26, 2023 @ 16:29:45.678', stream: 'logs.nginx', enabled: true },
  { id: 'r8', name: 'Unauthorized Access Attempt', severity: 'critical', status: 'running', lastOccurred: 'Mar 26, 2023 @ 16:30:30.789', stream: 'logs.nginx', enabled: true },
  { id: 'r9', name: 'Backup Process Failed', severity: 'high', status: 'stopped', lastOccurred: 'Mar 26, 2023 @ 16:31:15.890', stream: 'logs.nginx', enabled: true },
  { id: 'r10', name: 'Website Downtime', severity: 'critical', status: 'stopped', lastOccurred: 'Mar 26, 2023 @ 16:32:05.123', stream: 'logs.nginx', enabled: true },
  { id: 'r11', name: 'Email Service Disruption', severity: 'high', status: 'running', lastOccurred: 'Mar 26, 2023 @ 16:32:50.456', stream: 'logs.nginx', enabled: true },
  { id: 'r12', name: 'File Upload Error', severity: 'medium', status: 'running', lastOccurred: 'Mar 26, 2023 @ 16:33:35.789', stream: 'logs.nginx', enabled: true },
  { id: 'r13', name: 'User Session Timeout', severity: 'warning', status: 'running', lastOccurred: 'Mar 26, 2023 @ 16:34:20.111', stream: 'logs.nginx', enabled: true },
  { id: 'r14', name: 'Third-Party Integration Failure', severity: 'high', status: 'stopped', lastOccurred: 'Mar 26, 2023 @ 16:35:05.222', stream: 'logs.nginx', enabled: false },
  { id: 'r15', name: 'Data Sync Issue', severity: 'medium', status: 'running', lastOccurred: 'Mar 26, 2023 @ 16:35:50.333', stream: 'logs.nginx', enabled: true },
];

const RULE_SEVERITY_COLOR: Record<RuleRow['severity'], string> = {
  critical: 'danger',
  high: 'warning',
  medium: 'primary',
  warning: 'warning',
};

const RULE_SEVERITY_LABEL: Record<RuleRow['severity'], string> = {
  critical: 'Critical',
  high: 'High',
  medium: 'Medium',
  warning: 'Warning',
};

const RULE_STATUS_FILTER_OPTIONS = [
  { id: 'all', label: i18n.translate('xpack.streams.settings.rulesTab.filter.all', { defaultMessage: 'All' }) },
  { id: 'running', label: i18n.translate('xpack.streams.settings.rulesTab.filter.running', { defaultMessage: 'Running' }) },
  { id: 'finished', label: i18n.translate('xpack.streams.settings.rulesTab.filter.finished', { defaultMessage: 'Stopped' }) },
];

function RulesTab() {
  const { euiTheme } = useEuiTheme();
  const [selectedItems, setSelectedItems] = useState<RuleRow[]>([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [pageIndex, setPageIndex] = useState(0);
  const [rows, setRows] = useState(MOCK_RULES_TAB);
  const [isFlyoutOpen, setIsFlyoutOpen] = useState(false);
  const [isEnabling, setIsEnabling] = useState(false);
  const [isEnabled, setIsEnabled] = useState(false);
  const [selectedRuleDetail, setSelectedRuleDetail] = useState<SuggestedRule | null>(null);
  const pageSize = 20;

  const filteredRows = rows.filter((r) => {
    if (statusFilter === 'running') return r.status === 'running';
    if (statusFilter === 'finished') return r.status === 'stopped';
    return true;
  });

  const handleEnable = () => {
    setIsEnabling(true);
    setTimeout(() => {
      setIsEnabling(false);
      setIsEnabled(true);
    }, 3000);
  };

  const columns = [
    {
      name: '',
      width: '40px',
      actions: [
        {
          render: (row: RuleRow) => (
            <EuiButtonIcon
              iconType="expand"
              size="xs"
              color="text"
              aria-label={i18n.translate('xpack.streams.settings.rulesTab.expandAriaLabel', {
                defaultMessage: 'View details for {name}',
                values: { name: row.name },
              })}
              onClick={() => {
                const matched =
                  MOCK_RULES.find((r) => r.name === row.name) ??
                  ({
                    id: row.id,
                    name: row.name,
                    severity: (row.severity === 'warning' ? 'medium' : row.severity) as SuggestedRule['severity'],
                    type: 'Rule',
                    impact: (row.severity === 'warning' ? 'medium' : row.severity) as SuggestedRule['impact'],
                    stream: row.stream,
                    knowledgeIndicators: [],
                    summary: i18n.translate('xpack.streams.settings.rulesTab.defaultSummary', {
                      defaultMessage: 'No summary available for this rule.',
                    }),
                    query: `FROM ${row.stream}, ${row.stream}.*\n| WHERE KQL("status:error")`,
                    rawDocument: `stream: ${row.stream}\nrule: ${row.name}\nstatus: ${row.status}`,
                  } satisfies SuggestedRule);
                setSelectedRuleDetail(matched);
              }}
            />
          ),
        },
      ],
    },
    {
      field: 'name' as const,
      name: i18n.translate('xpack.streams.settings.rulesTab.nameColumn', { defaultMessage: 'Rules' }),
      render: (name: string) => (
        <EuiLink>
          <span css={css`font-size: 14px; font-weight: ${euiTheme.font.weight.regular};`}>{name}</span>
        </EuiLink>
      ),
    },
    {
      field: 'severity' as const,
      name: i18n.translate('xpack.streams.settings.rulesTab.severityColumn', { defaultMessage: 'Severity' }),
      width: '120px',
      render: (severity: RuleRow['severity']) => (
        <EuiHealth color={RULE_SEVERITY_COLOR[severity]}>
          <EuiText size="s"><span>{RULE_SEVERITY_LABEL[severity]}</span></EuiText>
        </EuiHealth>
      ),
    },
    {
      field: 'status' as const,
      name: i18n.translate('xpack.streams.settings.rulesTab.statusColumn', { defaultMessage: 'Status' }),
      width: '110px',
      render: (status: RuleRow['status']) => (
        <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
          <EuiFlexItem grow={false}>
            {status === 'running' ? (
              <EuiLoadingSpinner size="s" />
            ) : (
              <EuiIcon type="pause" size="s" color="subdued" />
            )}
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiText size="s" color={status === 'running' ? 'default' : 'subdued'}>
              <span>
                {status === 'running'
                  ? i18n.translate('xpack.streams.settings.rulesTab.running', { defaultMessage: 'Running' })
                  : i18n.translate('xpack.streams.settings.rulesTab.stopped', { defaultMessage: 'Stopped' })}
              </span>
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      ),
    },
    {
      field: 'lastOccurred' as const,
      name: i18n.translate('xpack.streams.settings.rulesTab.lastOccurredColumn', { defaultMessage: 'Last occurred' }),
      width: '220px',
      render: (ts: string) => (
        <EuiText size="s" color="subdued"><span>{ts}</span></EuiText>
      ),
    },
    {
      field: 'stream' as const,
      name: i18n.translate('xpack.streams.settings.rulesTab.streamColumn', { defaultMessage: 'Stream' }),
      width: '120px',
      render: (stream: string) => <EuiBadge color="hollow">{stream}</EuiBadge>,
    },
    {
      field: 'enabled' as const,
      name: i18n.translate('xpack.streams.settings.rulesTab.enabledColumn', { defaultMessage: 'Enabled' }),
      width: '80px',
      render: (enabled: boolean, row: RuleRow) => (
        <EuiSwitch
          label=""
          showLabel={false}
          checked={enabled}
          compressed
          onChange={(e) => {
            setRows((prev) =>
              prev.map((r) => (r.id === row.id ? { ...r, enabled: e.target.checked } : r))
            );
          }}
        />
      ),
    },
    {
      name: i18n.translate('xpack.streams.settings.rulesTab.actionsColumn', { defaultMessage: 'Actions' }),
      width: '60px',
      actions: [
        {
          render: (row: RuleRow) => (
            <EuiButtonIcon
              iconType="boxesVertical"
              size="xs"
              color="text"
              aria-label={i18n.translate('xpack.streams.settings.rulesTab.rowActionsAriaLabel', {
                defaultMessage: 'Row actions for {name}',
                values: { name: row.name },
              })}
            />
          ),
        },
      ],
    },
  ];

  const selection = { onSelectionChange: setSelectedItems, selected: selectedItems };
  const pagination = { pageIndex, pageSize, totalItemCount: filteredRows.length, pageSizeOptions: [10, 20, 50], showPerPageOptions: true };

  return (
    <div
      css={css`
        display: flex;
        flex-direction: column;
        gap: ${euiTheme.size.m};
      `}
    >
      {/* Info banner */}
      <div
        css={css`
          display: flex;
          align-items: center;
          gap: ${euiTheme.size.m};
          padding: ${euiTheme.size.s} ${euiTheme.size.m};
          background: ${euiTheme.colors.backgroundLightPrimary};
          border: 1px solid ${euiTheme.colors.borderBaseSubdued};
          border-radius: ${euiTheme.border.radius.medium};
          width: 100%;
        `}
      >
        {/* Illustration */}
        <div css={css`flex-shrink: 0; width: 64px; height: 36px; display: flex; align-items: center;`}>
          <svg width="64" height="36" viewBox="0 0 86 48" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <path d="M19.4775 43.9738L16.5303 41.6534L67.928 2.35156L69.9111 3.89939L19.4775 43.9738Z" fill="#101C3F" stroke="#101C3F" strokeWidth="0.117725" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M19.4239 16.7147C9.23176 29.5816 12.1332 43.1326 25.9045 46.9816C39.6749 50.8307 59.1009 43.5202 69.2922 30.6527C79.4835 17.7859 76.582 4.23486 62.8116 0.385837C49.0412 -3.46319 29.6152 3.84722 19.4239 16.7147Z" fill="#101C3F" stroke="#101C3F" strokeWidth="0.117725" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M17.6576 15.3397C7.46548 28.2066 10.3669 41.7576 24.1382 45.6066C37.9087 49.4557 57.3346 42.1452 67.5259 29.2777C77.718 16.4109 74.8166 2.85986 61.0462 -0.989163C47.2757 -4.83819 27.8497 2.47222 17.6584 15.3397H17.6576Z" fill="#F5F7FA" stroke="#101C3F" strokeWidth="0.117725" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M39.0652 1.87603C46.0795 -0.571043 53.3968 -1.22099 59.5177 0.489836C72.3774 4.08408 75.0873 16.7386 65.5696 28.7548L42.2847 22.2464L39.0652 1.87603Z" fill="url(#rulesGrad)"/>
            <path d="M37.0288 34.2384C43.2796 34.3891 50.6436 31.0147 54.8305 25.7281C59.8308 19.4149 58.4072 12.7667 51.651 10.8785C44.8948 8.9903 35.3637 12.577 30.3634 18.8895C25.3631 25.2021 26.7868 31.8509 33.5429 33.7391" stroke="#101C3F" strokeWidth="0.117725" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M42.1628 22.3577L43.0361 22.2645L39.4553 -0.390625L38.6153 -0.0837989L42.1628 22.3577Z" fill="#101C3F"/>
            <path d="M41.5897 22.0291C41.1784 22.5483 41.295 23.0955 41.8511 23.251C42.4072 23.4064 43.1915 23.1112 43.6028 22.5914C44.0141 22.0723 43.8975 21.5251 43.3414 21.3696C42.7852 21.2141 42.001 21.5093 41.5897 22.0291Z" fill="#101C3F" stroke="#101C3F" strokeWidth="0.117725" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M68.9871 39.7535C64.6194 39.7535 61.0787 36.8408 61.0787 33.2479C61.0787 29.6549 64.6194 26.7422 68.9871 26.7422C73.3548 26.7422 76.8955 29.6549 76.8955 33.2479C76.8955 36.8408 73.3548 39.7535 68.9871 39.7535Z" fill="#FA744E" stroke="#101C3F" strokeWidth="0.117725" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M10.6233 35.6756C7.61663 35.6756 5.17924 33.6705 5.17924 31.1972C5.17924 28.7238 7.61663 26.7188 10.6233 26.7188C13.63 26.7188 16.0674 28.7238 16.0674 31.1972C16.0674 33.6705 13.63 35.6756 10.6233 35.6756Z" fill="#F04E98" stroke="#101C3F" strokeWidth="0.117725" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M21.4242 6.28218C19.8609 6.28218 18.5935 5.23964 18.5935 3.95359C18.5935 2.66755 19.8609 1.625 21.4242 1.625C22.9875 1.625 24.2549 2.66755 24.2549 3.95359C24.2549 5.23964 22.9875 6.28218 21.4242 6.28218Z" fill="#FEC514" stroke="#101C3F" strokeWidth="0.117725" strokeLinecap="round" strokeLinejoin="round"/>
            <defs>
              <linearGradient id="rulesGrad" x1="61.9438" y1="27.0584" x2="54.9524" y2="6.37081" gradientUnits="userSpaceOnUse">
                <stop stopColor="white" stopOpacity="0"/>
                <stop offset="0.5" stopColor="#82F1DB" stopOpacity="0.73"/>
                <stop offset="1" stopColor="#55EDCF"/>
              </linearGradient>
            </defs>
          </svg>
        </div>

        {/* Text — grows to fill available space */}
        <div css={css`flex: 1; min-width: 0;`}>
          <EuiText size="s">
            <p>
              {i18n.translate('xpack.streams.settings.rulesTab.bannerPrefix', {
                defaultMessage: 'Based on the severity we recommend to create ',
              })}
              <strong>
                {i18n.translate('xpack.streams.settings.rulesTab.bannerCount', {
                  defaultMessage: '3 new rules',
                })}
              </strong>
              {i18n.translate('xpack.streams.settings.rulesTab.bannerSuffix', {
                defaultMessage: ' based on the last run.',
              })}
            </p>
          </EuiText>
        </div>

        {/* Action buttons — pinned to the right end */}
        <div css={css`flex-shrink: 0; display: flex; align-items: center; gap: ${euiTheme.size.s};`}>
          <EuiButton
            size="s"
            fill
            data-test-subj="streamsRulesTabCreateRules"
          >
            {i18n.translate('xpack.streams.settings.rulesTab.createRules', { defaultMessage: 'Create rules' })}
          </EuiButton>
          <EuiButton
            size="s"
            onClick={() => setIsFlyoutOpen(true)}
            data-test-subj="streamsRulesTabReviewResults"
          >
            {i18n.translate('xpack.streams.settings.rulesTab.reviewResults', { defaultMessage: 'Review results' })}
          </EuiButton>
        </div>
      </div>

      {/* Toolbar */}
      <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
        <EuiFlexItem>
          <EuiFieldSearch
            placeholder={i18n.translate('xpack.streams.settings.rulesTab.searchPlaceholder', { defaultMessage: 'Significant event, query name ...' })}
            fullWidth
            compressed
            data-test-subj="streamsRulesTabSearch"
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonGroup
            legend={i18n.translate('xpack.streams.settings.rulesTab.statusFilterLegend', { defaultMessage: 'Filter by status' })}
            options={RULE_STATUS_FILTER_OPTIONS}
            idSelected={statusFilter}
            onChange={(id) => { setStatusFilter(id); setPageIndex(0); }}
            buttonSize="s"
            data-test-subj="streamsRulesTabStatusFilter"
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiFilterGroup compressed>
            <EuiFilterButton hasActiveFilters={false} iconType="arrowDown" iconSide="right" numFilters={rows.length}>
              {i18n.translate('xpack.streams.settings.rulesTab.allStreamsFilter', { defaultMessage: 'All streams' })}
            </EuiFilterButton>
          </EuiFilterGroup>
        </EuiFlexItem>
      </EuiFlexGroup>

      {/* Table */}
      <EuiBasicTable<RuleRow>
        items={filteredRows.slice(pageIndex * pageSize, (pageIndex + 1) * pageSize)}
        itemId="id"
        columns={columns}
        selection={selection}
        pagination={pagination}
        onChange={({ page }) => { if (page) setPageIndex(page.index); }}
        tableCaption={i18n.translate('xpack.streams.settings.rulesTab.tableCaption', { defaultMessage: 'Rules table' })}
        css={css`
          .euiTableHeaderCell .euiTableCellContent {
            font-weight: ${euiTheme.font.weight.semiBold};
          }
        `}
      />

      {/* Rule detail flyout — standalone overlay (expand icon on each row) */}
      {selectedRuleDetail && (
        <RuleDetailFlyout
          rule={selectedRuleDetail}
          onClose={() => setSelectedRuleDetail(null)}
          standalone
        />
      )}

      {/* Suggested rules flyout — same as onboarding flow */}
      {isFlyoutOpen && (
        <SuggestedRulesFlyout
          onClose={() => setIsFlyoutOpen(false)}
          onEnable={handleEnable}
          isEnabling={isEnabling}
          isEnabled={isEnabled}
        />
      )}
    </div>
  );
}


// ─── Page ─────────────────────────────────────────────────────────────────────

export function AdvancedSettingsPage() {
  const [selectedTab, setSelectedTab] = useState<TabId>('streams');

  useStreamsAppBreadcrumbs(() => {
    return [
      {
        title: i18n.translate('xpack.streams.significantEvents.breadcrumbTitle', {
          defaultMessage: 'Significant events',
        }),
        path: '/_significant_events',
      },
      {
        title: i18n.translate('xpack.streams.settings.breadcrumbTitle', {
          defaultMessage: 'Settings',
        }),
        path: '/_significant_events_advanced_settings',
      },
    ];
  }, []);

  const pageTitle = (
    <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
      <EuiFlexItem grow={false}>
        {i18n.translate('xpack.streams.settings.pageTitle', {
          defaultMessage: 'Settings',
        })}
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiBadge color="hollow">
          {i18n.translate('xpack.streams.settings.continuousBadge', {
            defaultMessage: 'Continuous',
          })}
        </EuiBadge>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiIcon type="clock" size="s" color="subdued" aria-hidden />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiText size="s" color="subdued">
              <span>15 min</span>
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );

  return (
    <>
      <StreamsAppPageTemplate.Header
        pageTitle={pageTitle}
        tabs={TABS.map((tab) => ({
          id: tab.id,
          label: tab.label,
          isSelected: selectedTab === tab.id,
          onClick: () => setSelectedTab(tab.id),
        }))}
      />

      <StreamsAppPageTemplate.Body>
        {selectedTab === 'streams' && <StreamsTab />}
        {selectedTab === 'knowledge_indicators' && <KnowledgeIndicatorsTab />}
        {selectedTab === 'rules' && <RulesTab />}
        {selectedTab === 'advanced' && <AdvancedTab />}
        {selectedTab === 'jobs' && <JobsTab />}
      </StreamsAppPageTemplate.Body>
    </>
  );
}
