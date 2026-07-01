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
  EuiCallOut,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiForm,
  EuiFormRow,
  EuiHorizontalRule,
  EuiIcon,
  EuiLink,
  EuiRadioGroup,
  EuiSelect,
  EuiSpacer,
  EuiText,
  EuiTitle,
  EuiToken,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { css } from '@emotion/css';
import { i18n } from '@kbn/i18n';

interface SampleRow {
  logLevel: string;
  service: string;
  description: string;
  errorCode: string;
  timestamp: string;
}

const SAMPLE_ROWS: SampleRow[] = [
  {
    logLevel: 'ERROR',
    service: 'MySQL',
    description: 'Query execution failed: "INSERT INTO users (name, email) VALUES (...)"',
    errorCode: '1062',
    timestamp: '2024-10-30 14:25:20',
  },
  {
    logLevel: 'WARN',
    service: 'Redis',
    description: 'Connection timeout: Unable to reach Redis server at 192.168.1.5:6379',
    errorCode: '-',
    timestamp: '2024-11-01 10:19:58',
  },
  {
    logLevel: 'ERROR',
    service: 'API',
    description: 'Transaction rollback: "UPDATE orders SET status=\'shipped\'..."',
    errorCode: '1213',
    timestamp: '2024-11-01 10:17:45',
  },
  {
    logLevel: 'INFO',
    service: 'Redis',
    description: 'Connection timeout: Unable to reach Redis server',
    errorCode: '-',
    timestamp: '2024-11-01 10:19:58',
  },
  {
    logLevel: 'ERROR',
    service: 'PostgreSQL',
    description: 'Query execution failed: "DELETE FROM orders WHERE id=42"',
    errorCode: '1062',
    timestamp: '2024-11-01 10:22:14',
  },
  {
    logLevel: 'ERROR',
    service: 'Redis',
    description: 'Connection lost: Unable to reach Redis server at 192.168.1.10:6379',
    errorCode: '-',
    timestamp: '2024-11-02 09:13:58',
  },
  {
    logLevel: 'ERROR',
    service: 'API',
    description: 'Request failed: POST /users, Status Code: 500',
    errorCode: '-',
    timestamp: '2024-11-01 10:25:30',
  },
  {
    logLevel: 'INFO',
    service: 'MySQL',
    description: 'Query execution failed: "INSERT INTO users (name, email)..."',
    errorCode: '1062',
    timestamp: '2024-10-30 14:25:20',
  },
  {
    logLevel: 'ERROR',
    service: 'System',
    description: 'High CPU usage detected: process_id=2468, cpu_usage=92%',
    errorCode: '-',
    timestamp: '2024-11-01 10:39:25',
  },
  {
    logLevel: 'ERROR',
    service: 'System',
    description: 'Scheduled job started: job_id=42, task=DailyReportGeneration',
    errorCode: '-',
    timestamp: '2024-11-02 09:20:30',
  },
  {
    logLevel: 'ERROR',
    service: 'MySQL',
    description: 'Query execution failed: "INSERT INTO users (name, email)..."',
    errorCode: '1062',
    timestamp: '2024-10-30 14:25:20',
  },
  {
    logLevel: 'WARN',
    service: 'Redis',
    description: 'Query execution failed: "INSERT INTO employees (id, name)..."',
    errorCode: '-',
    timestamp: '2024-11-01 10:15:32',
  },
  {
    logLevel: 'ERROR',
    service: 'API',
    description: 'Transaction rollback: "UPDATE orders SET status=\'shipped\'..."',
    errorCode: '-',
    timestamp: '2024-11-01 10:17:45',
  },
  {
    logLevel: 'INFO',
    service: 'Redis',
    description: 'Connection timeout: Unable to reach Redis server',
    errorCode: '-',
    timestamp: '2024-11-01 10:19:58',
  },
  {
    logLevel: 'ERROR',
    service: 'PostgreSQL',
    description: 'Query execution failed: "DELETE FROM orders WHERE id=42"',
    errorCode: '1062',
    timestamp: '2024-11-01 10:22:14',
  },
];

