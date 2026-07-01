/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiBadge,
  EuiButton,
  EuiButtonEmpty,
  EuiFieldSearch,
  EuiFilterButton,
  EuiFilterGroup,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiLink,
  EuiNotificationBadge,
  EuiPanel,
  EuiText,
  EuiTitle,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { css } from '@emotion/css';
import { i18n } from '@kbn/i18n';

import { CreatePipelineFlyout } from './create_pipeline_flyout';

interface PipelineRow {
  id: string;
  name: string;
  description: string;
  processors: number;
  instances: number;
  managed?: boolean;
  tags: string[];
}

// Mirror the tag colors used in the Pipelines tab (see pipelines_table.tsx).
const TAG_BADGE_COLORS: Record<string, string> = {
  tag1: 'accent',
  tag2: 'neutral',
  tag3: 'warning',
};

const MANAGED_BADGE_LABEL = i18n.translate('xpack.streams.pipelineFlyout.managed', {
  defaultMessage: 'managed',
});

const PIPELINES: PipelineRow[] = [
  {
    id: 'normalize-data',
    name: 'Normalize data',
    description: 'Transformation set to normalize data',
    processors: 5,
    instances: 2,
    managed: true,
    tags: ['tag1', 'tag3'],
  },
  {
    id: 'pii-redaction',
    name: 'PII redaction',
    description:
      'Detects and masks personally identifiable information (PII) such as emails, IP addresses, and phone numbers before indexing',
    processors: 2,
    instances: 5,
    managed: true,
    tags: ['tag2'],
  },
  {
    id: 'remove-noise',
    name: 'Remove noise',
    description: 'Drop all info level events',
    processors: 12,
    instances: 1,
    tags: ['tag1'],
  },
  {
    id: 'geolocation-converter',
    name: 'Geolocation converter',
    description: 'Convert host.geo.location.lon from string to double for proper geo typing',
    processors: 5,
    instances: 0,
    tags: ['tag2', 'tag3'],
  },
  {
    id: 'filebeat-audit',
    name: 'Filebeat 9.4.1 Elasticsearch audit',
    description: 'Built-in pipeline for parsing Elasticsearch audit logs',
    processors: 2,
    instances: 0,
    managed: true,
    tags: ['tag2', 'tag3'],
  },
];

function PipelineRowTags({ row }: { row: PipelineRow }) {
  return (
    <EuiFlexGroup gutterSize="xs" responsive={false} wrap alignItems="center">
      {row.managed ? (
        <EuiFlexItem grow={false}>
          <EuiBadge color="hollow" iconType="logoElastic">
            {MANAGED_BADGE_LABEL}
          </EuiBadge>
        </EuiFlexItem>
      ) : null}
      {row.tags.map((tag) => (
        <EuiFlexItem grow={false} key={tag}>
          <EuiBadge color={TAG_BADGE_COLORS[tag] ?? 'default'}>{tag}</EuiBadge>
        </EuiFlexItem>
      ))}
    </EuiFlexGroup>
  );
}

function PipelineTable({
  selectedId,
  onSelect,
  onOpenDetail,
}: {
  selectedId: string | null;
  onSelect: (id: string) => void;
  onOpenDetail: (id: string) => void;
}) {
  const { euiTheme } = useEuiTheme();

  const headerCellClassName = css`
    background-color: ${euiTheme.colors.backgroundBaseSubdued};
    padding: ${euiTheme.size.xs} ${euiTheme.size.s};
  `;

  const numericColumnClassName = css`
    width: 96px;
    flex-shrink: 0;
  `;

  return (
    <div
      className={css`
        width: 100%;
        border-top: ${euiTheme.border.thin};
      `}
    >
      {/* Header row */}
      <EuiFlexGroup gutterSize="none" responsive={false} alignItems="stretch">
        <EuiFlexItem className={headerCellClassName}>
          <EuiText size="xs" color="subdued">
            <strong>
              {i18n.translate('xpack.streams.pipelineFlyout.columnName', {
                defaultMessage: 'Name',
              })}
            </strong>
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false} className={`${headerCellClassName} ${numericColumnClassName}`}>
          <EuiText size="xs" color="subdued">
            <strong>
              {i18n.translate('xpack.streams.pipelineFlyout.columnProcessors', {
                defaultMessage: 'Processors',
              })}
            </strong>
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false} className={`${headerCellClassName} ${numericColumnClassName}`}>
          <EuiText size="xs" color="subdued">
            <strong>
              {i18n.translate('xpack.streams.pipelineFlyout.columnInstances', {
                defaultMessage: 'Instances',
              })}
            </strong>
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>

      {/* Body rows */}
      {PIPELINES.map((row) => {
        const isSelected = row.id === selectedId;
        return (
          <EuiFlexGroup
            key={row.id}
            gutterSize="none"
            responsive={false}
            alignItems="stretch"
            role="button"
            tabIndex={0}
            onClick={() => onSelect(row.id)}
            onKeyDown={(event: React.KeyboardEvent) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                onSelect(row.id);
              }
            }}
            className={css`
              cursor: pointer;
              border-bottom: ${euiTheme.border.thin};
              background-color: ${isSelected
                ? euiTheme.colors.backgroundBaseInteractiveSelect
                : euiTheme.colors.backgroundBasePlain};
              &:hover {
                background-color: ${isSelected
                  ? euiTheme.colors.backgroundBaseInteractiveSelect
                  : euiTheme.colors.backgroundBaseSubdued};
              }
            `}
          >
            <EuiFlexItem
              className={css`
                min-width: 0;
                padding: ${euiTheme.size.s};
              `}
            >
              <EuiLink
                onClick={(event: React.MouseEvent) => {
                  event.stopPropagation();
                  onOpenDetail(row.id);
                }}
              >
                {row.name}
              </EuiLink>
              <EuiText size="xs" color="subdued">
                {row.description}
              </EuiText>
              <div
                className={css`
                  margin-top: ${euiTheme.size.xs};
                `}
              >
                <PipelineRowTags row={row} />
              </div>
            </EuiFlexItem>
            <EuiFlexItem
              grow={false}
              className={`${numericColumnClassName} ${css`
                padding: ${euiTheme.size.s};
              `}`}
            >
              <div>
                <EuiNotificationBadge color="subdued">{row.processors}</EuiNotificationBadge>
              </div>
            </EuiFlexItem>
            <EuiFlexItem
              grow={false}
              className={`${numericColumnClassName} ${css`
                padding: ${euiTheme.size.s};
              `}`}
            >
              <EuiText size="s">{row.instances}</EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        );
      })}
    </div>
  );
}

