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
  EuiButtonIcon,
  EuiFilterButton,
  EuiFilterGroup,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiHorizontalRule,
  EuiIcon,
  EuiLink,
  EuiPanel,
  EuiSpacer,
  EuiTab,
  EuiTabs,
  EuiText,
  EuiTitle,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { css } from '@emotion/css';
import { i18n } from '@kbn/i18n';

import { SelectCursorIcon } from './select_cursor_icon';

const SAMPLE_MESSAGES = [
  `2024-10-30 14:25:20 ERROR MySQL Query execution failed: "INSERT INTO users (name, email) VALUES ('John Doe', 'john@example.com')", Error Code: 1062, Duplicate entry 'john@example.com' for key 'email_UNIQUE'`,
  `2024-11-01 10:15:32 ERROR PostgreSQL Query execution failed: "INSERT INTO employees (id, name) VALUES (1, 'Alice')", Error Code: 23505, Duplicate key value violates unique constraint 'employees_pkey'`,
  `2024-11-01 10:17:45 ERROR MySQL Transaction rollback: "UPDATE orders SET status='shipped' WHERE order_id=1001", Error Code: 1213, Deadlock found when trying to get lock; try restarting transaction`,
  `2024-11-01 10:19:58 WARN Redis Connection timeout: Unable to reach Redis server at 192.168.1.5:6379 after 30 seconds`,
  `2024-11-01 10:22:14 ERROR PostgreSQL Query execution failed: "DELETE FROM orders WHERE id=42", Error Code: 23503, Violates foreign key constraint 'orders_customer_id_fkey'`,
  `2024-11-02 09:13:58 ERROR Redis Connection lost: Unable to reach Redis server at 192.168.1.10:6379, retrying...`,
  `2024-11-01 10:25:30 ERROR API Request failed: POST /users, Status Code: 500, Internal Server Error`,
  `2024-11-01 10:39:25 WARN System High CPU usage detected: process_id=2468, cpu_usage=92%, threshold=85%`,
  `2024-11-02 09:20:30 INFO System Scheduled job started: job_id=42, task=DailyReportGeneration`,
];

