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
  EuiCheckableCard,
  EuiFieldText,
  EuiFilterButton,
  EuiFilterGroup,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiFormRow,
  EuiHorizontalRule,
  EuiIcon,
  EuiLink,
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
import { FormattedMessage } from '@kbn/i18n-react';

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
    value: 'new',
    text: i18n.translate('xpack.streams.createRoutingFlyout.destinationNew', {
      defaultMessage: 'Send data to new destination',
    }),
  },
  {
    value: 'none',
    text: i18n.translate('xpack.streams.createRoutingFlyout.destinationNone', {
      defaultMessage: 'None set (connect later)',
    }),
  },
  { value: 'logs.otel', text: 'logs.otel' },
  { value: 'logs-app', text: 'logs-app' },
  { value: 'logs-errors', text: 'logs-errors' },
  { value: 'logs-archive', text: 'logs-archive' },
];

// Sample values offered for the condition's right-hand side in the inline
// "Create routing" card (this component ships with mock data).
const VALUE_OPTIONS = [
  { value: 'nginx', text: 'nginx' },
  { value: 'mysql', text: 'mysql' },
  { value: 'redis', text: 'redis' },
  { value: 'api', text: 'api' },
];

// Destinations the user can route into from the "Existing destination" option.
const EXISTING_DESTINATION_OPTIONS = [
  { value: 'logs-nginx-default', text: 'logs-nginx-default' },
  { value: 'logs.otel', text: 'logs.otel' },
  { value: 'logs-app', text: 'logs-app' },
  { value: 'logs-errors', text: 'logs-errors' },
  { value: 'logs-archive', text: 'logs-archive' },
];

const DEFAULT_EXISTING_DESTINATION = EXISTING_DESTINATION_OPTIONS[0].value;

// Where matching data should go, as chosen in the inline create card: create a
// brand-new destination, route into an existing one, or leave it unrouted.
type DestinationMode = 'new' | 'existing' | 'nowhere';

interface ConditionRow {
  id: string;
  field: string;
  operator: string;
  value: string;
  /**
   * Logical connector joining this condition to the previous one. Omitted on the
   * first condition. `OR` starts a new AND-group, so `[a, b(AND), c(OR)]` reads
   * as `( a AND b ) OR c`.
   */
  connector?: 'AND' | 'OR';
}

let conditionIdCounter = 0;
function makeCondition(
  field = 'event.dataset',
  value = 'foo',
  connector?: 'AND' | 'OR'
): ConditionRow {
  conditionIdCounter += 1;
  return {
    id: `condition-${conditionIdCounter}`,
    field,
    operator: 'equals',
    value,
    ...(connector ? { connector } : {}),
  };
}

// A single row in the "Routing rules" list (the edge connector's "Add step"
// entry point). A route with no conditions is a catch-all — it always exists
// by default so data passes straight through until narrowed.
interface RouteEntry {
  id: string;
  name: string;
  conditions: ConditionRow[];
  destination: string;
  newDestinationName: string;
  newDestinationStorage: 'local' | 'external';
}

