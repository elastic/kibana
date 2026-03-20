/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiBadge,
  EuiBasicTable,
  EuiButton,
  EuiButtonEmpty,
  EuiButtonGroup,
  EuiButtonIcon,
  EuiCodeBlock,
  EuiFieldSearch,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiHealth,
  EuiIcon,
  EuiSpacer,
  EuiTab,
  EuiTabs,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import React, { useState } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Job {
  id: string;
  name: string;
  steps: { current: number; total: number };
  status: 'running' | 'finished' | 'not_finished';
  date: string;
}

interface ExecutionStep {
  id: string;
  label: string;
  duration: string;
  icon: string;
  children: Array<{ label: string; duration: string }>;
}

// ─── Mock data ─────────────────────────────────────────────────────────────────

const MOCK_JOBS: Job[] = [
  {
    id: '2138123',
    name: 'significant_event_job 2138123',
    steps: { current: 2, total: 4 },
    status: 'running',
    date: '-',
  },
  {
    id: '2138124',
    name: 'significant_event_job 2138124',
    steps: { current: 4, total: 4 },
    status: 'finished',
    date: '-',
  },
  {
    id: '2138125',
    name: 'significant_event_job 2138125',
    steps: { current: 3, total: 4 },
    status: 'not_finished',
    date: '-',
  },
  {
    id: '2138126',
    name: 'significant_event_job 2138126',
    steps: { current: 4, total: 4 },
    status: 'finished',
    date: '-',
  },
  {
    id: '2138127',
    name: 'significant_event_job 2138127',
    steps: { current: 4, total: 4 },
    status: 'finished',
    date: '-',
  },
  {
    id: '2138128',
    name: 'significant_event_job 2138128',
    steps: { current: 4, total: 4 },
    status: 'finished',
    date: '-',
  },
  {
    id: '2138129',
    name: 'significant_event_job 2138129',
    steps: { current: 4, total: 4 },
    status: 'finished',
    date: '-',
  },
  {
    id: '2138130',
    name: 'significant_event_job 2138130',
    steps: { current: 4, total: 4 },
    status: 'finished',
    date: '-',
  },
  {
    id: '2138131',
    name: 'significant_event_job 2138131',
    steps: { current: 4, total: 4 },
    status: 'finished',
    date: '-',
  },
  {
    id: '2138132',
    name: 'significant_event_job 2138132',
    steps: { current: 4, total: 4 },
    status: 'finished',
    date: '-',
  },
  {
    id: '2138133',
    name: 'significant_event_job 2138133',
    steps: { current: 4, total: 4 },
    status: 'finished',
    date: '-',
  },
  {
    id: '2138134',
    name: 'significant_event_job 2138134',
    steps: { current: 4, total: 4 },
    status: 'finished',
    date: '-',
  },
  {
    id: '2138135',
    name: 'significant_event_job 2138135',
    steps: { current: 4, total: 4 },
    status: 'finished',
    date: '-',
  },
  {
    id: '2138136',
    name: 'significant_event_job 2138136',
    steps: { current: 4, total: 4 },
    status: 'finished',
    date: '-',
  },
  {
    id: '2138137',
    name: 'significant_event_job 2138137',
    steps: { current: 4, total: 4 },
    status: 'finished',
    date: '-',
  },
];

