/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiBadge,
  EuiButtonIcon,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiInMemoryTable,
  EuiLink,
  EuiPopover,
  EuiText,
  type EuiBasicTableColumn,
} from '@elastic/eui';
import { StreamsListTableTools } from './streams_list_table_tools';
import { STREAMS_TABLE_SEARCH_ARIA_LABEL } from './translations';
import { CreatePipelineFlyout } from './create_pipeline_flyout';

const TAG_BADGE_COLORS: Record<string, string> = {
  tag1: 'accent',
  tag2: 'neutral',
  tag3: 'warning',
};

interface PipelineRow {
  name: string;
  description: string;
  isManaged: boolean;
  tags: string[];
  processors: number;
  usageInstances: number;
}

/**
 * Demo-only mock pipelines. Mirrors the design mockup so the Pipelines tab can
 * be shown with realistic data on this branch. Not wired to any real data.
 */
const PIPELINE_ROWS: PipelineRow[] = [
  {
    name: 'Normalize data',
    description: 'Transformation set to normalize data',
    isManaged: true,
    tags: ['tag1', 'tag2', 'tag3'],
    processors: 5,
    usageInstances: 2,
  },
  {
    name: 'Remove noise',
    description: 'Drop all info level events',
    isManaged: false,
    tags: ['tag1'],
    processors: 2,
    usageInstances: 5,
  },
  {
    name: 'Geolocation converter',
    description: 'Convert host.geo.location.lon from string to double for proper geo typing',
    isManaged: false,
    tags: ['tag2', 'tag3'],
    processors: 12,
    usageInstances: 1,
  },
  {
    name: 'Filebeat 9.4.1 Elasticsearch audit',
    description: 'Built-in pipeline for parsing Elasticsearch audit logs',
    isManaged: true,
    tags: ['tag2', 'tag3'],
    processors: 5,
    usageInstances: 0,
  },
];

const MANAGED_BADGE_LABEL = i18n.translate('xpack.streams.pipelinesTable.managedBadgeLabel', {
  defaultMessage: 'managed',
});

function PipelineTags({ row }: { row: PipelineRow }) {
  return (
    <EuiFlexGroup gutterSize="xs" responsive={false} wrap alignItems="center">
      {row.isManaged && (
        <EuiFlexItem grow={false}>
          <EuiBadge color="hollow" iconType="logoElastic">
            {MANAGED_BADGE_LABEL}
          </EuiBadge>
        </EuiFlexItem>
      )}
      {row.tags.map((tag) => (
        <EuiFlexItem grow={false} key={tag}>
          <EuiBadge color={TAG_BADGE_COLORS[tag] ?? 'default'}>{tag}</EuiBadge>
        </EuiFlexItem>
      ))}
    </EuiFlexGroup>
  );
}

function PipelineRowActions({ row }: { row: PipelineRow }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Managed pipelines are built-in: they offer a "duplicate" affordance.
  // Editable pipelines expose the overflow actions menu.
  if (row.isManaged) {
    return (
      <EuiButtonIcon
        iconType="copy"
        color="text"
        data-test-subj={`pipelineDuplicateButton-${row.name}`}
        aria-label={i18n.translate('xpack.streams.pipelinesTable.duplicateAriaLabel', {
          defaultMessage: 'Duplicate {name}',
          values: { name: row.name },
        })}
      />
    );
  }

  return (
    <EuiPopover
      isOpen={isMenuOpen}
      closePopover={() => setIsMenuOpen(false)}
      anchorPosition="downRight"
      panelPaddingSize="none"
      button={
        <EuiButtonIcon
          iconType="ellipsis"
          color="text"
          onClick={() => setIsMenuOpen((open) => !open)}
          data-test-subj={`pipelineActionsButton-${row.name}`}
          aria-label={i18n.translate('xpack.streams.pipelinesTable.rowActionsAriaLabel', {
            defaultMessage: 'Actions for {name}',
            values: { name: row.name },
          })}
        />
      }
    >
      <EuiContextMenuPanel
        size="s"
        items={[
          <EuiContextMenuItem key="manage" icon="gear" onClick={() => setIsMenuOpen(false)}>
            {i18n.translate('xpack.streams.pipelinesTable.rowActions.manage', {
              defaultMessage: 'Manage pipeline',
            })}
          </EuiContextMenuItem>,
        ]}
      />
    </EuiPopover>
  );
}

export function PipelinesTable() {
  const [selectedPipeline, setSelectedPipeline] = useState<PipelineRow | null>(null);

  const columns: Array<EuiBasicTableColumn<PipelineRow>> = [
    {
      field: 'name',
      name: i18n.translate('xpack.streams.pipelinesTable.nameColumn', {
        defaultMessage: 'Name',
      }),
      render: (_: unknown, row: PipelineRow) => (
        <EuiFlexGroup direction="column" gutterSize="xs">
          <EuiFlexItem grow={false}>
            <EuiLink
              href="#"
              data-test-subj={`pipelineNameLink-${row.name}`}
              onClick={(event: React.MouseEvent) => {
                event.preventDefault();
                setSelectedPipeline(row);
              }}
            >
              {row.name}
            </EuiLink>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiText size="xs" color="subdued">
              {row.description}
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <PipelineTags row={row} />
          </EuiFlexItem>
        </EuiFlexGroup>
      ),
    },
    {
      field: 'processors',
      name: i18n.translate('xpack.streams.pipelinesTable.processorsColumn', {
        defaultMessage: 'Processors',
      }),
      width: '160px',
      render: (processors: number) => <EuiBadge color="hollow">{processors}</EuiBadge>,
    },
    {
      field: 'usageInstances',
      name: i18n.translate('xpack.streams.pipelinesTable.usageInstancesColumn', {
        defaultMessage: 'Usage Instances',
      }),
      width: '160px',
      render: (usageInstances: number, row: PipelineRow) => (
        <EuiLink href="#" data-test-subj={`pipelineUsageInstancesLink-${row.name}`}>
          {usageInstances}
        </EuiLink>
      ),
    },
    {
      field: 'actions',
      name: '',
      width: '48px',
      align: 'right',
      render: (_: unknown, row: PipelineRow) => <PipelineRowActions row={row} />,
    },
  ];

  return (
    <>
      <EuiInMemoryTable<PipelineRow>
        tableCaption={i18n.translate('xpack.streams.pipelinesTable.tableCaption', {
          defaultMessage: 'Pipelines table',
        })}
        data-test-subj="pipelinesTable"
        items={PIPELINE_ROWS}
        columns={columns}
        search={{
          box: {
            incremental: true,
            compressed: true,
            'aria-label': STREAMS_TABLE_SEARCH_ARIA_LABEL,
          },
          toolsRight: (
            <StreamsListTableTools
              newButtonLabel={i18n.translate('xpack.streams.pipelinesTable.newButtonLabel', {
                defaultMessage: 'New pipeline',
              })}
            />
          ),
        }}
      />
      {selectedPipeline ? (
        <CreatePipelineFlyout
          pipelineName={selectedPipeline.name}
          description={selectedPipeline.description}
          initialPopulated
          onClose={() => setSelectedPipeline(null)}
        />
      ) : null}
    </>
  );
}