let routeIdCounter = 0;
function makeRoute(overrides: Partial<RouteEntry> = {}): RouteEntry {
  routeIdCounter += 1;
  return {
    id: `route-${routeIdCounter}`,
    name: `Route-${routeIdCounter}`,
    conditions: [],
    destination: 'logs.otel',
    newDestinationName: '',
    newDestinationStorage: 'local',
    ...overrides,
  };
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
          padding-left: ${euiTheme.size.base};
          padding-right: ${euiTheme.size.base};
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
//
// The `opinionated` variant is the "routing with inheritance" flow reached from
// a destination node's context menu: it adds an illustration, a description
// mentioning the inherited destination schema, and a split "Get suggestions"
// button, matching the opinionated-routing design.
function EmptyRoutingPanel({
  onCreate,
  opinionated = false,
}: {
  onCreate: () => void;
  opinionated?: boolean;
}) {
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
      {opinionated ? (
        <EuiFlexItem grow={false}>
          <div
            className={css`
              width: 96px;
              height: 96px;
              display: flex;
              align-items: center;
              justify-content: center;
              border: ${euiTheme.border.thin};
              border-radius: ${euiTheme.border.radius.medium};
              background-color: ${euiTheme.colors.backgroundBaseSubdued};
            `}
          >
            <EuiIcon type="branch" size="xxl" color="primary" />
          </div>
        </EuiFlexItem>
      ) : null}
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
          {opinionated
            ? i18n.translate('xpack.streams.createRoutingFlyout.emptyDescriptionInheritance', {
                defaultMessage:
                  'Create routing conditions inheriting the selected destination schema. Build the rules yourself, or let Elastic suggest an AI-generated starting point based on your data.',
              })
            : i18n.translate('xpack.streams.createRoutingFlyout.emptyDescription', {
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
        {opinionated ? (
          <EuiFlexGroup gutterSize="none" alignItems="center" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiButton
                iconType="sparkles"
                size="s"
                color="primary"
                fill
                className={css`
                  border-top-right-radius: 0;
                  border-bottom-right-radius: 0;
                `}
              >
                {i18n.translate('xpack.streams.createRoutingFlyout.getSuggestions', {
                  defaultMessage: 'Get suggestions based on your data',
                })}
              </EuiButton>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButton
                size="s"
                color="primary"
                fill
                minWidth={0}
                iconType="arrowDown"
                className={css`
                  border-top-left-radius: 0;
                  border-bottom-left-radius: 0;
                  border-left: ${euiTheme.border.width.thin} solid
                    ${euiTheme.colors.emptyShade};
                `}
                aria-label={i18n.translate('xpack.streams.createRoutingFlyout.moreSuggestions', {
                  defaultMessage: 'More suggestion options',
                })}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        ) : (
          <EuiButton iconType="sparkles" size="s" color="primary">
            {i18n.translate('xpack.streams.createRoutingFlyout.getSuggestions', {
              defaultMessage: 'Get suggestions based on your data',
            })}
          </EuiButton>
        )}
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
  destination,
  setDestination,
  newDestinationName,
  setNewDestinationName,
  newDestinationStorage,
  setNewDestinationStorage,
  inheritedDestinationName,
  onCancel,
  onCreate,
}: {
  conditions: ConditionRow[];
  setConditions: React.Dispatch<React.SetStateAction<ConditionRow[]>>;
  destination: string;
  setDestination: (destination: string) => void;
  newDestinationName: string;
  setNewDestinationName: (name: string) => void;
  newDestinationStorage: 'local' | 'external';
  setNewDestinationStorage: (storage: 'local' | 'external') => void;
  // The destination the opinionated routing flow was triggered from. When set,
  // it's shown as a non-editable prefix on the new destination's name so the
  // inherited namespace is clear.
  inheritedDestinationName?: string;
  onCancel: () => void;
  onCreate: () => void;
}) {
  const { euiTheme } = useEuiTheme();

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

      {destination === 'new' ? (
        <EuiFlexItem grow={false}>
          <div
            className={css`
              background-color: ${euiTheme.colors.backgroundBaseSubdued};
              border-radius: ${euiTheme.border.radius.small};
              padding: ${euiTheme.size.base};
              display: flex;
              flex-direction: column;
              gap: ${euiTheme.size.s};
            `}
          >
            <EuiFilterGroup fullWidth compressed>
              <EuiFilterButton
                grow
                withNext
                hasActiveFilters={newDestinationStorage === 'local'}
                onClick={() => setNewDestinationStorage('local')}
              >
                {i18n.translate('xpack.streams.createRoutingFlyout.localElasticsearch', {
                  defaultMessage: 'Local Elasticsearch',
                })}
              </EuiFilterButton>
              <EuiFilterButton
                grow
                hasActiveFilters={newDestinationStorage === 'external'}
                onClick={() => setNewDestinationStorage('external')}
              >
                {i18n.translate('xpack.streams.createRoutingFlyout.externalStorage', {
                  defaultMessage: 'External storage',
                })}
              </EuiFilterButton>
            </EuiFilterGroup>
            <EuiFormRow
              fullWidth
              helpText={i18n.translate('xpack.streams.createRoutingFlyout.newDestinationHelp', {
                defaultMessage:
                  "Name your destination or leave to be renamed automatically when connected to a source. This can't be changed after that.",
              })}
            >
              <EuiFieldText
                fullWidth
                value={newDestinationName}
                onChange={(event) => setNewDestinationName(event.target.value)}
                prepend={inheritedDestinationName ? `${inheritedDestinationName}.` : undefined}
                placeholder={i18n.translate('xpack.streams.createRoutingFlyout.newDestinationName', {
                  defaultMessage: 'Name',
                })}
                aria-label={i18n.translate('xpack.streams.createRoutingFlyout.newDestinationName', {
                  defaultMessage: 'Name',
                })}
              />
            </EuiFormRow>
          </div>
        </EuiFlexItem>
      ) : null}

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

// A single leaf of a condition expression: `[token] field equals value`, with
// the value rendered as a light pill (matching the routing summary design).
function ConditionLeaf({ field, value }: { field: string; value: string }) {
  const { euiTheme } = useEuiTheme();
  return (
    <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
      <EuiFlexItem grow={false}>
        <EuiToken iconType="tokenKeyword" size="xs" />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiText
          size="xs"
          className={css`
            font-family: ${euiTheme.font.familyCode};
          `}
        >
          {field}
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiText size="xs" color="subdued">
          {i18n.translate('xpack.streams.createRoutingFlyout.equals', {
            defaultMessage: 'equals',
          })}
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <span
          className={css`
            background-color: ${euiTheme.colors.backgroundBasePrimary};
            color: ${euiTheme.colors.textPrimary};
            border-radius: ${euiTheme.border.radius.small};
            padding: 0 ${euiTheme.size.xs};
            font-family: ${euiTheme.font.familyCode};
            font-size: ${euiTheme.size.m};
          `}
        >
          {value}
        </span>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}

// A bold structural token in a condition expression: WHERE, (, ), AND, OR.
function ExpressionToken({ children }: { children: React.ReactNode }) {
  const { euiTheme } = useEuiTheme();
  return (
    <EuiText
      size="xs"
      className={css`
        font-weight: ${euiTheme.font.weight.bold};
      `}
    >
      {children}
    </EuiText>
  );
}

// Renders a route's conditions as a boolean expression, e.g.
// `WHERE ( event.dataset equals foo AND log.level equals info ) OR event.dataset
// equals Adonis-dotnet-625`. Consecutive AND-connected conditions form a group
// (wrapped in parentheses when it holds more than one), and OR separates groups.
function ConditionExpression({ conditions }: { conditions: ConditionRow[] }) {
  const { euiTheme } = useEuiTheme();
  const groups: ConditionRow[][] = [];
  conditions.forEach((condition, index) => {
    if (index === 0 || condition.connector === 'OR') {
      groups.push([condition]);
    } else {
      groups[groups.length - 1].push(condition);
    }
  });

  return (
    <div
      className={css`
        background-color: ${euiTheme.colors.backgroundBaseSubdued};
        border-radius: ${euiTheme.border.radius.small};
        padding: ${euiTheme.size.s};
      `}
    >
      <EuiFlexGroup
        gutterSize="xs"
        alignItems="center"
        responsive={false}
        wrap
        className={css`
          row-gap: ${euiTheme.size.xs};
        `}
      >
        <EuiFlexItem grow={false}>
          <ExpressionToken>
            {i18n.translate('xpack.streams.createRoutingFlyout.where', {
              defaultMessage: 'WHERE',
            })}
          </ExpressionToken>
        </EuiFlexItem>
        {groups.map((group, groupIndex) => {
          const wrap = group.length > 1;
          return (
            <React.Fragment key={group[0].id}>
              {groupIndex > 0 ? (
                <EuiFlexItem grow={false}>
                  <ExpressionToken>
                    {i18n.translate('xpack.streams.createRoutingFlyout.or', {
                      defaultMessage: 'OR',
                    })}
                  </ExpressionToken>
                </EuiFlexItem>
              ) : null}
              {wrap ? (
                <EuiFlexItem grow={false}>
                  <ExpressionToken>(</ExpressionToken>
                </EuiFlexItem>
              ) : null}
              {group.map((condition, conditionIndex) => (
                <React.Fragment key={condition.id}>
                  {conditionIndex > 0 ? (
                    <EuiFlexItem grow={false}>
                      <ExpressionToken>
                        {i18n.translate('xpack.streams.createRoutingFlyout.and', {
                          defaultMessage: 'AND',
                        })}
                      </ExpressionToken>
                    </EuiFlexItem>
                  ) : null}
                  <EuiFlexItem grow={false}>
                    <ConditionLeaf field={condition.field} value={condition.value} />
                  </EuiFlexItem>
                </React.Fragment>
              ))}
              {wrap ? (
                <EuiFlexItem grow={false}>
                  <ExpressionToken>)</ExpressionToken>
                </EuiFlexItem>
              ) : null}
            </React.Fragment>
          );
        })}
      </EuiFlexGroup>
    </div>
  );
}

// A single route's collapsed summary within the "Routing rules" list: a drag
// handle, its name and destination line, edit/delete affordances, and then
// either its condition expression or — for catch-all routes — the reminder that
// they absorb everything not matched by a route above them.
function RouteSummaryCard({
  route,
  onEdit,
  onDelete,
}: {
  route: RouteEntry;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { euiTheme } = useEuiTheme();
  const hasNoCondition = route.conditions.length === 0;
  const isNewDestination = route.destination === 'new';
  const destinationLabel = isNewDestination
    ? route.newDestinationName.trim() ||
      i18n.translate('xpack.streams.createRoutingFlyout.newDestinationDefaultName', {
        defaultMessage: 'Destination name',
      })
    : DESTINATION_OPTIONS.find((option) => option.value === route.destination)?.text ??
      route.destination;

  return (
    <div
      className={css`
        border: ${euiTheme.border.thin};
        border-radius: ${euiTheme.border.radius.medium};
        padding: ${euiTheme.size.base};
        background-color: ${euiTheme.colors.backgroundBasePlain};
      `}
    >
      <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiIcon type="grab" color="subdued" />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFlexGroup
            gutterSize="xs"
            alignItems="center"
            responsive={false}
            wrap
            className={css`
              row-gap: ${euiTheme.size.xs};
            `}
          >
            <EuiFlexItem grow={false}>
              <EuiText
                size="s"
                className={css`
                  font-weight: ${euiTheme.font.weight.semiBold};
                `}
              >
                {route.name}
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiText size="s" color="subdued">
                <FormattedMessage
                  id="xpack.streams.createRoutingFlyout.dataGoesExclusivelyTo"
                  defaultMessage="Data goes exclusively to {destination}"
                  values={{ destination: <EuiLink>{destinationLabel}</EuiLink> }}
                />
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonIcon
            iconType="pencil"
            color="primary"
            size="xs"
            onClick={onEdit}
            aria-label={i18n.translate('xpack.streams.createRoutingFlyout.editRoute', {
              defaultMessage: 'Edit route',
            })}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonIcon
            iconType="trash"
            color="danger"
            size="xs"
            onClick={onDelete}
            aria-label={i18n.translate('xpack.streams.createRoutingFlyout.deleteRoute', {
              defaultMessage: 'Delete route',
            })}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="s" />
      {hasNoCondition ? (
        <EuiCallOut
          size="s"
          color="primary"
          iconType="info"
          title={i18n.translate('xpack.streams.createRoutingFlyout.catchAllNotice', {
            defaultMessage: 'A route with no condition catches everything left over.',
          })}
        />
      ) : (
        <ConditionExpression conditions={route.conditions} />
      )}
    </div>
  );
}

export interface CreateRoutingResult {
  routingId: string;
  conditions: ConditionRow[];
  destinationMode: DestinationMode;
  existingDestination: string;
  newDestinationName: string;
  newDestinationStorage: 'local' | 'external';
}

interface CreateRoutingCardInitial {
  routingId: string;
  conditions: ConditionRow[];
  destinationMode: DestinationMode;
  existingDestination: string;
  newDestinationName: string;
  newDestinationStorage: 'local' | 'external';
}

// The inline "Create routing" card shown in the list flow when adding or editing
// a route. It carries its own draft state and reports the result on submit, so
// the surrounding list stays visible while a route is being configured.
function CreateRoutingCard({
  title,
  submitLabel,
  initial,
  onCancel,
  onSubmit,
}: {
  title: string;
  submitLabel: string;
  initial: CreateRoutingCardInitial;
  onCancel: () => void;
  onSubmit: (result: CreateRoutingResult) => void;
}) {
  const { euiTheme } = useEuiTheme();
  const radioGroupId = useGeneratedHtmlId({ prefix: 'createRoutingDestination' });
  const [routingId, setRoutingId] = useState(initial.routingId);
  const [conditions, setConditions] = useState<ConditionRow[]>(initial.conditions);
  const [destinationMode, setDestinationMode] = useState<DestinationMode>(initial.destinationMode);
  const [existingDestination, setExistingDestination] = useState(initial.existingDestination);
  const [newDestinationName, setNewDestinationName] = useState(initial.newDestinationName);
  const [newDestinationStorage, setNewDestinationStorage] = useState<'local' | 'external'>(
    initial.newDestinationStorage
  );

  const updateCondition = (id: string, patch: Partial<ConditionRow>) => {
    setConditions((current) =>
      current.map((condition) => (condition.id === id ? { ...condition, ...patch } : condition))
    );
  };

  const destinationOptions: Array<{
    mode: DestinationMode;
    title: string;
    description: string;
  }> = [
    {
      mode: 'new',
      title: i18n.translate('xpack.streams.createRoutingFlyout.newDestinationOption', {
        defaultMessage: 'New destination',
      }),
      description: i18n.translate('xpack.streams.createRoutingFlyout.newDestinationOptionHelp', {
        defaultMessage: 'Create a local or external target for this data.',
      }),
    },
    {
      mode: 'existing',
      title: i18n.translate('xpack.streams.createRoutingFlyout.existingDestinationOption', {
        defaultMessage: 'Existing destination',
      }),
      description: i18n.translate(
        'xpack.streams.createRoutingFlyout.existingDestinationOptionHelp',
        {
          defaultMessage: 'Route this data into a destination you already have.',
        }
      ),
    },
    {
      mode: 'nowhere',
      title: i18n.translate('xpack.streams.createRoutingFlyout.nowhereDestinationOption', {
        defaultMessage: 'Nowhere, for now',
      }),
      description: i18n.translate(
        'xpack.streams.createRoutingFlyout.nowhereDestinationOptionHelp',
        {
          defaultMessage:
            'Save the condition without routing. Matching data stays in this stream until you pick a destination.',
        }
      ),
    },
  ];

  return (
    <div
      className={css`
        border: ${euiTheme.border.thin};
        border-radius: ${euiTheme.border.radius.medium};
        padding: ${euiTheme.size.base};
        background-color: ${euiTheme.colors.backgroundBasePlain};
      `}
    >
      <EuiTitle size="xxs">
        <h3>{title}</h3>
      </EuiTitle>

      <EuiSpacer size="m" />

      <EuiFormRow
        label={i18n.translate('xpack.streams.createRoutingFlyout.routingId', {
          defaultMessage: 'Routing ID',
        })}
        fullWidth
      >
        <EuiFieldText
          fullWidth
          value={routingId}
          onChange={(event) => setRoutingId(event.target.value)}
          placeholder={i18n.translate('xpack.streams.createRoutingFlyout.routingIdPlaceholder', {
            defaultMessage: 'Name',
          })}
          aria-label={i18n.translate('xpack.streams.createRoutingFlyout.routingId', {
            defaultMessage: 'Routing ID',
          })}
        />
      </EuiFormRow>

      <EuiSpacer size="m" />

      <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiText
            size="xs"
            className={css`
              font-weight: ${euiTheme.font.weight.semiBold};
            `}
          >
            {i18n.translate('xpack.streams.createRoutingFlyout.conditionToMatch', {
              defaultMessage: 'Condition to match',
            })}
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem />
        <EuiFlexItem grow={false}>
          <EuiLink>
            {i18n.translate('xpack.streams.createRoutingFlyout.syntaxEditor', {
              defaultMessage: 'Syntax editor',
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
              <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
                <EuiFlexItem>
                  <EuiSelect
                    options={FIELD_OPTIONS}
                    value={condition.field}
                    onChange={(event) => updateCondition(condition.id, { field: event.target.value })}
                    aria-label={i18n.translate('xpack.streams.createRoutingFlyout.conditionField', {
                      defaultMessage: 'Condition field',
                    })}
                  />
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiSelect
                    options={OPERATOR_OPTIONS}
                    value={condition.operator}
                    onChange={(event) =>
                      updateCondition(condition.id, { operator: event.target.value })
                    }
                    aria-label={i18n.translate(
                      'xpack.streams.createRoutingFlyout.conditionOperator',
                      {
                        defaultMessage: 'Condition operator',
                      }
                    )}
                  />
                </EuiFlexItem>
                <EuiFlexItem>
                  <EuiSelect
                    options={VALUE_OPTIONS}
                    value={condition.value}
                    hasNoInitialSelection={
                      !VALUE_OPTIONS.some((option) => option.value === condition.value)
                    }
                    onChange={(event) => updateCondition(condition.id, { value: event.target.value })}
                    aria-label={i18n.translate('xpack.streams.createRoutingFlyout.conditionValue', {
                      defaultMessage: 'Condition value',
                    })}
                  />
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
          </React.Fragment>
        ))}
      </EuiFlexGroup>

      <EuiSpacer size="m" />

      <EuiText
        size="xs"
        className={css`
          font-weight: ${euiTheme.font.weight.semiBold};
        `}
      >
        {i18n.translate('xpack.streams.createRoutingFlyout.whereShouldDataGo', {
          defaultMessage: 'Where should matching data go?',
        })}
      </EuiText>

      <EuiSpacer size="s" />

      <EuiFlexGroup direction="column" gutterSize="s">
        {destinationOptions.map((option) => (
          <EuiFlexItem grow={false} key={option.mode}>
            <EuiCheckableCard
              id={`${radioGroupId}-${option.mode}`}
              name={radioGroupId}
              value={option.mode}
              checked={destinationMode === option.mode}
              onChange={() => setDestinationMode(option.mode)}
              label={
                <>
                  <EuiText
                    size="s"
                    className={css`
                      font-weight: ${euiTheme.font.weight.semiBold};
                    `}
                  >
                    {option.title}
                  </EuiText>
                  <EuiText size="xs" color="subdued">
                    {option.description}
                  </EuiText>
                </>
              }
            >
              {option.mode === 'existing' && destinationMode === 'existing' ? (
                <EuiSelect
                  fullWidth
                  options={EXISTING_DESTINATION_OPTIONS}
                  value={existingDestination}
                  onChange={(event) => setExistingDestination(event.target.value)}
                  aria-label={i18n.translate(
                    'xpack.streams.createRoutingFlyout.existingDestinationSelect',
                    {
                      defaultMessage: 'Existing destination',
                    }
                  )}
                />
              ) : option.mode === 'new' && destinationMode === 'new' ? (
                <EuiFlexGroup direction="column" gutterSize="s">
                  <EuiFlexItem grow={false}>
                    <EuiFilterGroup fullWidth compressed>
                      <EuiFilterButton
                        grow
                        withNext
                        hasActiveFilters={newDestinationStorage === 'local'}
                        onClick={() => setNewDestinationStorage('local')}
                      >
                        {i18n.translate('xpack.streams.createRoutingFlyout.localElasticsearch', {
                          defaultMessage: 'Local Elasticsearch',
                        })}
                      </EuiFilterButton>
                      <EuiFilterButton
                        grow
                        hasActiveFilters={newDestinationStorage === 'external'}
                        onClick={() => setNewDestinationStorage('external')}
                      >
                        {i18n.translate('xpack.streams.createRoutingFlyout.externalStorage', {
                          defaultMessage: 'External storage',
                        })}
                      </EuiFilterButton>
                    </EuiFilterGroup>
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiFieldText
                      fullWidth
                      value={newDestinationName}
                      onChange={(event) => setNewDestinationName(event.target.value)}
                      placeholder={i18n.translate(
                        'xpack.streams.createRoutingFlyout.newDestinationName',
                        {
                          defaultMessage: 'Name',
                        }
                      )}
                      aria-label={i18n.translate(
                        'xpack.streams.createRoutingFlyout.newDestinationName',
                        {
                          defaultMessage: 'Name',
                        }
                      )}
                    />
                  </EuiFlexItem>
                </EuiFlexGroup>
              ) : null}
            </EuiCheckableCard>
          </EuiFlexItem>
        ))}
      </EuiFlexGroup>

      <EuiSpacer size="m" />
      <EuiHorizontalRule margin="none" />
      <EuiSpacer size="m" />

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
          <EuiButtonEmpty size="s" color="primary" onClick={onCancel}>
            {i18n.translate('xpack.streams.createRoutingFlyout.cancel', {
              defaultMessage: 'Cancel',
            })}
          </EuiButtonEmpty>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButton
            size="s"
            fill
            onClick={() =>
              onSubmit({
                routingId,
                conditions,
                destinationMode,
                existingDestination,
                newDestinationName,
                newDestinationStorage,
              })
            }
          >
            {submitLabel}
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    </div>
  );
}

// State 1 (list flow) — the "Routing rules" list, reached from the plain
// "Add step" entry point on an edge connector. A catch-all route (no
// condition, so all data passes straight through) always exists by default;
// "New routing" adds further, more specific routes above it. While a route is
// being created or edited, its inline "Create routing" card is shown in place.
function RoutingRulesListPanel({
  routes,
  onEditRoute,
  onDeleteRoute,
  onNewRoute,
  isFormOpen,
  editingRouteId,
  createCard,
  editCard,
}: {
  routes: RouteEntry[];
  onEditRoute: (routeId: string) => void;
  onDeleteRoute: (routeId: string) => void;
  onNewRoute: () => void;
  isFormOpen: boolean;
  editingRouteId: string | null;
  createCard: React.ReactNode;
  editCard: React.ReactNode;
}) {
  const { euiTheme } = useEuiTheme();
  return (
    <EuiFlexGroup direction="column" gutterSize="m">
      <EuiFlexItem grow={false}>
        <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiText
              size="s"
              className={css`
                font-weight: ${euiTheme.font.weight.semiBold};
              `}
            >
              {i18n.translate('xpack.streams.createRoutingFlyout.routingRules', {
                defaultMessage: 'Routing rules',
              })}
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem />
          <EuiFlexItem grow={false}>
            <EuiButton
              size="s"
              iconType="sparkles"
              className={css`
                background-color: ${euiTheme.colors.backgroundBasePrimary};
                color: ${euiTheme.colors.primary};
                border: none;
                box-shadow: none;
              `}
            >
              {i18n.translate('xpack.streams.createRoutingFlyout.getSuggestionsShort', {
                defaultMessage: 'Get suggestions',
              })}
            </EuiButton>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              size="s"
              color="text"
              onClick={onNewRoute}
              isDisabled={isFormOpen}
              className={css`
                background-color: ${euiTheme.colors.backgroundBasePlain};
              `}
            >
              {i18n.translate('xpack.streams.createRoutingFlyout.newRouting', {
                defaultMessage: 'New routing',
              })}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiFlexGroup direction="column" gutterSize="s">
          {createCard ? <EuiFlexItem grow={false}>{createCard}</EuiFlexItem> : null}
          {routes.map((route) => (
            <EuiFlexItem grow={false} key={route.id}>
              {editingRouteId === route.id ? (
                editCard
              ) : (
                <RouteSummaryCard
                  route={route}
                  onEdit={() => onEditRoute(route.id)}
                  onDelete={() => onDeleteRoute(route.id)}
                />
              )}
            </EuiFlexItem>
          ))}
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}

// State 3 — the applied routing condition summary.
function AppliedRoutingPanel({
  conditions,
  destination,
  newDestinationName,
  onEdit,
}: {
  conditions: ConditionRow[];
  destination: string;
  newDestinationName: string;
  onEdit: () => void;
}) {
  const { euiTheme } = useEuiTheme();
  const [isWarningVisible, setIsWarningVisible] = useState(true);
  // When the user chose "Send data to new destination", the summary shows the
  // named destination instead of the "choose a destination" affordance, and the
  // "data will be dropped" warning no longer applies.
  const isNewDestination = destination === 'new';

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
              {isNewDestination ? (
                <EuiText
                  size="s"
                  className={css`
                    font-weight: ${euiTheme.font.weight.semiBold};
                    color: ${euiTheme.colors.textHeading};
                  `}
                >
                  {newDestinationName.trim() ||
                    i18n.translate('xpack.streams.createRoutingFlyout.newDestinationDefaultName', {
                      defaultMessage: 'Destination name',
                    })}
                </EuiText>
              ) : (
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
                      {i18n.translate(
                        'xpack.streams.createRoutingFlyout.chooseOrCreateDestination',
                        {
                          defaultMessage: 'Choose or create destination',
                        }
                      )}
                    </EuiButtonEmpty>
                  </EuiFlexItem>
                </EuiFlexGroup>
              )}
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

          {!isNewDestination && isWarningVisible ? (
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

type RoutingStep = 'empty' | 'list' | 'form' | 'applied';

export interface RoutingApplyResult {
  /** True when the user chose "Send data to new destination". */
  createNewDestination: boolean;
  /** Name entered for the new destination (may be empty → auto-named). */
  newDestinationName: string;
  /** Storage target selected for the new destination. */
  newDestinationStorage: 'local' | 'external';
}

export function CreateRoutingFlyout({
  onClose,
  onApply,
  initialStep = 'empty',
  opinionated = false,
  inheritedDestinationName,
}: {
  onClose: () => void;
  onApply?: (result: RoutingApplyResult) => void;
  /**
   * Which step the flyout opens on. Defaults to 'empty' (create from scratch,
   * used by the connector "Add step" flow). Editing an existing routing node on
   * the canvas opens on 'applied' so the configured condition is shown with its
   * edit affordance.
   */
  initialStep?: RoutingStep;
  /**
   * "Opinionated routing" variant, opened from a destination node's "Add routing
   * with inheritance" context-menu action. Shows an illustration, an
   * inheritance-focused header/description, and a split suggestions button.
   */
  opinionated?: boolean;
  /**
   * The destination the opinionated routing flow was triggered from. Shown as a
   * non-editable prefix on the new destination's name field so it's clear the
   * new destination inherits that destination's namespace/schema.
   */
  inheritedDestinationName?: string;
}) {
  const { euiTheme } = useEuiTheme();
  const titleId = useGeneratedHtmlId({ prefix: 'createRoutingFlyoutTitle' });
  // The "Routing rules" list view is reached only from the plain "Add step"
  // entry point on an edge connector. Editing an existing routing node and the
  // opinionated "inheritance" flow (from a destination's context menu) keep
  // the original single-route empty/form/applied flow untouched.
  const isRoutingListFlow = initialStep === 'empty' && !opinionated;
  const [step, setStep] = useState<RoutingStep>(isRoutingListFlow ? 'list' : initialStep);
  // The list flow opens with one already-created multi-condition route (Nginx)
  // above the default catch-all route. A route with no condition always exists —
  // it passes all data straight through until a more specific route is added
  // above it.
  const [routes, setRoutes] = useState<RouteEntry[]>(() =>
    isRoutingListFlow
      ? [
          makeRoute({
            name: 'Nginx',
            destination: 'logs-nginx-default',
            conditions: [
              makeCondition('event.dataset', 'foo'),
              makeCondition('log.level', 'info', 'AND'),
              makeCondition('event.dataset', 'Adonis-dotnet-625', 'OR'),
            ],
          }),
          makeRoute({ name: 'Route-1' }),
        ]
      : []
  );
  // Which route the form step is currently editing; null while creating a new
  // one via "New routing".
  const [editingRouteId, setEditingRouteId] = useState<string | null>(null);
  // The opinionated ("routing with inheritance") flow creates a new destination
  // by default; the standard flow starts with no destination set.
  const [destination, setDestination] = useState(opinionated ? 'new' : 'none');
  // Config for the "Send data to new destination" option. Held here (rather than
  // inside the form step) so it survives into the applied summary.
  const [newDestinationName, setNewDestinationName] = useState('');
  const [newDestinationStorage, setNewDestinationStorage] = useState<'local' | 'external'>('local');
  const [conditions, setConditions] = useState<ConditionRow[]>(() => [
    makeCondition('event.dataset', 'foo'),
    makeCondition('log.level', 'foo'),
  ]);

  // The name typed in the field is only the suffix; the inherited destination is
  // a non-editable prefix. Compose the full destination name (prefix.suffix) for
  // both the applied summary and the created node. Left empty when nothing is
  // typed so downstream defaulting (DEFAULT_DESTINATION_TITLE) still applies.
  const composedDestinationName = (() => {
    const trimmed = newDestinationName.trim();
    if (!trimmed) {
      return trimmed;
    }
    return inheritedDestinationName ? `${inheritedDestinationName}.${trimmed}` : trimmed;
  })();

  // Opens the inline "Create routing" card for a brand-new route.
  const startNewRoute = () => {
    setEditingRouteId(null);
    setStep('form');
  };

  // Opens the inline card in place of an existing route's summary card.
  const startEditRoute = (routeId: string) => {
    setEditingRouteId(routeId);
    setStep('form');
  };

  // Removes a route from the list (its trash affordance).
  const deleteRoute = (routeId: string) => {
    setRoutes((current) => current.filter((route) => route.id !== routeId));
    if (editingRouteId === routeId) {
      setEditingRouteId(null);
      setStep('list');
    }
  };

  // Closes the inline card without saving, returning to the plain list.
  const cancelInlineRoute = () => {
    setEditingRouteId(null);
    setStep('list');
  };

  // Writes the inline card's result back into the routes list — updating the
  // route being edited, or appending a new one — and returns to the list view.
  const submitInlineRoute = (result: CreateRoutingResult) => {
    const destination =
      result.destinationMode === 'new'
        ? 'new'
        : result.destinationMode === 'existing'
        ? result.existingDestination
        : 'none';
    setRoutes((current) => {
      const fields = {
        name:
          result.routingId.trim() ||
          i18n.translate('xpack.streams.createRoutingFlyout.routeDefaultName', {
            defaultMessage: 'Route-{index}',
            values: { index: current.length + 1 },
          }),
        conditions: result.conditions,
        destination,
        newDestinationName: result.newDestinationName,
        newDestinationStorage: result.newDestinationStorage,
      };
      return editingRouteId
        ? current.map((route) => (route.id === editingRouteId ? { ...route, ...fields } : route))
        : current.concat(makeRoute(fields));
    });
    setEditingRouteId(null);
    setStep('list');
  };

  // Builds the inline card's initial draft state — a fresh route defaults to a
  // single service.name condition routed into an existing destination; editing
  // an existing route reflects its current condition and destination.
  const buildCardInitial = (): CreateRoutingCardInitial => {
    const editingRoute = editingRouteId
      ? routes.find((candidate) => candidate.id === editingRouteId)
      : undefined;
    if (!editingRoute) {
      return {
        routingId: '',
        conditions: [makeCondition('service.name', 'nginx')],
        destinationMode: 'existing',
        existingDestination: DEFAULT_EXISTING_DESTINATION,
        newDestinationName: '',
        newDestinationStorage: 'local',
      };
    }
    const destinationMode: DestinationMode =
      editingRoute.destination === 'new'
        ? 'new'
        : editingRoute.destination === 'none'
        ? 'nowhere'
        : 'existing';
    return {
      routingId: editingRoute.name,
      conditions: editingRoute.conditions.length
        ? editingRoute.conditions
        : [makeCondition('service.name', 'nginx')],
      destinationMode,
      existingDestination:
        destinationMode === 'existing' ? editingRoute.destination : DEFAULT_EXISTING_DESTINATION,
      newDestinationName: editingRoute.newDestinationName,
      newDestinationStorage: editingRoute.newDestinationStorage,
    };
  };

  const inlineCard =
    isRoutingListFlow && step === 'form' ? (
      <CreateRoutingCard
        key={editingRouteId ?? 'new'}
        title={
          editingRouteId
            ? i18n.translate('xpack.streams.createRoutingFlyout.editRouting', {
                defaultMessage: 'Edit routing',
              })
            : i18n.translate('xpack.streams.createRoutingFlyout.createRoutingCardTitle', {
                defaultMessage: 'Create routing',
              })
        }
        submitLabel={
          editingRouteId
            ? i18n.translate('xpack.streams.createRoutingFlyout.save', {
                defaultMessage: 'Save',
              })
            : i18n.translate('xpack.streams.createRoutingFlyout.create', {
                defaultMessage: 'Create',
              })
        }
        initial={buildCardInitial()}
        onCancel={cancelInlineRoute}
        onSubmit={submitInlineRoute}
      />
    ) : null;

  // Commits the routing rules from the list flow's footer "Route your data"
  // button.
  const handleRouteYourData = () => {
    if (onApply) {
      onApply({
        createNewDestination: false,
        newDestinationName: '',
        newDestinationStorage: 'local',
      });
      return;
    }
    onClose();
  };

  // Dismissing the flyout (✕, Esc, click-outside) discards changes — the list
  // flow commits only through the explicit "Route your data" footer button.
  const handleFlyoutClose = () => {
    onClose();
  };

  return (
    <EuiFlyout
      size="l"
      onClose={handleFlyoutClose}
      aria-labelledby={titleId}
      data-test-subj="createRoutingFlyout"
    >
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="xs">
          <h4 id={titleId}>
            {isRoutingListFlow
              ? i18n.translate('xpack.streams.createRoutingFlyout.routeYourDataTitle', {
                  defaultMessage: 'Route your data',
                })
              : opinionated
              ? i18n.translate('xpack.streams.createRoutingFlyout.inheritanceTitle', {
                  defaultMessage:
                    'Create routing conditions inheriting the selected destination schema',
                })
              : initialStep === 'applied'
              ? i18n.translate('xpack.streams.createRoutingFlyout.editTitle', {
                  defaultMessage: 'Routing conditions',
                })
              : i18n.translate('xpack.streams.createRoutingFlyout.title', {
                  defaultMessage: 'Create routing conditions',
                })}
          </h4>
        </EuiTitle>
        {isRoutingListFlow || initialStep === 'applied' ? (
          <>
            <EuiSpacer size="xs" />
            <EuiText size="s" color="subdued">
              {initialStep === 'applied' && !isRoutingListFlow
                ? i18n.translate('xpack.streams.createRoutingFlyout.editDescription', {
                    defaultMessage:
                      'Review and refine the conditions that decide which data flows into this destination.',
                  })
                : i18n.translate('xpack.streams.createRoutingFlyout.routeYourDataDescription', {
                    defaultMessage:
                      'Send incoming data to destinations based on what it has in common.',
                  })}{' '}
              <EuiLink external target="_blank">
                {i18n.translate('xpack.streams.createRoutingFlyout.seeOurDocs', {
                  defaultMessage: 'See our docs',
                })}
              </EuiLink>
            </EuiText>
          </>
        ) : null}
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
              padding-right: ${euiTheme.size.base};
              overflow-y: auto;
              ${step === 'empty' ? 'display: flex; align-items: flex-start; justify-content: center;' : ''}
            `}
          >
            {step === 'empty' ? (
              <EmptyRoutingPanel onCreate={() => setStep('form')} opinionated={opinionated} />
            ) : isRoutingListFlow ? (
              <RoutingRulesListPanel
                routes={routes}
                onEditRoute={startEditRoute}
                onDeleteRoute={deleteRoute}
                onNewRoute={startNewRoute}
                isFormOpen={step === 'form'}
                editingRouteId={step === 'form' ? editingRouteId : null}
                createCard={step === 'form' && !editingRouteId ? inlineCard : null}
                editCard={inlineCard}
              />
            ) : step === 'form' ? (
              <RoutingConditionForm
                conditions={conditions}
                setConditions={setConditions}
                destination={destination}
                setDestination={setDestination}
                newDestinationName={newDestinationName}
                setNewDestinationName={setNewDestinationName}
                newDestinationStorage={newDestinationStorage}
                setNewDestinationStorage={setNewDestinationStorage}
                inheritedDestinationName={inheritedDestinationName}
                onCancel={() => setStep('empty')}
                onCreate={() => setStep('applied')}
              />
            ) : (
              <AppliedRoutingPanel
                conditions={conditions}
                destination={destination}
                newDestinationName={composedDestinationName}
                onEdit={() => setStep('form')}
              />
            )}
          </div>

          {/* Right panel */}
          <DataPreviewPanel />
        </EuiFlexGroup>
      </EuiFlyoutBody>

      {isRoutingListFlow ? (
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
              <EuiButton fill onClick={handleRouteYourData}>
                {i18n.translate('xpack.streams.createRoutingFlyout.routeYourDataSubmit', {
                  defaultMessage: 'Route your data',
                })}
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlyoutFooter>
      ) : step === 'applied' ? (
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
              <EuiButton
                fill
                onClick={() =>
                  onApply
                    ? onApply({
                        createNewDestination: destination === 'new',
                        newDestinationName: composedDestinationName,
                        newDestinationStorage,
                      })
                    : onClose()
                }
              >
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