const FIELD_OPTIONS = [
  { value: 'event.dataset', text: 'event.dataset' },
  { value: 'log.level', text: 'log.level' },
  { value: 'service.name', text: 'service.name' },
  { value: 'message', text: 'message' },
];

const OPERATOR_OPTIONS = [
  { value: 'equals', text: 'equals' },
  { value: 'not_equals', text: 'does not equal' },
  { value: 'contains', text: 'contains' },
  { value: 'exists', text: 'exists' },
];

const DESTINATION_OPTIONS = [
  {
    value: 'none',
    text: i18n.translate('xpack.streams.createRoutingFlyout.destinationNone', {
      defaultMessage: 'None set (connect later)',
    }),
  },
  { value: 'logs-app', text: 'logs-app' },
  { value: 'logs-errors', text: 'logs-errors' },
  { value: 'logs-archive', text: 'logs-archive' },
];

interface ConditionRow {
  id: string;
  field: string;
  operator: string;
  value: string;
}

let conditionIdCounter = 0;
function makeCondition(field = 'event.dataset', value = 'foo'): ConditionRow {
  conditionIdCounter += 1;
  return { id: `condition-${conditionIdCounter}`, field, operator: 'equals', value };
}

// Shared right-hand "Data Preview" panel, present in every state.
function DataPreviewPanel() {
  const { euiTheme } = useEuiTheme();

  const columns: Array<{ key: keyof SampleRow; label: string; grow: boolean }> = [
    { key: 'logLevel', label: 'log.level', grow: false },
    { key: 'service', label: 'service', grow: false },
    { key: 'description', label: 'description', grow: true },
    { key: 'errorCode', label: 'error code', grow: false },
    { key: 'timestamp', label: 'timestamp', grow: false },
  ];

  const cellClassName = css`
    padding: ${euiTheme.size.xs} ${euiTheme.size.s};
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  `;

  const widthFor = (key: keyof SampleRow) => {
    switch (key) {
      case 'logLevel':
        return '70px';
      case 'service':
        return '90px';
      case 'errorCode':
        return '80px';
      case 'timestamp':
        return '150px';
      default:
        return undefined;
    }
  };

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
      {/* Panel header: title + time picker + refresh */}
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
          <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiIcon type="visTable" />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiText
                size="s"
                className={css`
                  font-weight: ${euiTheme.font.weight.semiBold};
                `}
              >
                {i18n.translate('xpack.streams.createRoutingFlyout.dataPreview', {
                  defaultMessage: 'Data Preview',
                })}
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem />
        <EuiFlexItem grow={false}>
          <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty iconType="calendar" size="s" color="text" />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <div
                className={css`
                  padding: ${euiTheme.size.xs} ${euiTheme.size.s};
                  border: ${euiTheme.border.thin};
                  border-radius: ${euiTheme.border.radius.small};
                  min-width: 140px;
                `}
              >
                <EuiText size="s" color="subdued">
                  {i18n.translate('xpack.streams.createRoutingFlyout.last15Minutes', {
                    defaultMessage: 'Last 15 minutes',
                  })}
                </EuiText>
              </div>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButtonIcon
                iconType="refresh"
                display="base"
                color="primary"
                size="s"
                aria-label={i18n.translate('xpack.streams.createRoutingFlyout.refresh', {
                  defaultMessage: 'Refresh',
                })}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>

      {/* Toolbar */}
      <EuiFlexGroup
        gutterSize="m"
        alignItems="center"
        responsive={false}
        className={css`
          flex-grow: 0;
          flex-shrink: 0;
          padding: ${euiTheme.size.xs} ${euiTheme.size.base};
          border-top: ${euiTheme.border.thin};
        `}
      >
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty iconType="tableDensityCompact" size="xs" color="text">
            {i18n.translate('xpack.streams.createRoutingFlyout.columns', {
              defaultMessage: 'Columns {count}',
              values: { count: 2 },
            })}
          </EuiButtonEmpty>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty iconType="sortable" size="xs" color="text">
            {i18n.translate('xpack.streams.createRoutingFlyout.sortFields', {
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
            aria-label={i18n.translate('xpack.streams.createRoutingFlyout.gridControls', {
              defaultMessage: 'Grid controls',
            })}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonIcon
            iconType="fullScreen"
            color="text"
            size="xs"
            aria-label={i18n.translate('xpack.streams.createRoutingFlyout.fullScreen', {
              defaultMessage: 'Full screen',
            })}
          />
        </EuiFlexItem>
      </EuiFlexGroup>

      {/* Grid */}
      <div
        className={css`
          flex: 1 1 0;
          min-height: 0;
          overflow-y: auto;
          border-top: ${euiTheme.border.thin};
        `}
      >
        {/* Header row */}
        <EuiFlexGroup
          gutterSize="none"
          responsive={false}
          alignItems="stretch"
          className={css`
            background-color: ${euiTheme.colors.backgroundBaseSubdued};
            border-bottom: ${euiTheme.border.thin};
          `}
        >
          {columns.map((column) => (
            <EuiFlexItem
              key={column.key}
              grow={column.grow}
              className={css`
                ${!column.grow ? `width: ${widthFor(column.key)}; flex-grow: 0;` : 'min-width: 0;'}
              `}
            >
              <div className={cellClassName}>
                <EuiText size="xs">
                  <strong>{column.label}</strong>
                </EuiText>
              </div>
            </EuiFlexItem>
          ))}
        </EuiFlexGroup>

        {/* Body rows */}
        {SAMPLE_ROWS.map((row, index) => (
          <EuiFlexGroup
            key={index}
            gutterSize="none"
            responsive={false}
            alignItems="stretch"
            className={css`
              border-bottom: ${euiTheme.border.thin};
            `}
          >
            {columns.map((column) => (
              <EuiFlexItem
                key={column.key}
                grow={column.grow}
                className={css`
                  ${!column.grow
                    ? `width: ${widthFor(column.key)}; flex-grow: 0;`
                    : 'min-width: 0;'}
                `}
              >
                <div className={cellClassName}>
                  <EuiText
                    size="xs"
                    color={column.key === 'description' ? 'default' : 'subdued'}
                    className={css`
                      font-family: ${euiTheme.font.familyCode};
                      overflow: hidden;
                      text-overflow: ellipsis;
                      white-space: nowrap;
                    `}
                  >
                    {row[column.key]}
                  </EuiText>
                </div>
              </EuiFlexItem>
            ))}
          </EuiFlexGroup>
        ))}
      </div>
    </div>
  );
}

// State 1 — empty prompt encouraging the user to create a routing.
function EmptyRoutingPanel({ onCreate }: { onCreate: () => void }) {
  const { euiTheme } = useEuiTheme();
  return (
    <EuiFlexGroup
      direction="column"
      gutterSize="l"
      alignItems="center"
      className={css`
        height: fit-content;
      `}
    >
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
            {i18n.translate('xpack.streams.createRoutingFlyout.emptyTitle', {
              defaultMessage: 'Get your data to the right place',
            })}
          </h3>
        </EuiText>
        <EuiSpacer size="s" />
        <EuiText size="s" color="subdued" textAlign="center">
          {i18n.translate('xpack.streams.createRoutingFlyout.emptyDescription', {
            defaultMessage:
              'Send incoming data to the right destinations based on what it has in common, say, routing logs by service name or severity. Build the rules yourself, or let Elastic suggest an AI-generated starting point based on your data.',
          })}{' '}
          <EuiLink external target="_blank">
            {i18n.translate('xpack.streams.createRoutingFlyout.routingDocs', {
              defaultMessage: 'Routing docs',
            })}
          </EuiLink>
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiButton iconType="sparkles" size="s" color="primary">
          {i18n.translate('xpack.streams.createRoutingFlyout.getSuggestions', {
            defaultMessage: 'Get suggestions based on your data',
          })}
        </EuiButton>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiText size="s" color="subdued" textAlign="center">
          {i18n.translate('xpack.streams.createRoutingFlyout.orManually', {
            defaultMessage: 'Or manually...',
          })}
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiButton
          size="s"
          color="text"
          onClick={onCreate}
          className={css`
            background-color: ${euiTheme.colors.backgroundBasePlain};
          `}
        >
          {i18n.translate('xpack.streams.createRoutingFlyout.createRouting', {
            defaultMessage: 'Create routing',
          })}
        </EuiButton>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}

function ConditionEditorRow({
  condition,
  onChange,
  onDelete,
}: {
  condition: ConditionRow;
  onChange: (patch: Partial<ConditionRow>) => void;
  onDelete: () => void;
}) {
  return (
    <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
      <EuiFlexItem grow={false}>
        <EuiButtonIcon
          iconType="grabOmnidirectional"
          color="text"
          size="xs"
          aria-label={i18n.translate('xpack.streams.createRoutingFlyout.reorderCondition', {
            defaultMessage: 'Reorder condition',
          })}
        />
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiSelect
          compressed
          options={FIELD_OPTIONS}
          value={condition.field}
          onChange={(event) => onChange({ field: event.target.value })}
          aria-label={i18n.translate('xpack.streams.createRoutingFlyout.conditionField', {
            defaultMessage: 'Condition field',
          })}
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiSelect
          compressed
          options={OPERATOR_OPTIONS}
          value={condition.operator}
          onChange={(event) => onChange({ operator: event.target.value })}
          aria-label={i18n.translate('xpack.streams.createRoutingFlyout.conditionOperator', {
            defaultMessage: 'Condition operator',
          })}
        />
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiFieldText
          compressed
          value={condition.value}
          onChange={(event) => onChange({ value: event.target.value })}
          aria-label={i18n.translate('xpack.streams.createRoutingFlyout.conditionValue', {
            defaultMessage: 'Condition value',
          })}
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiButtonIcon
          iconType="trash"
          color="danger"
          size="s"
          onClick={onDelete}
          aria-label={i18n.translate('xpack.streams.createRoutingFlyout.deleteCondition', {
            defaultMessage: 'Delete condition',
          })}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}

// State 2 — the routing condition form.
function RoutingConditionForm({
  conditions,
  setConditions,
  routingMode,
  setRoutingMode,
  destination,
  setDestination,
  onCancel,
  onCreate,
}: {
  conditions: ConditionRow[];
  setConditions: React.Dispatch<React.SetStateAction<ConditionRow[]>>;
  routingMode: string;
  setRoutingMode: (mode: string) => void;
  destination: string;
  setDestination: (destination: string) => void;
  onCancel: () => void;
  onCreate: () => void;
}) {
  const { euiTheme } = useEuiTheme();
  const radioGroupId = useGeneratedHtmlId({ prefix: 'routingMode' });

  const updateCondition = (id: string, patch: Partial<ConditionRow>) => {
    setConditions((current) =>
      current.map((condition) => (condition.id === id ? { ...condition, ...patch } : condition))
    );
  };

  const deleteCondition = (id: string) => {
    setConditions((current) => current.filter((condition) => condition.id !== id));
  };

  return (
    <EuiFlexGroup direction="column" gutterSize="m">
      <EuiFlexItem grow={false}>
        <EuiTitle size="xs">
          <h3>
            {i18n.translate('xpack.streams.createRoutingFlyout.createRoutingCondition', {
              defaultMessage: 'Create routing condition',
            })}
          </h3>
        </EuiTitle>
      </EuiFlexItem>

      <EuiFlexItem grow={false}>
        <EuiForm component="div">
          <EuiFormRow
            label={i18n.translate('xpack.streams.createRoutingFlyout.whatShouldHappen', {
              defaultMessage: 'What should happen to the data?',
            })}
          >
            <EuiRadioGroup
              compressed
              options={[
                {
                  id: 'route',
                  label: i18n.translate('xpack.streams.createRoutingFlyout.routeExclusively', {
                    defaultMessage: 'Route exclusively',
                  }),
                },
                {
                  id: 'duplicate',
                  label: i18n.translate('xpack.streams.createRoutingFlyout.duplicate', {
                    defaultMessage: 'Duplicate',
                  }),
                },
              ]}
              idSelected={routingMode}
              onChange={setRoutingMode}
              name={radioGroupId}
            />
          </EuiFormRow>
        </EuiForm>
      </EuiFlexItem>

      <EuiFlexItem grow={false}>
        <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiText
              size="xs"
              className={css`
                font-weight: ${euiTheme.font.weight.semiBold};
              `}
            >
              {i18n.translate('xpack.streams.createRoutingFlyout.matchCondition', {
                defaultMessage: 'Match condition',
              })}
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem />
          <EuiFlexItem grow={false}>
            <EuiLink>
              {i18n.translate('xpack.streams.createRoutingFlyout.useSyntaxEditor', {
                defaultMessage: 'Use syntax editor',
              })}
            </EuiLink>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer size="s" />
        <EuiFlexGroup direction="column" gutterSize="s">
          {conditions.map((condition, index) => (
            <React.Fragment key={condition.id}>
              {index > 0 ? (
                <EuiFlexItem grow={false}>
                  <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
                    <EuiFlexItem>
                      <EuiHorizontalRule margin="none" />
                    </EuiFlexItem>
                    <EuiFlexItem grow={false}>
                      <EuiBadge color="hollow">
                        {i18n.translate('xpack.streams.createRoutingFlyout.and', {
                          defaultMessage: 'AND',
                        })}
                      </EuiBadge>
                    </EuiFlexItem>
                    <EuiFlexItem>
                      <EuiHorizontalRule margin="none" />
                    </EuiFlexItem>
                  </EuiFlexGroup>
                </EuiFlexItem>
              ) : null}
              <EuiFlexItem grow={false}>
                <ConditionEditorRow
                  condition={condition}
                  onChange={(patch) => updateCondition(condition.id, patch)}
                  onDelete={() => deleteCondition(condition.id)}
                />
              </EuiFlexItem>
            </React.Fragment>
          ))}
        </EuiFlexGroup>
        <EuiSpacer size="s" />
        <EuiFlexGroup responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              iconType="plus"
              size="xs"
              flush="both"
              onClick={() => setConditions((current) => current.concat(makeCondition()))}
            >
              {i18n.translate('xpack.streams.createRoutingFlyout.addCondition', {
                defaultMessage: 'Add condition',
              })}
            </EuiButtonEmpty>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>

      <EuiFlexItem grow={false}>
        <EuiFormRow
          label={i18n.translate('xpack.streams.createRoutingFlyout.whereShouldDataGo', {
            defaultMessage: 'Where should matching data go?',
          })}
          fullWidth
        >
          <EuiSelect
            fullWidth
            options={DESTINATION_OPTIONS}
            value={destination}
            onChange={(event) => setDestination(event.target.value)}
          />
        </EuiFormRow>
      </EuiFlexItem>

      {destination === 'none' ? (
        <EuiFlexItem grow={false}>
          <EuiCallOut
            color="warning"
            size="s"
            iconType="warning"
            title={i18n.translate('xpack.streams.createRoutingFlyout.dropTitle', {
              defaultMessage: 'Matching data will be dropped (?)',
            })}
          >
            <p>
              {i18n.translate('xpack.streams.createRoutingFlyout.dropDescription', {
                defaultMessage:
                  "Events satisfying this condition won't be stored, forwarded, or indexed anywhere until you connect this routing to a destination.",
              })}
            </p>
          </EuiCallOut>
        </EuiFlexItem>
      ) : null}

      <EuiFlexItem grow={false}>
        <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiButtonIcon
              iconType="editorCodeBlock"
              color="primary"
              size="s"
              aria-label={i18n.translate('xpack.streams.createRoutingFlyout.viewCode', {
                defaultMessage: 'View code',
              })}
            />
          </EuiFlexItem>
          <EuiFlexItem />
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty size="s" color="text" onClick={onCancel}>
              {i18n.translate('xpack.streams.createRoutingFlyout.cancel', {
                defaultMessage: 'Cancel',
              })}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton size="s" fill onClick={onCreate}>
              {i18n.translate('xpack.streams.createRoutingFlyout.create', {
                defaultMessage: 'Create',
              })}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}

function ConditionValueBadge({ field, value }: { field: string; value: string }) {
  return (
    <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
      <EuiFlexItem grow={false}>
        <EuiBadge color="hollow">
          <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiToken iconType="tokenKeyword" size="xs" />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>{field}</EuiFlexItem>
          </EuiFlexGroup>
        </EuiBadge>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiText size="xs">
          {i18n.translate('xpack.streams.createRoutingFlyout.equals', {
            defaultMessage: 'equals',
          })}
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiBadge color="primary">{value}</EuiBadge>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}

// State 3 — the applied routing condition summary.
function AppliedRoutingPanel({
  conditions,
  onEdit,
}: {
  conditions: ConditionRow[];
  onEdit: () => void;
}) {
  const { euiTheme } = useEuiTheme();
  const [isWarningVisible, setIsWarningVisible] = useState(true);

  return (
    <EuiFlexGroup direction="column" gutterSize="m">
      <EuiFlexItem grow={false}>
        <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
          <EuiFlexItem />
          <EuiFlexItem grow={false}>
            <EuiButton size="s" color="text">
              {i18n.translate('xpack.streams.createRoutingFlyout.createRouting', {
                defaultMessage: 'Create routing',
              })}
            </EuiButton>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton iconType="sparkles" size="s" color="primary">
              {i18n.translate('xpack.streams.createRoutingFlyout.getRoutingSuggestions', {
                defaultMessage: 'Get routing suggestions',
              })}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>

      <EuiFlexItem grow={false}>
        <div
          className={css`
            border: ${euiTheme.border.thin};
            border-radius: ${euiTheme.border.radius.medium};
            background-color: ${euiTheme.colors.backgroundBaseSubdued};
            padding: ${euiTheme.size.m};
          `}
        >
          <EuiFlexGroup gutterSize="s" alignItems="flexStart" responsive={false}>
            <EuiFlexItem>
              {/* Condition */}
              <EuiText
                size="xs"
                color="subdued"
                className={css`
                  font-weight: ${euiTheme.font.weight.semiBold};
                `}
              >
                {i18n.translate('xpack.streams.createRoutingFlyout.conditionLabel', {
                  defaultMessage: 'Condition',
                })}
              </EuiText>
              <EuiSpacer size="xs" />
              <div
                className={css`
                  background-color: ${euiTheme.colors.backgroundBasePlain};
                  border-radius: ${euiTheme.border.radius.small};
                  padding: ${euiTheme.size.xs} ${euiTheme.size.s};
                `}
              >
                <EuiFlexGroup
                  gutterSize="s"
                  alignItems="center"
                  responsive={false}
                  wrap
                  className={css`
                    row-gap: ${euiTheme.size.xs};
                  `}
                >
                  {conditions.map((condition, index) => (
                    <React.Fragment key={condition.id}>
                      {index > 0 ? (
                        <EuiFlexItem grow={false}>
                          <EuiText
                            size="xs"
                            className={css`
                              font-weight: ${euiTheme.font.weight.bold};
                            `}
                          >
                            {i18n.translate('xpack.streams.createRoutingFlyout.and', {
                              defaultMessage: 'AND',
                            })}
                          </EuiText>
                        </EuiFlexItem>
                      ) : null}
                      <EuiFlexItem grow={false}>
                        <ConditionValueBadge field={condition.field} value={condition.value} />
                      </EuiFlexItem>
                    </React.Fragment>
                  ))}
                </EuiFlexGroup>
              </div>
              <EuiSpacer size="m" />
              {/* Destination */}
              <EuiText
                size="xs"
                color="subdued"
                className={css`
                  font-weight: ${euiTheme.font.weight.semiBold};
                `}
              >
                {i18n.translate('xpack.streams.createRoutingFlyout.destinationLabel', {
                  defaultMessage: 'Destination',
                })}
              </EuiText>
              <EuiSpacer size="xs" />
              <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
                <EuiFlexItem grow={false}>
                  <EuiText
                    size="xs"
                    className={css`
                      font-weight: ${euiTheme.font.weight.bold};
                      color: ${euiTheme.colors.textHeading};
                    `}
                  >
                    {i18n.translate('xpack.streams.createRoutingFlyout.routeExclusivelyTo', {
                      defaultMessage: 'ROUTE EXCLUSIVELY TO',
                    })}
                  </EuiText>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiButtonEmpty iconType="plusInCircle" size="xs" color="text" flush="both">
                    {i18n.translate('xpack.streams.createRoutingFlyout.chooseOrCreateDestination', {
                      defaultMessage: 'Choose or create destination',
                    })}
                  </EuiButtonEmpty>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButtonIcon
                iconType="pencil"
                color="primary"
                size="xs"
                onClick={onEdit}
                aria-label={i18n.translate('xpack.streams.createRoutingFlyout.editCondition', {
                  defaultMessage: 'Edit condition',
                })}
              />
            </EuiFlexItem>
          </EuiFlexGroup>

          {isWarningVisible ? (
            <>
              <EuiSpacer size="s" />
              <EuiCallOut
                color="warning"
                size="s"
                onDismiss={() => setIsWarningVisible(false)}
                title={i18n.translate('xpack.streams.createRoutingFlyout.appliedDropWarning', {
                  defaultMessage: 'Until you set a destination, matching data will be dropped',
                })}
              />
            </>
          ) : null}
        </div>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}

type RoutingStep = 'empty' | 'form' | 'applied';

export function CreateRoutingFlyout({
  onClose,
  onApply,
  initialStep = 'empty',
}: {
  onClose: () => void;
  onApply?: () => void;
  /**
   * Which step the flyout opens on. Defaults to 'empty' (create from scratch,
   * used by the connector "Add step" flow). Editing an existing routing node on
   * the canvas opens on 'applied' so the configured condition is shown with its
   * edit affordance.
   */
  initialStep?: RoutingStep;
}) {
  const { euiTheme } = useEuiTheme();
  const applyAndClose = onApply ?? onClose;
  const titleId = useGeneratedHtmlId({ prefix: 'createRoutingFlyoutTitle' });
  const [step, setStep] = useState<RoutingStep>(initialStep);
  const [routingMode, setRoutingMode] = useState('route');
  const [destination, setDestination] = useState('none');
  const [conditions, setConditions] = useState<ConditionRow[]>(() => [
    makeCondition('event.dataset', 'foo'),
    makeCondition('log.level', 'foo'),
  ]);

  return (
    <EuiFlyout
      size="l"
      onClose={onClose}
      aria-labelledby={titleId}
      data-test-subj="createRoutingFlyout"
    >
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="s">
          <h2 id={titleId}>
            {initialStep === 'applied'
              ? i18n.translate('xpack.streams.createRoutingFlyout.editTitle', {
                  defaultMessage: 'Routing conditions',
                })
              : i18n.translate('xpack.streams.createRoutingFlyout.title', {
                  defaultMessage: 'Create routing conditions',
                })}
          </h2>
        </EuiTitle>
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
          {/* Left panel */}
          <div
            className={css`
              width: 42%;
              flex-shrink: 0;
              border-right: ${euiTheme.border.thin};
              padding: ${step === 'empty' ? euiTheme.size.xl : euiTheme.size.base} ${euiTheme.size
                .l};
              overflow-y: auto;
              ${step === 'empty' ? 'display: flex; align-items: flex-start; justify-content: center;' : ''}
            `}
          >
            {step === 'empty' ? (
              <EmptyRoutingPanel onCreate={() => setStep('form')} />
            ) : step === 'form' ? (
              <RoutingConditionForm
                conditions={conditions}
                setConditions={setConditions}
                routingMode={routingMode}
                setRoutingMode={setRoutingMode}
                destination={destination}
                setDestination={setDestination}
                onCancel={() => setStep('empty')}
                onCreate={() => setStep('applied')}
              />
            ) : (
              <AppliedRoutingPanel conditions={conditions} onEdit={() => setStep('form')} />
            )}
          </div>

          {/* Right panel */}
          <DataPreviewPanel />
        </EuiFlexGroup>
      </EuiFlyoutBody>

      {step === 'applied' ? (
        <EuiFlyoutFooter>
          <EuiFlexGroup justifyContent="spaceBetween" alignItems="center" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty onClick={onClose} flush="left">
                {i18n.translate('xpack.streams.createRoutingFlyout.cancel', {
                  defaultMessage: 'Cancel',
                })}
              </EuiButtonEmpty>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButton fill onClick={applyAndClose}>
                {i18n.translate('xpack.streams.createRoutingFlyout.applyRoutingCondition', {
                  defaultMessage: 'Apply ({count}) routing condition',
                  values: { count: 1 },
                })}
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlyoutFooter>
      ) : null}
    </EuiFlyout>
  );
}