export function PipelineFlyout({
  onClose,
  onApply,
}: {
  onClose: () => void;
  onApply?: () => void;
}) {
  const titleId = useGeneratedHtmlId({ prefix: 'pipelineFlyoutTitle' });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const detailPipeline = PIPELINES.find((p) => p.id === detailId) ?? null;

  const applyAndClose = onApply ?? onClose;

  // Clicking "Create new pipeline" replaces this flyout with a larger creation flyout.
  if (isCreating) {
    return (
      <CreatePipelineFlyout
        onBack={() => setIsCreating(false)}
        onClose={onClose}
        onApply={applyAndClose}
      />
    );
  }

  // Clicking an existing pipeline name opens the same preloaded creation flyout
  // used by the pipelines table, with its processors/conditions already populated.
  // Here it is opened from the pipeline selector to apply the pipeline, so the
  // primary action reads "Apply pipeline" rather than "Save changes".
  if (detailPipeline) {
    return (
      <CreatePipelineFlyout
        pipelineName={detailPipeline.name}
        description={detailPipeline.description}
        initialPopulated
        applyMode
        onBack={() => setDetailId(null)}
        onClose={onClose}
        onApply={applyAndClose}
      />
    );
  }

  return (
    <EuiFlyout size="m" onClose={onClose} aria-labelledby={titleId} data-test-subj="pipelineFlyout">
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2 id={titleId}>
            {i18n.translate('xpack.streams.pipelineFlyout.title', {
              defaultMessage: 'Apply Pipeline',
            })}
          </h2>
        </EuiTitle>
      </EuiFlyoutHeader>

      <EuiFlyoutBody>
        <EuiFlexGroup direction="column" gutterSize="m">
          <EuiFlexItem grow={false}>
            <EuiPanel hasShadow={false} hasBorder paddingSize="m">
              <EuiFlexGroup gutterSize="m" alignItems="center" responsive={false}>
                <EuiFlexItem grow={false}>
                  <EuiButton size="s" onClick={() => setIsCreating(true)}>
                    {i18n.translate('xpack.streams.pipelineFlyout.createNewPipeline', {
                      defaultMessage: 'Create new pipeline',
                    })}
                  </EuiButton>
                </EuiFlexItem>
                <EuiFlexItem>
                  <EuiText size="xs" color="subdued">
                    {i18n.translate('xpack.streams.pipelineFlyout.createNewPipelineHelp', {
                      defaultMessage:
                        'Select processors to create a new pipeline and apply it here. Customize it further in Pipelines page.',
                    })}
                  </EuiText>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiPanel>
          </EuiFlexItem>

          <EuiFlexItem grow={false}>
            <EuiFlexGroup gutterSize="s" responsive={false} alignItems="center">
              <EuiFlexItem>
                <EuiFieldSearch
                  fullWidth
                  placeholder={i18n.translate('xpack.streams.pipelineFlyout.searchPlaceholder', {
                    defaultMessage: 'Search...',
                  })}
                  aria-label={i18n.translate('xpack.streams.pipelineFlyout.searchAriaLabel', {
                    defaultMessage: 'Search pipelines',
                  })}
                />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiFilterGroup>
                  <EuiFilterButton iconType="arrowDown" iconSide="right">
                    {i18n.translate('xpack.streams.pipelineFlyout.sortByRecent', {
                      defaultMessage: 'Sort by: Recent',
                    })}
                  </EuiFilterButton>
                </EuiFilterGroup>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiFilterGroup>
                  <EuiFilterButton iconType="arrowDown" iconSide="right">
                    {i18n.translate('xpack.streams.pipelineFlyout.filter', {
                      defaultMessage: 'Filter',
                    })}
                  </EuiFilterButton>
                </EuiFilterGroup>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>

          <EuiFlexItem grow={false}>
            <PipelineTable
              selectedId={selectedId}
              onSelect={setSelectedId}
              onOpenDetail={setDetailId}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutBody>

      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween" alignItems="center" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty onClick={onClose} flush="left">
              {i18n.translate('xpack.streams.pipelineFlyout.close', {
                defaultMessage: 'Close',
              })}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton fill isDisabled={selectedId === null} onClick={applyAndClose}>
              {i18n.translate('xpack.streams.pipelineFlyout.applyPipeline', {
                defaultMessage: 'Apply pipeline',
              })}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
}