const MOCK_EXECUTION_STEPS: ExecutionStep[] = [
  {
    id: 'ki_feature',
    label: 'Knowledge indicator: Feature extraction',
    duration: '124 ms',
    icon: 'layers',
    children: [
      { label: 'Fetch sample docs', duration: '25 ms' },
      { label: 'Extract features', duration: '5 m' },
      { label: 'Deduplicate', duration: '5 m' },
    ],
  },
  {
    id: 'ki_query',
    label: 'Knowledge indicator: Query Extraction',
    duration: '124 ms',
    icon: 'indexOpen',
    children: [
      { label: 'Fetch KI features', duration: '25 ms' },
      { label: 'Generate queries', duration: '5 ms' },
      { label: 'Deduplicate', duration: '3 ms' },
    ],
  },
  {
    id: 'sig_discovery',
    label: 'Significant Event Discovery',
    duration: '234 ms',
    icon: 'visAreaStacked',
    children: [
      { label: 'Create Plan', duration: '25 ms' },
      { label: 'Execute Plan', duration: '65 ms' },
      { label: 'Generate Discoveries', duration: '12 ms' },
      { label: 'Evaluate Discoveries', duration: '55 ms' },
      { label: 'Generate Significant event', duration: '91 ms' },
    ],
  },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function jobStatusConfig(status: Job['status']): {
  label: string;
  color: 'warning' | 'success' | 'danger';
} {
  switch (status) {
    case 'running':
      return {
        label: i18n.translate('xpack.streams.settings.jobsTab.status.running', {
          defaultMessage: 'Running',
        }),
        color: 'warning',
      };
    case 'not_finished':
      return {
        label: i18n.translate('xpack.streams.settings.jobsTab.status.notFinished', {
          defaultMessage: 'Not finished',
        }),
        color: 'danger',
      };
    default:
      return {
        label: i18n.translate('xpack.streams.settings.jobsTab.status.finished', {
          defaultMessage: 'Finished',
        }),
        color: 'success',
      };
  }
}

// ─── Execution step row ────────────────────────────────────────────────────────

function StepRow({
  label,
  duration,
  isChild = false,
  icon,
}: {
  label: string;
  duration: string;
  isChild?: boolean;
  icon?: string;
}) {
  const { euiTheme } = useEuiTheme();
  return (
    <div
      css={css`
        display: flex;
        align-items: center;
        gap: 16px;
        padding: 12px 16px;
        background: ${euiTheme.colors.backgroundBasePlain};
        border: 1px solid ${euiTheme.colors.borderBaseSubdued};
        border-radius: 10px;
        min-height: 48px;
      `}
    >
      {/* Checkmark */}
      <EuiIcon
        type="check"
        size="s"
        color="success"
        css={css`
          flex-shrink: 0;
        `}
      />

      {/* Icon (parent only) + label */}
      <div
        css={css`
          flex: 1 0 0;
          display: flex;
          align-items: center;
          gap: 10px;
          min-width: 0;
        `}
      >
        {icon && !isChild && (
          <EuiIcon
            type={icon}
            size="s"
            color="primary"
            css={css`
              flex-shrink: 0;
            `}
          />
        )}
        <span
          css={css`
            font-size: 12px;
            font-weight: ${euiTheme.font.weight.regular};
            line-height: 24px;
            color: ${euiTheme.colors.textHeading};
          `}
        >
          {label}
        </span>
      </div>

      {/* Duration */}
      <span
        css={css`
          font-size: 12px;
          font-weight: ${euiTheme.font.weight.regular};
          line-height: 16px;
          color: ${euiTheme.colors.textDisabled};
          white-space: nowrap;
          flex-shrink: 0;
        `}
      >
        {duration}
      </span>

      {/* Expand chevron */}
      <EuiIcon
        type="arrowDown"
        size="s"
        color="subdued"
        css={css`
          flex-shrink: 0;
        `}
      />
    </div>
  );
}

// ─── Job detail flyout ────────────────────────────────────────────────────────

type FlyoutTab = 'result' | 'json';

const FLYOUT_TABS = [
  {
    id: 'result' as const,
    label: i18n.translate('xpack.streams.settings.jobFlyout.tab.result', {
      defaultMessage: 'Result',
    }),
  },
  {
    id: 'json' as const,
    label: i18n.translate('xpack.streams.settings.jobFlyout.tab.json', { defaultMessage: 'JSON' }),
  },
];

const MOCK_RULES_JSON = JSON.stringify(
  [
    {
      id: 'b70d8522-cd74-4325-b73c-b78793ed0a8f',
      title: 'ZooKeeper unexpected exceptions',
      description: 'hjgfhjg',
      esql: {
        query:
          'FROM logs.ecs, logs.ecs.* METADATA _id, _source | WHERE (message : "ERROR") AND (message : "Unexpected") AND (message : "Exception")',
      },
      severity_score: 75,
      evidence: [
        'message: "ERROR [CommitProcessor:1:NIOServerCnxn@180] - Unexpected Exception:"',
        'Entity: ZooKeeper (Java, confidence 92)',
      ],
      stream_name: 'logs.ecs',
      occurrences: [],
      change_points: { type: {} },
      rule_backed: true,
    },
    {
      id: '8ff5afbe-28ea-49fa-ab4f-6e16600d803f',
      title: 'ZooKeeper connection broken errors',
      description: '',
      esql: {
        query:
          'FROM logs.ecs, logs.ecs.* METADATA _id, _source | WHERE (message : "Connection") AND (message : "broken")',
      },
      severity_score: 70,
      evidence: [
        'message: "Connection broken for id 188978561024, my id = 1, error ="',
        'Entity: ZooKeeper (Java, confidence 92)',
      ],
      stream_name: 'logs.ecs',
      occurrences: [],
      change_points: { type: {} },
      rule_backed: true,
    },
    {
      id: '55fc0003-3fad-448a-af32-fe28241a4bcf',
      title: 'HDFS DataNode exceptions while serving blocks',
      description: '',
      esql: {
        query:
          'FROM logs.ecs, logs.ecs.* METADATA _id, _source | WHERE (message : "DataNode") AND (message : "exception") AND (message : "serving")',
      },
      severity_score: 70,
      evidence: [
        'message: "WARN dfs.DataNode$DataXceiver: 10.250.10.144:50010:Got exception while serving blk_5126469776250053435 to /10.250.11.100:"',
      ],
      stream_name: 'logs.ecs',
      occurrences: [],
      change_points: { type: {} },
      rule_backed: true,
    },
    {
      id: '8ffde5b3-273a-4ea0-bccd-be01c44e0b0f',
      title: 'Apache mod_jk initialization errors',
      description: '',
      esql: {
        query:
          'FROM logs.ecs, logs.ecs.* METADATA _id, _source | WHERE (message : "error") AND (message : "mod_jk")',
      },
      severity_score: 65,
      evidence: [
        'message: "[error] mod_jk child init 1 -2"',
        'Entity: Apache HTTP Server (confidence 90)',
      ],
      stream_name: 'logs.ecs',
      occurrences: [],
      change_points: { type: {} },
      rule_backed: true,
    },
    {
      id: '06c4b1fe-6a43-42c2-8c32-c30226c76050',
      title: 'Ganglia data thread no response from datasource',
      description: '',
      esql: {
        query:
          'FROM logs.ecs, logs.ecs.* METADATA _id, _source | WHERE MATCH_PHRASE(message, "got not answer from any")',
      },
      severity_score: 65,
      evidence: [
        'message: "data_thread() got not answer from any [Thunderbird_D8] datasource"',
        'Log pattern count: 373',
      ],
      stream_name: 'logs.ecs',
      occurrences: [],
      change_points: { type: {} },
      rule_backed: true,
    },
    {
      id: '18425aca-d621-4362-85ea-d655b8abdcb3',
      title: 'BGL hardware core generation events',
      description: '',
      esql: {
        query:
          'FROM logs.ecs, logs.ecs.* METADATA _id, _source | WHERE (message : "RAS") AND (message : "KERNEL") AND (message : "generating") AND (message : "core")',
      },
      severity_score: 70,
      evidence: [
        'message: "RAS KERNEL INFO generating core.15966"',
        'Entity: BGL System (confidence 78)',
        'Log pattern count: 788',
      ],
      stream_name: 'logs.ecs',
      occurrences: [],
      change_points: { type: {} },
      rule_backed: true,
    },
  ],
  null,
  2
);

function JobDetailFlyout({ job, onClose }: { job: Job; onClose: () => void }) {
  const { euiTheme } = useEuiTheme();
  const [activeTab, setActiveTab] = useState<FlyoutTab>('result');

  return (
    <EuiFlyout onClose={onClose} size="m" aria-labelledby="jobDetailFlyoutTitle" paddingSize="none">
      {/* Top toolbar with close — EUI renders close button automatically */}
      <EuiFlyoutHeader hasBorder={false}>
        <div
          css={css`
            padding: 24px 16px 8px;
            display: flex;
            flex-direction: column;
            gap: 16px;
          `}
        >
          {/* Title + date */}
          <div>
            <EuiText>
              <h3
                id="jobDetailFlyoutTitle"
                css={css`
                  font-size: 17.5px;
                  font-weight: ${euiTheme.font.weight.semiBold};
                  color: ${euiTheme.colors.textPrimary};
                  line-height: 20px;
                  cursor: pointer;

                  &:hover {
                    text-decoration: underline;
                  }
                `}
              >
                Significant_event_job_qqwxx{job.id}
              </h3>
            </EuiText>
            <EuiText size="xs" color="subdued">
              <p>Jan 18, 2025 @ 14:12:31 (5 minutes ago)</p>
            </EuiText>
          </div>

          {/* Tags */}
          <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false} wrap>
            <EuiFlexItem grow={false}>
              <EuiBadge color="warning" iconType="warning">
                {i18n.translate('xpack.streams.settings.jobFlyout.tag.workflow', {
                  defaultMessage: 'Workflow',
                })}
              </EuiBadge>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiBadge color="hollow">
                {i18n.translate('xpack.streams.settings.jobFlyout.tag.sigEvent', {
                  defaultMessage: 'Significant event',
                })}
              </EuiBadge>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiBadge color="hollow">
                {i18n.translate('xpack.streams.settings.jobFlyout.tag.ki', {
                  defaultMessage: 'Knowledge indicators',
                })}
              </EuiBadge>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiBadge color="hollow">
                {i18n.translate('xpack.streams.settings.jobFlyout.tag.llm', {
                  defaultMessage: 'LLM',
                })}
              </EuiBadge>
            </EuiFlexItem>
          </EuiFlexGroup>

          {/* Info blocks */}
          <div
            css={css`
              display: flex;
              gap: 16px;
              align-items: stretch;
              padding: 12px;
              border: 1px solid ${euiTheme.colors.borderBaseSubdued};
              border-radius: 10px;
            `}
          >
            {/* Result */}
            <div
              css={css`
                flex: 1 0 0;
                min-width: 0;
                display: flex;
                flex-direction: column;
                gap: 2px;
              `}
            >
              <EuiText size="xs" color="subdued">
                <span>
                  {i18n.translate('xpack.streams.settings.jobFlyout.result', {
                    defaultMessage: 'Result',
                  })}
                </span>
              </EuiText>
              <EuiHealth color="success">
                <span
                  css={css`
                    font-size: 12px;
                    font-weight: ${euiTheme.font.weight.semiBold};
                  `}
                >
                  {i18n.translate('xpack.streams.settings.jobFlyout.success', {
                    defaultMessage: 'Success',
                  })}
                </span>
              </EuiHealth>
            </div>

            {/* Divider */}
            <div
              css={css`
                width: 1px;
                background: ${euiTheme.colors.borderBaseSubdued};
                flex-shrink: 0;
              `}
            />

            {/* Execution time */}
            <div
              css={css`
                flex: 1 0 0;
                min-width: 0;
                display: flex;
                flex-direction: column;
                gap: 2px;
              `}
            >
              <EuiText size="xs" color="subdued">
                <span>
                  {i18n.translate('xpack.streams.settings.jobFlyout.executionTime', {
                    defaultMessage: 'Execution time',
                  })}
                </span>
              </EuiText>
              <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
                <EuiFlexItem grow={false}>
                  <EuiIcon type="clock" size="s" />
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <span
                    css={css`
                      font-size: 12px;
                      font-weight: ${euiTheme.font.weight.bold};
                    `}
                  >
                    23s
                  </span>
                </EuiFlexItem>
              </EuiFlexGroup>
            </div>

            {/* Divider */}
            <div
              css={css`
                width: 1px;
                background: ${euiTheme.colors.borderBaseSubdued};
                flex-shrink: 0;
              `}
            />

            {/* Executed by */}
            <div
              css={css`
                flex: 1 0 0;
                min-width: 0;
                display: flex;
                flex-direction: column;
                gap: 2px;
              `}
            >
              <EuiText size="xs" color="subdued">
                <span>
                  {i18n.translate('xpack.streams.settings.jobFlyout.executedBy', {
                    defaultMessage: 'Executed by',
                  })}
                </span>
              </EuiText>
              <span
                css={css`
                  font-size: 12px;
                  font-weight: ${euiTheme.font.weight.bold};
                `}
              >
                ruflin@elastic.co
              </span>
            </div>
          </div>

          {/* Tabs */}
          <EuiTabs bottomBorder>
            {FLYOUT_TABS.map((tab) => (
              <EuiTab
                key={tab.id}
                isSelected={activeTab === tab.id}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </EuiTab>
            ))}
          </EuiTabs>
        </div>
      </EuiFlyoutHeader>

      <EuiFlyoutBody>
        {activeTab === 'result' && (
          <div
            css={css`
              display: flex;
              flex-direction: column;
              gap: 6px;
              padding: 24px;
            `}
          >
            {MOCK_EXECUTION_STEPS.map((step) => (
              <div key={step.id}>
                <StepRow label={step.label} duration={step.duration} icon={step.icon} />
                <div
                  css={css`
                    padding-left: 45px;
                    display: flex;
                    flex-direction: column;
                    gap: 6px;
                    margin-top: 6px;
                  `}
                >
                  {step.children.map((child, idx) => (
                    <StepRow key={idx} label={child.label} duration={child.duration} isChild />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'json' && (
          <EuiCodeBlock
            language="json"
            fontSize="s"
            paddingSize="m"
            isCopyable
            overflowHeight="100%"
          >
            {MOCK_RULES_JSON}
          </EuiCodeBlock>
        )}
      </EuiFlyoutBody>

      <EuiFlyoutFooter css={css`padding: 16px;`}>
        <EuiFlexGroup justifyContent="spaceBetween" alignItems="center" responsive={false} css={css`padding : 16px;`}>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty onClick={onClose} flush="left">
              {i18n.translate('xpack.streams.settings.jobFlyout.cancel', {
                defaultMessage: 'Cancel',
              })}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton color="primary" iconType="workflowsApp" size="s">
              {i18n.translate('xpack.streams.settings.jobFlyout.goToWorkflows', {
                defaultMessage: 'Go to Workflows',
              })}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
}

// ─── Jobs tab ──────────────────────────────────────────────────────────────────

const STATUS_FILTER_OPTIONS = [
  {
    id: 'all',
    label: i18n.translate('xpack.streams.settings.jobsTab.filter.all', { defaultMessage: 'All' }),
  },
  {
    id: 'running',
    label: i18n.translate('xpack.streams.settings.jobsTab.filter.running', {
      defaultMessage: 'Running',
    }),
  },
  {
    id: 'finished',
    label: i18n.translate('xpack.streams.settings.jobsTab.filter.finished', {
      defaultMessage: 'Finished',
    }),
  },
];

export function JobsTab() {
  const { euiTheme } = useEuiTheme();
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [selectedItems, setSelectedItems] = useState<Job[]>([]);
  const [pageIndex, setPageIndex] = useState(0);
  const pageSize = 20;

  const filteredJobs = MOCK_JOBS.filter((job) => {
    if (statusFilter === 'all') return true;
    if (statusFilter === 'running') return job.status === 'running';
    if (statusFilter === 'finished') return job.status === 'finished';
    return true;
  });

  const columns = [
    {
      field: 'name' as const,
      name: i18n.translate('xpack.streams.settings.jobsTab.col.rule', { defaultMessage: 'Job process' }),
      render: (name: string, job: Job) => (
        <EuiButtonEmpty
          size="s"
          flush="left"
          onClick={() => setSelectedJob(job)}
          css={css`
            font-weight: ${euiTheme.font.weight.regular};
          `}
        >
          {name}
        </EuiButtonEmpty>
      ),
    },
    {
      field: 'steps' as const,
      name: i18n.translate('xpack.streams.settings.jobsTab.col.steps', { defaultMessage: 'Steps' }),
      width: '90px',
      render: (steps: Job['steps'], job: Job) => {
        const icon =
          job.status === 'not_finished' ? 'alert' : job.status === 'running' ? 'clock' : 'check';
        const color =
          job.status === 'not_finished'
            ? 'danger'
            : job.status === 'running'
            ? 'warning'
            : 'success';
        return (
          <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiIcon type={icon} size="s" color={color} />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiText size="s">
                <span>
                  {steps.current}/{steps.total}
                </span>
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        );
      },
    },
    {
      field: 'status' as const,
      name: i18n.translate('xpack.streams.settings.jobsTab.col.status', {
        defaultMessage: 'Status',
      }),
      width: '130px',
      render: (status: Job['status']) => {
        const { label, color } = jobStatusConfig(status);
        return <EuiHealth color={color}>{label}</EuiHealth>;
      },
    },
    {
      field: 'date' as const,
      name: i18n.translate('xpack.streams.settings.jobsTab.col.date', { defaultMessage: 'Date' }),
      width: '90px',
      render: (date: string) => (
        <EuiText size="s" color="subdued">
          <span>{date}</span>
        </EuiText>
      ),
    },
    {
      name: i18n.translate('xpack.streams.settings.jobsTab.col.actions', {
        defaultMessage: 'Actions',
      }),
      width: '60px',
      actions: [
        {
          render: (job: Job) => (
            <EuiButtonIcon
              iconType="boxesVertical"
              size="xs"
              color="text"
              aria-label={i18n.translate('xpack.streams.settings.jobsTab.rowActions', {
                defaultMessage: 'Row actions for {name}',
                values: { name: job.name },
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

  const pagination = {
    pageIndex,
    pageSize,
    totalItemCount: 120,
    pageSizeOptions: [20, 50, 100],
    showPerPageOptions: true,
  };

  return (
    <>
      <div
        css={css`          
          display: flex;
          flex-direction: column;
          gap: ${euiTheme.size.m};
        `}
      >
        {/* Search + filter row */}
        <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
          <EuiFlexItem>
            <EuiFieldSearch
              placeholder={i18n.translate('xpack.streams.settings.jobsTab.searchPlaceholder', {
                defaultMessage: 'Search for a job',
              })}
              fullWidth
              compressed={false}
              data-test-subj="streamsJobsTabSearch"
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButtonGroup
              legend={i18n.translate('xpack.streams.settings.jobsTab.statusFilter', {
                defaultMessage: 'Filter by status',
              })}
              options={STATUS_FILTER_OPTIONS}
              idSelected={statusFilter}
              onChange={(id) => setStatusFilter(id)}
              buttonSize="m"
              data-test-subj="streamsJobsTabFilter"
            />
          </EuiFlexItem>
        </EuiFlexGroup>

        {/* Results count */}
        <EuiText size="s" color="subdued">
          <span>
            {i18n.translate('xpack.streams.settings.jobsTab.resultCount', {
              defaultMessage: 'Showing 1–{shown} of {total} Significant event jobs',
              values: {
                shown: Math.min((pageIndex + 1) * pageSize, 120),
                total: 120,
              },
            })}
          </span>
        </EuiText>

        <EuiSpacer size="xs" />

        {/* Table */}
        <EuiBasicTable<Job>
          items={filteredJobs}
          itemId="id"
          columns={columns}
          selection={selection}
          pagination={pagination}
          onChange={({ page }) => {
            if (page) setPageIndex(page.index);
          }}
          tableCaption={i18n.translate('xpack.streams.settings.jobsTab.tableCaption', {
            defaultMessage: 'Significant event jobs',
          })}
        />
      </div>

      {/* Job detail flyout */}
      {selectedJob && <JobDetailFlyout job={selectedJob} onClose={() => setSelectedJob(null)} />}
    </>
  );
}