function CreatePipelineHeader({
  onBack,
  onClose,
  titleId,
  pipelineName,
  description,
}: {
  onBack?: () => void;
  onClose: () => void;
  titleId: string;
  pipelineName?: string;
  description?: string;
}) {
  return (
    <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
      {onBack ? (
        <EuiFlexItem grow={false}>
          <EuiButtonIcon
            iconType="sortLeft"
            color="text"
            onClick={onBack}
            aria-label={i18n.translate('xpack.streams.createPipelineFlyout.back', {
              defaultMessage: 'Back',
            })}
          />
        </EuiFlexItem>
      ) : null}
      <EuiFlexItem grow={false}>
        <EuiTitle size="xs">
          <h2 id={titleId}>
            {pipelineName ??
              i18n.translate('xpack.streams.createPipelineFlyout.untitled', {
                defaultMessage: 'Untitled',
              })}
          </h2>
        </EuiTitle>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiButtonIcon
          iconType="pencil"
          color="text"
          size="xs"
          aria-label={i18n.translate('xpack.streams.createPipelineFlyout.editName', {
            defaultMessage: 'Edit pipeline name',
          })}
        />
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiText size="s" color="subdued">
          {description ??
            i18n.translate('xpack.streams.createPipelineFlyout.description', {
              defaultMessage: 'Short description that helps you identify this pipeline',
            })}
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiButtonIcon
          iconType="cross"
          color="text"
          onClick={onClose}
          aria-label={i18n.translate('xpack.streams.createPipelineFlyout.close', {
            defaultMessage: 'Close',
          })}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}

function ProcessorCard({
  title,
  code,
  isUnsaved,
  variant = 'nested',
}: {
  title: string;
  code: string;
  isUnsaved?: boolean;
  variant?: 'nested' | 'standalone';
}) {
  const { euiTheme } = useEuiTheme();
  // In the design the panel and the code box backgrounds are inverted depending
  // on whether the processor is nested inside a condition or stands on its own.
  const panelColor = variant === 'standalone' ? 'subdued' : 'plain';
  const codeColor = variant === 'standalone' ? 'plain' : 'subdued';
  return (
    <EuiPanel hasShadow={false} hasBorder paddingSize="m" color={panelColor}>
      <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiIcon type="checkInCircleFilled" color="success" size="s" />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiText
            size="xs"
            className={css`
              font-weight: ${euiTheme.font.weight.bold};
            `}
          >
            {title}
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiIcon type="check" color="success" size="s" />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiText size="xs" color="success">
                <strong>100%</strong>
              </EuiText>
            </EuiFlexItem>
            {isUnsaved ? (
              <EuiFlexItem grow={false}>
                <EuiBadge color="hollow">
                  {i18n.translate('xpack.streams.createPipelineFlyout.unsaved', {
                    defaultMessage: 'Unsaved',
                  })}
                </EuiBadge>
              </EuiFlexItem>
            ) : null}
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonIcon
            iconType="boxesVertical"
            color="text"
            size="xs"
            aria-label={i18n.translate('xpack.streams.createPipelineFlyout.processorActions', {
              defaultMessage: 'Processor actions',
            })}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="s" />
      <EuiPanel hasShadow={false} hasBorder={false} color={codeColor} paddingSize="s">
        <EuiText
          size="xs"
          color="subdued"
          className={css`
            font-family: ${euiTheme.font.familyCode};
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          `}
        >
          {code}
        </EuiText>
      </EuiPanel>
    </EuiPanel>
  );
}

function ConditionCard() {
  const { euiTheme } = useEuiTheme();
  return (
    <EuiPanel hasShadow={false} hasBorder color="subdued" paddingSize="m">
      <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false} wrap>
        <EuiFlexItem grow={false}>
          <EuiText
            size="xs"
            className={css`
              font-weight: ${euiTheme.font.weight.semiBold};
            `}
          >
            {i18n.translate('xpack.streams.createPipelineFlyout.where', {
              defaultMessage: 'WHERE',
            })}
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiBadge iconType="tokenKeyword" color="hollow">
            service.name
          </EuiBadge>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText size="xs">
            {i18n.translate('xpack.streams.createPipelineFlyout.equals', {
              defaultMessage: 'equals',
            })}
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiBadge color="hollow">postgresql</EuiBadge>
        </EuiFlexItem>
        <EuiFlexItem />
        <EuiFlexItem grow={false}>
          <EuiButtonIcon
            iconType="plus"
            color="text"
            size="xs"
            aria-label={i18n.translate('xpack.streams.createPipelineFlyout.addToCondition', {
              defaultMessage: 'Add to condition',
            })}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonIcon
            iconType="boxesVertical"
            color="text"
            size="xs"
            aria-label={i18n.translate('xpack.streams.createPipelineFlyout.conditionActions', {
              defaultMessage: 'Condition actions',
            })}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="s" />
      <ProcessorCard title="MANUAL_INGEST_PIPELINE" code={'set value of "foo" to "bar"'} />
    </EuiPanel>
  );
}

