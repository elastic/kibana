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
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiIcon,
  EuiLink,
  EuiPanel,
  EuiSelect,
  EuiSplitButton,
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

const LLM_MODE_OPTIONS = [
  {
    id: 'single',
    label: i18n.translate('xpack.streams.settings.advancedTab.llmMode.single', {
      defaultMessage: 'Single',
    }),
  },
  {
    id: 'pipeline',
    label: i18n.translate('xpack.streams.settings.advancedTab.llmMode.pipeline', {
      defaultMessage: 'Pipeline',
    }),
  },
];

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
                      'You can pick one default LLM for all tasks, or specify each per step, just toggle pipeline if you want that.',
                  })}
                </p>
              </EuiText>
            </EuiFlexItem>

            {/* Right: controls */}
            <EuiFlexItem grow={false}>
              <EuiFlexGroup direction="column" gutterSize="m" responsive={false}>
                {/* Single | Pipeline toggle */}
                <EuiFlexItem grow={false}>
                  <EuiButtonGroup
                    legend={i18n.translate('xpack.streams.settings.advancedTab.llmMode.legend', {
                      defaultMessage: 'LLM mode',
                    })}
                    options={LLM_MODE_OPTIONS}
                    idSelected={currentConfig.mode}
                    onChange={(id) => setCurrentConfig((prev) => ({ ...prev, mode: id }))}
                    color="primary"
                    data-test-subj="streamsSettingsLlmModeToggle"
                  />
                </EuiFlexItem>

                {/* Single mode — one dropdown */}
                {currentConfig.mode === 'single' && (
                  <EuiFlexItem grow={false}>
                    <EuiFormRow
                      label={i18n.translate('xpack.streams.settings.advancedTab.selectLlm.label', {
                        defaultMessage: 'Select LLM',
                      })}
                    >
                      <EuiSelect
                        options={LLM_SELECT_OPTIONS}
                        value={currentConfig.singleLlm}
                        onChange={(e) =>
                          setCurrentConfig((prev) => ({ ...prev, singleLlm: e.target.value }))
                        }
                        css={selectCss}
                        data-test-subj="streamsSettingsLlmSelect"
                      />
                    </EuiFormRow>
                  </EuiFlexItem>
                )}

                {/* Pipeline mode — three dropdowns */}
                {currentConfig.mode === 'pipeline' && (
                  <>
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
                  </>
                )}
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

function PlaceholderTab({ label }: { label: string }) {
  return (
    <EuiEmptyPrompt
      icon={<EuiIcon type="gear" size="xl" color="subdued" />}
      title={
        <h3>
          {i18n.translate('xpack.streams.settings.placeholderTab.title', {
            defaultMessage: '{label} settings',
            values: { label },
          })}
        </h3>
      }
      body={
        <EuiText size="s" color="subdued">
          <p>
            {i18n.translate('xpack.streams.settings.placeholderTab.body', {
              defaultMessage: 'Configuration for {label} will appear here.',
              values: { label: label.toLowerCase() },
            })}
          </p>
        </EuiText>
      }
    />
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
        {selectedTab === 'knowledge_indicators' && (
          <PlaceholderTab
            label={i18n.translate('xpack.streams.settings.tabs.knowledgeIndicators', {
              defaultMessage: 'Knowledge indicators',
            })}
          />
        )}
        {selectedTab === 'rules' && (
          <PlaceholderTab
            label={i18n.translate('xpack.streams.settings.tabs.rules', {
              defaultMessage: 'Rules',
            })}
          />
        )}
        {selectedTab === 'advanced' && <AdvancedTab />}
        {selectedTab === 'jobs' && <JobsTab />}
      </StreamsAppPageTemplate.Body>
    </>
  );
}