function PopulatedLeftPanelBody() {
  return (
    <EuiFlexGroup direction="column" gutterSize="m">
      <EuiFlexItem grow={false}>
        <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiFilterGroup compressed>
              <EuiFilterButton
                iconType={SelectCursorIcon}
                hasActiveFilters
                aria-label={i18n.translate('xpack.streams.createPipelineFlyout.select', {
                  defaultMessage: 'Select',
                })}
              />
              <EuiFilterButton
                iconType="editorCodeBlock"
                aria-label={i18n.translate('xpack.streams.createPipelineFlyout.codeEditor', {
                  defaultMessage: 'Code editor',
                })}
              />
            </EuiFilterGroup>
          </EuiFlexItem>
          <EuiFlexItem />
          <EuiFlexItem grow={false}>
            <EuiButton iconType="plus" size="s" color="text">
              {i18n.translate('xpack.streams.createPipelineFlyout.addCondition', {
                defaultMessage: 'Add condition',
              })}
            </EuiButton>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton iconType="plus" size="s" color="primary">
              {i18n.translate('xpack.streams.createPipelineFlyout.addProcessor', {
                defaultMessage: 'Add Processor',
              })}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <ConditionCard />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <ProcessorCard
          title="GROK"
          code={'\\[%{WORD:service}\\] %{GREEDYDATA:message} %{NUMBER:error_code}'}
          isUnsaved
          variant="standalone"
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}

function EmptyLeftPanelBody({ onGetSuggestions }: { onGetSuggestions: () => void }) {
  return (
    <EuiFlexGroup direction="column" gutterSize="l" alignItems="center">
      <EuiFlexItem grow={false}>
        <EuiText
          textAlign="center"
          className={css`
            h3 {
              font-size: 16px;
            }
          `}
        >
          <h3>
            {i18n.translate('xpack.streams.createPipelineFlyout.emptyTitle', {
              defaultMessage: 'Structure your data so you can filter and analyze it',
            })}
          </h3>
        </EuiText>
        <EuiSpacer size="s" />
        <EuiText size="s" color="subdued" textAlign="center">
          {i18n.translate('xpack.streams.createPipelineFlyout.emptyDescription', {
            defaultMessage:
              'Add processors to parse and transform your data and extract fields you can use in Discover and dashboards. Add conditions so each processor runs only on documents that match.',
          })}
        </EuiText>
        <EuiSpacer size="s" />
        <EuiText size="s" textAlign="center">
          <EuiLink external target="_blank">
            {i18n.translate('xpack.streams.createPipelineFlyout.processingDocs', {
              defaultMessage: 'Processing docs',
            })}
          </EuiLink>
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiButton iconType="sparkles" size="s" color="primary" onClick={onGetSuggestions}>
          {i18n.translate('xpack.streams.createPipelineFlyout.getSuggestions', {
            defaultMessage: 'Get suggestions based on your data',
          })}
        </EuiButton>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiText size="s" color="subdued" textAlign="center">
          {i18n.translate('xpack.streams.createPipelineFlyout.orManually', {
            defaultMessage: 'Or manually...',
          })}
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiFlexGroup gutterSize="s" responsive={false} justifyContent="center">
          <EuiFlexItem grow={false}>
            <EuiButton iconType="plus" size="s" color="text">
              {i18n.translate('xpack.streams.createPipelineFlyout.addCondition', {
                defaultMessage: 'Add condition',
              })}
            </EuiButton>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton iconType="plus" size="s" color="text">
              {i18n.translate('xpack.streams.createPipelineFlyout.addProcessor', {
                defaultMessage: 'Add Processor',
              })}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}

function CreatePipelineLeftPanel({
  hasSuggestions,
  onGetSuggestions,
}: {
  hasSuggestions: boolean;
  onGetSuggestions: () => void;
}) {
  const { euiTheme } = useEuiTheme();
  return (
    <div
      className={css`
        width: 40%;
        flex-shrink: 0;
        border-right: ${euiTheme.border.thin};
        padding: ${hasSuggestions ? euiTheme.size.base : euiTheme.size.xl} ${euiTheme.size.l};
        overflow-y: auto;
      `}
    >
      {hasSuggestions ? (
        <PopulatedLeftPanelBody />
      ) : (
        <EmptyLeftPanelBody onGetSuggestions={onGetSuggestions} />
      )}
    </div>
  );
}

const SAMPLE_FILTERS = [
  { id: 'all', label: 'All samples' },
  { id: 'parsed', label: 'Parsed' },
  { id: 'partially-parsed', label: 'Partially parsed' },
  { id: 'skipped', label: 'Skipped' },
  { id: 'failed', label: 'Failed' },
];

function CreatePipelineRightPanel({ hasSuggestions }: { hasSuggestions: boolean }) {
  const { euiTheme } = useEuiTheme();
  const [selectedTab, setSelectedTab] = useState('data-preview');
  const [selectedFilter, setSelectedFilter] = useState('all');

  return (
    <div
      className={css`
        flex: 1 1 0;
        min-width: 0;
        display: flex;
        flex-direction: column;
        overflow: hidden;
      `}
    >
      {/* Panel header: tabs + sample controls */}
      <EuiFlexGroup
        gutterSize="s"
        alignItems="center"
        responsive={false}
        className={css`
          flex-grow: 0;
          flex-shrink: 0;
          max-height: 56px;
          padding: ${euiTheme.size.s} ${euiTheme.size.base};
        `}
      >
        <EuiFlexItem>
          <EuiTabs bottomBorder={false} size="s">
            <EuiTab
              isSelected={selectedTab === 'data-preview'}
              onClick={() => setSelectedTab('data-preview')}
            >
              {i18n.translate('xpack.streams.createPipelineFlyout.dataPreview', {
                defaultMessage: 'Data preview',
              })}
            </EuiTab>
            <EuiTab
              isSelected={selectedTab === 'detected-fields'}
              onClick={() => setSelectedTab('detected-fields')}
            >
              {i18n.translate('xpack.streams.createPipelineFlyout.detectedFields', {
                defaultMessage: 'Detected fields',
              })}
            </EuiTab>
          </EuiTabs>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty iconType="arrowDown" iconSide="right" size="s" color="text">
            <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
              <EuiFlexItem grow={false}>
                {i18n.translate('xpack.streams.createPipelineFlyout.latestSamples', {
                  defaultMessage: 'Latest samples',
                })}
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiBadge color="hollow">
                  {i18n.translate('xpack.streams.createPipelineFlyout.partial', {
                    defaultMessage: 'Partial',
                  })}
                </EuiBadge>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiButtonEmpty>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonIcon
            iconType="controlsHorizontal"
            display="base"
            color="text"
            size="s"
            aria-label={i18n.translate('xpack.streams.createPipelineFlyout.settings', {
              defaultMessage: 'Sample settings',
            })}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonIcon
            iconType="refresh"
            display="base"
            color="primary"
            size="s"
            aria-label={i18n.translate('xpack.streams.createPipelineFlyout.refresh', {
              defaultMessage: 'Refresh',
            })}
          />
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiHorizontalRule margin="none" />

      {/* Sample filter row (only shown once suggestions are applied) */}
      {hasSuggestions ? (
        <EuiFlexGroup
          gutterSize="s"
          alignItems="center"
          responsive={false}
          className={css`
            flex-grow: 0;
            flex-shrink: 0;
            padding: ${euiTheme.size.s} ${euiTheme.size.base};
          `}
        >
          <EuiFlexItem grow={false}>
            <EuiFilterGroup>
              {SAMPLE_FILTERS.map((filter) => (
                <EuiFilterButton
                  key={filter.id}
                  hasActiveFilters={selectedFilter === filter.id}
                  isToggle
                  isSelected={selectedFilter === filter.id}
                  onClick={() => setSelectedFilter(filter.id)}
                >
                  {filter.label}
                </EuiFilterButton>
              ))}
            </EuiFilterGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      ) : null}

      {/* Data grid toolbar */}
      <EuiFlexGroup
        gutterSize="m"
        alignItems="center"
        responsive={false}
        className={css`
          flex-grow: 0;
          flex-shrink: 0;
          max-height: 32px;
          padding: ${euiTheme.size.xs} ${euiTheme.size.base};
        `}
      >
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty iconType="tableDensityCompact" size="xs" color="text">
            {i18n.translate('xpack.streams.createPipelineFlyout.columns', {
              defaultMessage: 'Columns {count}',
              values: { count: 1 },
            })}
          </EuiButtonEmpty>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty iconType="sortable" size="xs" color="text">
            {i18n.translate('xpack.streams.createPipelineFlyout.sortFields', {
              defaultMessage: 'Sort fields {count}',
              values: { count: 1 },
            })}
          </EuiButtonEmpty>
        </EuiFlexItem>
        <EuiFlexItem />
        <EuiFlexItem grow={false}>
          <EuiButtonIcon
            iconType="controlsHorizontal"
            color="text"
            size="xs"
            aria-label={i18n.translate('xpack.streams.createPipelineFlyout.gridControls', {
              defaultMessage: 'Grid controls',
            })}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonIcon
            iconType="fullScreen"
            color="text"
            size="xs"
            aria-label={i18n.translate('xpack.streams.createPipelineFlyout.fullScreen', {
              defaultMessage: 'Full screen',
            })}
          />
        </EuiFlexItem>
      </EuiFlexGroup>

      {/* Data grid */}
      <div
        className={css`
          flex: 1 1 0;
          min-height: 0;
          overflow-y: auto;
          border-top: ${euiTheme.border.thin};
        `}
      >
        <div
          className={css`
            padding: ${euiTheme.size.xs} ${euiTheme.size.base};
            background-color: ${euiTheme.colors.backgroundBaseSubdued};
            border-bottom: ${euiTheme.border.thin};
          `}
        >
          <EuiText size="xs">
            <strong>
              {i18n.translate('xpack.streams.createPipelineFlyout.messageColumn', {
                defaultMessage: 'Message',
              })}
            </strong>
          </EuiText>
        </div>
        {SAMPLE_MESSAGES.map((message, index) => (
          <div
            key={index}
            className={css`
              padding: 6px ${euiTheme.size.base};
              border-bottom: ${euiTheme.border.thin};
            `}
          >
            <EuiText size="s">{message}</EuiText>
          </div>
        ))}
      </div>
    </div>
  );
}

export function CreatePipelineFlyout({
  onBack,
  onClose,
  onApply,
  pipelineName,
  description,
  initialPopulated = false,
  applyMode = false,
}: {
  onBack?: () => void;
  onClose: () => void;
  onApply?: () => void;
  /**
   * When set, the flyout renders as an existing pipeline (name shown in the
   * header) rather than a brand-new "Untitled" pipeline.
   */
  pipelineName?: string;
  description?: string;
  /**
   * Start with the processors/conditions already populated (used when opening
   * an existing pipeline directly rather than creating one from scratch).
   */
  initialPopulated?: boolean;
  /**
   * When opened from the pipeline selector (to apply an existing pipeline to a
   * connection) the primary action applies the pipeline rather than saving edits,
   * so the footer button reads "Apply pipeline" instead of "Save changes".
   */
  applyMode?: boolean;
}) {
  const titleId = useGeneratedHtmlId({ prefix: 'createPipelineFlyoutTitle' });
  const [hasSuggestions, setHasSuggestions] = useState(initialPopulated);

  const isExistingPipeline = pipelineName !== undefined;
  const applyPipeline = onApply ?? onClose;

  return (
    <EuiFlyout
      size="l"
      onClose={onClose}
      hideCloseButton
      aria-labelledby={titleId}
      data-test-subj="createPipelineFlyout"
    >
      <EuiFlyoutHeader hasBorder>
        <CreatePipelineHeader
          onBack={onBack}
          onClose={onClose}
          titleId={titleId}
          pipelineName={pipelineName}
          description={description}
        />
      </EuiFlyoutHeader>

      <EuiFlyoutBody
        className={css`
          .euiFlyoutBody__overflowContent {
            height: 100%;
            padding: 0;
          }
        `}
      >
        <EuiFlexGroup
          gutterSize="none"
          responsive={false}
          className={css`
            height: 100%;
          `}
        >
          <CreatePipelineLeftPanel
            hasSuggestions={hasSuggestions}
            onGetSuggestions={() => setHasSuggestions(true)}
          />
          <CreatePipelineRightPanel hasSuggestions={hasSuggestions} />
        </EuiFlexGroup>
      </EuiFlyoutBody>

      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween" alignItems="center" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty onClick={onClose} flush="left">
              {hasSuggestions && !isExistingPipeline
                ? i18n.translate('xpack.streams.createPipelineFlyout.cancelFooter', {
                    defaultMessage: 'Cancel',
                  })
                : i18n.translate('xpack.streams.createPipelineFlyout.closeFooter', {
                    defaultMessage: 'Close',
                  })}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            {isExistingPipeline ? (
              <EuiButton fill onClick={applyPipeline}>
                {applyMode
                  ? i18n.translate('xpack.streams.createPipelineFlyout.applyPipeline', {
                      defaultMessage: 'Apply pipeline',
                    })
                  : i18n.translate('xpack.streams.createPipelineFlyout.saveChanges', {
                      defaultMessage: 'Save changes',
                    })}
              </EuiButton>
            ) : hasSuggestions ? (
              <EuiButton fill onClick={applyPipeline}>
                {i18n.translate('xpack.streams.createPipelineFlyout.createAndApplyPipeline', {
                  defaultMessage: 'Create and apply pipeline',
                })}
              </EuiButton>
            ) : (
              <EuiButton fill isDisabled>
                {i18n.translate('xpack.streams.createPipelineFlyout.createPipeline', {
                  defaultMessage: 'Create pipeline',
                })}
              </EuiButton>
            )}
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
}
