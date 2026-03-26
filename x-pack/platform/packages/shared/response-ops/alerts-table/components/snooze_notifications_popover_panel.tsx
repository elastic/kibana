/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useCallback, useMemo, useId, useEffect } from 'react';
import {
  EuiButton,
  EuiButtonGroup,
  EuiButtonIcon,
  EuiCallOut,
  EuiFieldNumber,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiIcon,
  EuiPanel,
  EuiSelect,
  EuiSpacer,
  EuiText,
  EuiDatePicker,
  EuiBadge,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import moment, { type Moment } from 'moment';

/** Full-width row while short labels stay compact and long labels avoid truncation */
const snoozeDurationButtonGroupStyles = css`
  width: 100%;

  .euiButtonGroup__buttons {
    width: 100%;
  }

  .euiButtonGroupButton.snoozeDurationButton--short {
    flex: 0 0 auto !important;
    width: auto !important;
  }

  .euiButtonGroupButton.snoozeDurationButton--long {
    flex: 1 1 0% !important;
    min-width: min-content !important;
    width: auto !important;
  }
`;

const longSnoozeDurationLabelContentStyles = css`
  overflow: visible;

  .eui-textTruncate {
    overflow: visible;
    text-overflow: clip;
    white-space: nowrap;
  }
`;

type SnoozeTab = 'quick' | 'condition';
type QuickDuration = 'indefinitely' | '1h' | '8h' | '24h' | 'custom';
type CustomSnoozeType = 'duration' | 'datetime';
type DurationUnit = 'minutes' | 'hours' | 'days' | 'weeks';
type TimeConditionType = 'duration' | 'absolute';
type TimeOperator = 'greater_than' | 'less_than';

export interface DataCondition {
  id: string;
  type: 'data';
  field: string;
  operator: string;
  value: string;
  isEditing: boolean;
}

export interface TimeCondition {
  id: string;
  type: 'time';
  timeType: TimeConditionType;
  operator: TimeOperator;
  absoluteValue: Moment | null;
  durationValue: number;
  durationUnit: DurationUnit;
  isEditing: boolean;
}

export interface ConditionalSnoozePayload {
  timeCondition: TimeCondition | null;
  dataConditions: DataCondition[];
  dataConditionsJoin: 'and' | 'or';
}

interface CustomDuration {
  value: number;
  unit: DurationUnit;
}

export interface SnoozeNotificationsPopoverPanelProps {
  onSnooze: (
    snoozeData:
      | {
          type: 'quick';
          duration?: QuickDuration;
          customDuration?: CustomDuration;
          customDateTime?: Moment | null;
        }
      | { type: 'condition'; conditionalSnooze: ConditionalSnoozePayload }
  ) => void;
  onClose: () => void;
}

const SNOOZE_TAB_OPTIONS = [
  {
    id: 'quick',
    label: i18n.translate('xpack.responseOpsAlertsTable.snooze.quickSnoozeTab', {
      defaultMessage: 'Quick Snooze',
    }),
  },
  {
    id: 'condition',
    label: i18n.translate('xpack.responseOpsAlertsTable.snooze.conditionBasedTab', {
      defaultMessage: 'Conditional Snooze',
    }),
  },
];

const QUICK_DURATION_OPTIONS = [
  {
    id: 'indefinitely',
    label: i18n.translate('xpack.responseOpsAlertsTable.snooze.indefinitely', {
      defaultMessage: 'Indefinitely',
    }),
    className: 'snoozeDurationButton--long',
    contentProps: { css: longSnoozeDurationLabelContentStyles },
  },
  {
    id: '1h',
    label: i18n.translate('xpack.responseOpsAlertsTable.snooze.oneHour', {
      defaultMessage: '1h',
    }),
    className: 'snoozeDurationButton--short',
  },
  {
    id: '8h',
    label: i18n.translate('xpack.responseOpsAlertsTable.snooze.eightHours', {
      defaultMessage: '8h',
    }),
    className: 'snoozeDurationButton--short',
  },
  {
    id: '24h',
    label: i18n.translate('xpack.responseOpsAlertsTable.snooze.twentyFourHours', {
      defaultMessage: '24h',
    }),
    className: 'snoozeDurationButton--short',
  },
  {
    id: 'custom',
    label: i18n.translate('xpack.responseOpsAlertsTable.snooze.custom', {
      defaultMessage: 'Custom',
    }),
    className: 'snoozeDurationButton--long',
    contentProps: { css: longSnoozeDurationLabelContentStyles },
  },
];

const CUSTOM_SNOOZE_TYPE_OPTIONS = [
  {
    id: 'duration',
    label: i18n.translate('xpack.responseOpsAlertsTable.snooze.customDuration', {
      defaultMessage: 'Duration',
    }),
    iconType: 'clock',
  },
  {
    id: 'datetime',
    label: i18n.translate('xpack.responseOpsAlertsTable.snooze.customDatetime', {
      defaultMessage: 'Date & time',
    }),
    iconType: 'calendar',
  },
];

const DURATION_UNIT_OPTIONS: Array<{ value: DurationUnit; text: string }> = [
  {
    value: 'minutes',
    text: i18n.translate('xpack.responseOpsAlertsTable.snooze.minutes', {
      defaultMessage: 'minutes',
    }),
  },
  {
    value: 'hours',
    text: i18n.translate('xpack.responseOpsAlertsTable.snooze.hours', {
      defaultMessage: 'hours',
    }),
  },
  {
    value: 'days',
    text: i18n.translate('xpack.responseOpsAlertsTable.snooze.days', {
      defaultMessage: 'days',
    }),
  },
  {
    value: 'weeks',
    text: i18n.translate('xpack.responseOpsAlertsTable.snooze.weeks', {
      defaultMessage: 'weeks',
    }),
  },
];

const formatDurationDisplay = (value: number, unit: DurationUnit): string => {
  const unitLabel = DURATION_UNIT_OPTIONS.find((o) => o.value === unit)?.text ?? unit;
  return `${value} ${unitLabel}`;
};

const TIME_CONDITION_TYPE_OPTIONS = [
  {
    id: 'duration',
    label: i18n.translate('xpack.responseOpsAlertsTable.snooze.timeConditionDuration', {
      defaultMessage: 'Duration',
    }),
    className: 'snoozeDurationButton--long',
    contentProps: { css: longSnoozeDurationLabelContentStyles },
  },
  {
    id: 'absolute',
    label: i18n.translate('xpack.responseOpsAlertsTable.snooze.timeConditionDateTime', {
      defaultMessage: 'Date & time',
    }),
    className: 'snoozeDurationButton--long',
    contentProps: { css: longSnoozeDurationLabelContentStyles },
  },
];

const DATA_FIELD_OPTIONS = [
  { value: 'severity', text: 'severity' },
  { value: 'status', text: 'status' },
  { value: 'priority', text: 'priority' },
];

const OPERATOR_OPTIONS = [
  {
    value: 'is',
    text: i18n.translate('xpack.responseOpsAlertsTable.snooze.operatorIs', {
      defaultMessage: 'is',
    }),
  },
  {
    value: 'is_not',
    text: i18n.translate('xpack.responseOpsAlertsTable.snooze.operatorIsNot', {
      defaultMessage: 'is not',
    }),
  },
];

const TIME_OPERATOR_OPTIONS: Array<{ value: TimeOperator; text: string }> = [
  {
    value: 'greater_than',
    text: i18n.translate('xpack.responseOpsAlertsTable.snooze.greaterThan', {
      defaultMessage: 'greater than',
    }),
  },
  {
    value: 'less_than',
    text: i18n.translate('xpack.responseOpsAlertsTable.snooze.lessThan', {
      defaultMessage: 'less than',
    }),
  },
];

const calculateUnsnoozeDate = (
  duration: QuickDuration,
  customDuration: CustomDuration,
  customDateTime: Moment | null
): Moment | null => {
  const now = moment();
  if (duration === 'indefinitely') return null;
  if (duration === '1h') return now.clone().add(1, 'hour');
  if (duration === '8h') return now.clone().add(8, 'hours');
  if (duration === '24h') return now.clone().add(24, 'hours');
  if (duration === 'custom') {
    return customDateTime ?? now.clone().add(customDuration.value, customDuration.unit);
  }
  return null;
};

const formatUnsnoozeDate = (date: Moment): string =>
  date.format(
    i18n.translate('xpack.responseOpsAlertsTable.snooze.unsnoozeDateFormat', {
      defaultMessage: 'MMM D, YYYY [at] h:mm A',
    })
  );

const formatDataConditionPhrase = (c: DataCondition): string => {
  const opText = c.operator === 'is' ? 'is' : 'is not';
  return `${c.field} ${opText} ${c.value}`;
};

const formatTimeConditionPhrase = (c: TimeCondition): string => {
  const val =
    c.timeType === 'absolute' && c.absoluteValue
      ? c.absoluteValue.format('MM/DD/YYYY hh:mm A')
      : c.timeType === 'duration'
        ? formatDurationDisplay(c.durationValue, c.durationUnit)
        : '';
  if (c.operator === 'greater_than') {
    return i18n.translate('xpack.responseOpsAlertsTable.snooze.summaryTimeAfter', {
      defaultMessage: 'it is after {time}',
      values: { time: val },
    });
  }
  return i18n.translate('xpack.responseOpsAlertsTable.snooze.summaryTimeBefore', {
    defaultMessage: 'it is before {time}',
    values: { time: val },
  });
};

const isTimeConditionComplete = (c: TimeCondition): boolean => {
  if (c.isEditing) return false;
  if (c.timeType === 'absolute') {
    return c.absoluteValue != null;
  }
  return c.durationValue > 0;
};

const buildConditionalSummary = (
  timeCondition: TimeCondition | null,
  dataConditions: DataCondition[],
  dataJoin: 'and' | 'or'
): string => {
  const validData = dataConditions.filter((c) => c.field && c.value && !c.isEditing);
  const dataPart = validData
    .map(formatDataConditionPhrase)
    .join(dataJoin === 'and' ? ' AND ' : ' OR ');

  const timePart =
    timeCondition && isTimeConditionComplete(timeCondition)
      ? formatTimeConditionPhrase(timeCondition)
      : '';

  if (dataPart && timePart) {
    return i18n.translate('xpack.responseOpsAlertsTable.snooze.conditionPreviewDataOrTime', {
      defaultMessage: '{dataPart} OR {timePart}',
      values: { dataPart, timePart },
    });
  }
  if (dataPart) {
    return dataPart;
  }
  if (timePart) {
    return timePart;
  }
  return '';
};

const DataConditionRow: React.FC<{
  condition: DataCondition;
  onConfirm: (id: string, updates: Partial<DataCondition>) => void;
  onDelete: (id: string) => void;
  onEdit: (id: string) => void;
}> = ({ condition, onConfirm, onDelete, onEdit }) => {
  const [field, setField] = useState(condition.field);
  const [operator, setOperator] = useState(condition.operator || 'is');
  const [value, setValue] = useState(condition.value);

  if (!condition.isEditing) {
    return (
      <EuiPanel paddingSize="s" color="subdued" hasBorder={false} hasShadow={false}>
        <EuiFlexGroup gutterSize="s" alignItems="center" justifyContent="spaceBetween" responsive={false}>
          <EuiFlexItem grow>
            <EuiFlexGroup gutterSize="s" alignItems="center" wrap>
              <EuiFlexItem grow={false}>
                <EuiIcon type="database" size="s" color="subdued" />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiBadge color="neutral">{condition.field}</EuiBadge>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiText size="xs" color="subdued">
                  {condition.operator === 'is'
                    ? i18n.translate('xpack.responseOpsAlertsTable.snooze.operatorIs', {
                        defaultMessage: 'is',
                      })
                    : i18n.translate('xpack.responseOpsAlertsTable.snooze.operatorIsNot', {
                        defaultMessage: 'is not',
                      })}
                </EuiText>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiBadge color="neutral">{condition.value}</EuiBadge>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFlexGroup gutterSize="xs" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiButtonIcon
                  aria-label={i18n.translate(
                    'xpack.responseOpsAlertsTable.snooze.editConditionAriaLabel',
                    { defaultMessage: 'Edit condition' }
                  )}
                  iconType="pencil"
                  size="xs"
                  color="text"
                  onClick={() => onEdit(condition.id)}
                />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButtonIcon
                  aria-label={i18n.translate(
                    'xpack.responseOpsAlertsTable.snooze.deleteConditionAriaLabel',
                    { defaultMessage: 'Delete condition' }
                  )}
                  iconType="trash"
                  size="xs"
                  color="text"
                  onClick={() => onDelete(condition.id)}
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>
    );
  }

  return (
    <EuiPanel paddingSize="s" hasBorder>
      <EuiFlexGroup gutterSize="s" alignItems="center" justifyContent="spaceBetween">
        <EuiFlexItem grow={false}>
          <EuiFlexGroup gutterSize="xs" alignItems="center">
            <EuiFlexItem grow={false}>
              <EuiIcon type="database" size="s" />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiText size="s">
                <strong>
                  {i18n.translate('xpack.responseOpsAlertsTable.snooze.dataConditionLabel', {
                    defaultMessage: 'Data condition',
                  })}
                </strong>
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiFlexGroup gutterSize="xs">
            <EuiFlexItem grow={false}>
              <EuiButtonIcon
                aria-label={i18n.translate(
                  'xpack.responseOpsAlertsTable.snooze.confirmConditionAriaLabel',
                  { defaultMessage: 'Confirm condition' }
                )}
                iconType="check"
                size="xs"
                color="success"
                display="base"
                onClick={() => onConfirm(condition.id, { field, operator, value, isEditing: false })}
              />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButtonIcon
                aria-label={i18n.translate(
                  'xpack.responseOpsAlertsTable.snooze.cancelConditionAriaLabel',
                  { defaultMessage: 'Cancel condition' }
                )}
                iconType="cross"
                size="xs"
                color="text"
                onClick={() => onDelete(condition.id)}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="s" />
      <EuiFlexGroup gutterSize="s" alignItems="center" wrap={false}>
      <EuiFlexItem>
        <EuiSelect
          compressed
          options={DATA_FIELD_OPTIONS}
          value={field}
          onChange={(e) => setField(e.target.value)}
          aria-label={i18n.translate(
            'xpack.responseOpsAlertsTable.snooze.fieldSelectAriaLabel',
            { defaultMessage: 'Select field' }
          )}
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiSelect
          compressed
          options={OPERATOR_OPTIONS}
          value={operator}
          onChange={(e) => setOperator(e.target.value)}
          aria-label={i18n.translate(
            'xpack.responseOpsAlertsTable.snooze.operatorSelectAriaLabel',
            { defaultMessage: 'Select operator' }
          )}
        />
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiFieldText
          compressed
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={i18n.translate(
            'xpack.responseOpsAlertsTable.snooze.valuePlaceholder',
            { defaultMessage: 'Value' }
          )}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
    </EuiPanel>
  );
};

const TimeConditionRow: React.FC<{
  condition: TimeCondition;
  groupId: string;
  onConfirm: (id: string, updates: Partial<TimeCondition>) => void;
  onDelete: (id: string) => void;
  onEdit: (id: string) => void;
}> = ({ condition, groupId, onConfirm, onDelete, onEdit }) => {
  const [timeType, setTimeType] = useState<TimeConditionType>(condition.timeType);
  const [absoluteValue, setAbsoluteValue] = useState<Moment | null>(condition.absoluteValue);
  const [durationValue, setDurationValue] = useState(condition.durationValue);
  const [durationUnit, setDurationUnit] = useState<DurationUnit>(condition.durationUnit);

  useEffect(() => {
    setTimeType(condition.timeType);
    setAbsoluteValue(condition.absoluteValue);
    setDurationValue(condition.durationValue);
    setDurationUnit(condition.durationUnit);
  }, [
    condition.id,
    condition.isEditing,
    condition.timeType,
    condition.durationValue,
    condition.durationUnit,
    condition.absoluteValue,
  ]);

  const timeTypeOptions = useMemo(
    () =>
      TIME_CONDITION_TYPE_OPTIONS.map((opt) => ({
        ...opt,
        id: `${groupId}-${opt.id}`,
      })),
    [groupId]
  );

  const onTimeTypeChange = useCallback(
    (id: string) => {
      const next = id.replace(`${groupId}-`, '') as TimeConditionType;
      setTimeType(next);
    },
    [groupId]
  );

  if (!condition.isEditing) {
    const val =
      condition.timeType === 'absolute' && condition.absoluteValue
        ? condition.absoluteValue.format('MM/DD/YYYY hh:mm A')
        : condition.timeType === 'duration'
          ? formatDurationDisplay(condition.durationValue, condition.durationUnit)
          : '';
    return (
      <EuiPanel paddingSize="s" color="subdued" hasBorder={false} hasShadow={false}>
        <EuiFlexGroup gutterSize="s" alignItems="center" justifyContent="spaceBetween" responsive={false}>
          <EuiFlexItem grow>
            <EuiFlexGroup gutterSize="s" alignItems="center" wrap>
              <EuiFlexItem grow={false}>
                <EuiIcon type="clock" size="s" color="subdued" />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiText size="xs" color="subdued">
                  {i18n.translate('xpack.responseOpsAlertsTable.snooze.snoozeUntilPrefix', {
                    defaultMessage: 'Snooze until',
                  })}
                </EuiText>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiBadge color="neutral">
                  {condition.operator === 'greater_than'
                    ? i18n.translate('xpack.responseOpsAlertsTable.snooze.timeReadAfterValue', {
                        defaultMessage: 'After {time}',
                        values: { time: val },
                      })
                    : i18n.translate('xpack.responseOpsAlertsTable.snooze.timeReadBeforeValue', {
                        defaultMessage: 'Before {time}',
                        values: { time: val },
                      })}
                </EuiBadge>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFlexGroup gutterSize="xs" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiButtonIcon
                  aria-label={i18n.translate(
                    'xpack.responseOpsAlertsTable.snooze.editConditionAriaLabel',
                    { defaultMessage: 'Edit condition' }
                  )}
                  iconType="pencil"
                  size="xs"
                  color="text"
                  onClick={() => onEdit(condition.id)}
                />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButtonIcon
                  aria-label={i18n.translate(
                    'xpack.responseOpsAlertsTable.snooze.deleteConditionAriaLabel',
                    { defaultMessage: 'Delete condition' }
                  )}
                  iconType="trash"
                  size="xs"
                  color="text"
                  onClick={() => onDelete(condition.id)}
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>
    );
  }

  return (
    <EuiPanel paddingSize="s" hasBorder>
      <EuiFlexGroup gutterSize="s" alignItems="center" justifyContent="spaceBetween">
        <EuiFlexItem grow={false}>
          <EuiFlexGroup gutterSize="xs" alignItems="center">
            <EuiFlexItem grow={false}>
              <EuiIcon type="clock" size="s" />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiText size="s">
                <strong>
                  {i18n.translate('xpack.responseOpsAlertsTable.snooze.timeConditionLabel', {
                    defaultMessage: 'Time condition',
                  })}
                </strong>
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiFlexGroup gutterSize="xs">
            <EuiFlexItem grow={false}>
              <EuiButtonIcon
                aria-label={i18n.translate(
                  'xpack.responseOpsAlertsTable.snooze.confirmConditionAriaLabel',
                  { defaultMessage: 'Confirm condition' }
                )}
                iconType="check"
                size="xs"
                color="success"
                display="base"
                onClick={() =>
                  onConfirm(condition.id, {
                    timeType,
                    operator: 'greater_than',
                    absoluteValue,
                    durationValue,
                    durationUnit,
                    isEditing: false,
                  })
                }
              />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButtonIcon
                aria-label={i18n.translate(
                  'xpack.responseOpsAlertsTable.snooze.cancelConditionAriaLabel',
                  { defaultMessage: 'Cancel condition' }
                )}
                iconType="cross"
                size="xs"
                color="text"
                onClick={() => onDelete(condition.id)}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="s" />
      <EuiButtonGroup
        css={snoozeDurationButtonGroupStyles}
        legend={i18n.translate('xpack.responseOpsAlertsTable.snooze.timeTypeToggleLegend', {
          defaultMessage: 'Time condition type',
        })}
        options={timeTypeOptions}
        idSelected={`${groupId}-${timeType}`}
        onChange={onTimeTypeChange}
        isFullWidth
        buttonSize="compressed"
      />
      <EuiSpacer size="s" />
      {timeType === 'absolute' ? (
        <EuiDatePicker
          compressed
          selected={absoluteValue}
          onChange={(date) => setAbsoluteValue(date)}
          showTimeSelect
          dateFormat="MM/DD/YYYY hh:mm A"
          fullWidth
          placeholder={i18n.translate(
            'xpack.responseOpsAlertsTable.snooze.dateTimePickerPlaceholder',
            {
              defaultMessage: 'Select a date and time',
            }
          )}
        />
      ) : (
        <EuiFlexGroup gutterSize="s" responsive={false}>
          <EuiFlexItem>
            <EuiFieldNumber
              compressed
              value={durationValue}
              min={1}
              onChange={(e) => setDurationValue(parseInt(e.target.value, 10) || 1)}
              aria-label={i18n.translate(
                'xpack.responseOpsAlertsTable.snooze.durationValueAriaLabel',
                { defaultMessage: 'Duration value' }
              )}
            />
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiSelect
              compressed
              options={DURATION_UNIT_OPTIONS}
              value={durationUnit}
              onChange={(e) => setDurationUnit(e.target.value as DurationUnit)}
              aria-label={i18n.translate(
                'xpack.responseOpsAlertsTable.snooze.durationUnitAriaLabel',
                { defaultMessage: 'Duration unit' }
              )}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      )}
    </EuiPanel>
  );
};

export const SnoozeNotificationsPopoverPanel: React.FC<
  SnoozeNotificationsPopoverPanelProps
> = ({ onSnooze, onClose }) => {
  const panelId = useId();

  const [activeTab, setActiveTab] = useState<SnoozeTab>('quick');
  const [selectedDuration, setSelectedDuration] = useState<QuickDuration>('indefinitely');
  const [customSnoozeType, setCustomSnoozeType] = useState<CustomSnoozeType>('duration');
  const [customDuration, setCustomDuration] = useState<CustomDuration>({ value: 2, unit: 'minutes' });
  const [customDateTime, setCustomDateTime] = useState<Moment | null>(null);
  const [timeCondition, setTimeCondition] = useState<TimeCondition | null>(null);
  const [dataConditions, setDataConditions] = useState<DataCondition[]>([]);
  const [dataConditionsJoin, setDataConditionsJoin] = useState<'and' | 'or'>('and');

  const tabOptions = useMemo(
    () => SNOOZE_TAB_OPTIONS.map((opt) => ({ ...opt, id: `${panelId}-tab-${opt.id}` })),
    [panelId]
  );

  const durationOptions = useMemo(
    () =>
      QUICK_DURATION_OPTIONS.map((opt) => ({ ...opt, id: `${panelId}-dur-${opt.id}` })),
    [panelId]
  );

  const customTypeOptions = useMemo(
    () =>
      CUSTOM_SNOOZE_TYPE_OPTIONS.map((opt) => ({ ...opt, id: `${panelId}-cust-${opt.id}` })),
    [panelId]
  );

  const unsnoozeDate = useMemo(
    () =>
      activeTab === 'quick'
        ? calculateUnsnoozeDate(
            selectedDuration,
            customSnoozeType === 'datetime' ? { value: 0, unit: 'minutes' } : customDuration,
            customSnoozeType === 'datetime' ? customDateTime : null
          )
        : null,
    [activeTab, selectedDuration, customSnoozeType, customDuration, customDateTime]
  );

  const conditionSummary = useMemo(
    () => buildConditionalSummary(timeCondition, dataConditions, dataConditionsJoin),
    [timeCondition, dataConditions, dataConditionsJoin]
  );

  const hasValidConditions = useMemo(() => {
    const hasValidData = dataConditions.some((c) => c.field && c.value && !c.isEditing);
    const hasValidTime = timeCondition != null && isTimeConditionComplete(timeCondition);
    return hasValidData || hasValidTime;
  }, [dataConditions, timeCondition]);

  const canSnooze = useMemo(() => {
    if (activeTab === 'quick') {
      if (selectedDuration !== 'custom') return true;
      if (customSnoozeType === 'duration') return customDuration.value > 0;
      return customDateTime != null;
    }
    return hasValidConditions;
  }, [
    activeTab,
    selectedDuration,
    customSnoozeType,
    customDuration.value,
    customDateTime,
    hasValidConditions,
  ]);

  const handleTabChange = useCallback(
    (id: string) => {
      setActiveTab(id.replace(`${panelId}-tab-`, '') as SnoozeTab);
    },
    [panelId]
  );

  const handleDurationChange = useCallback(
    (id: string) => {
      setSelectedDuration(id.replace(`${panelId}-dur-`, '') as QuickDuration);
    },
    [panelId]
  );

  const handleCustomTypeChange = useCallback(
    (id: string) => {
      setCustomSnoozeType(id.replace(`${panelId}-cust-`, '') as CustomSnoozeType);
    },
    [panelId]
  );

  const handleAddDataCondition = useCallback(() => {
    setDataConditions((prev) => [
      ...prev,
      {
        id: `data-${Date.now()}`,
        type: 'data',
        field: 'severity',
        operator: 'is',
        value: '',
        isEditing: true,
      },
    ]);
  }, []);

  const handleAddTimeCondition = useCallback(() => {
    if (timeCondition != null) {
      return;
    }
    setTimeCondition({
      id: `time-${Date.now()}`,
      type: 'time',
      timeType: 'duration',
      operator: 'greater_than',
      absoluteValue: null,
      durationValue: 2,
      durationUnit: 'minutes',
      isEditing: true,
    });
  }, [timeCondition]);

  const handleDataConditionConfirm = useCallback((id: string, updates: Partial<DataCondition>) => {
    setDataConditions((prev) =>
      prev.map((c) => (c.id === id ? ({ ...c, ...updates } as DataCondition) : c))
    );
  }, []);

  const handleDataConditionDelete = useCallback((id: string) => {
    setDataConditions((prev) => prev.filter((c) => c.id !== id));
  }, []);

  const handleDataConditionEdit = useCallback((id: string) => {
    setDataConditions((prev) =>
      prev.map((c) => (c.id === id ? { ...c, isEditing: true } : c))
    );
  }, []);

  const handleTimeConditionConfirm = useCallback((id: string, updates: Partial<TimeCondition>) => {
    setTimeCondition((prev) =>
      prev && prev.id === id ? ({ ...prev, ...updates } as TimeCondition) : prev
    );
  }, []);

  const handleTimeConditionDelete = useCallback((id: string) => {
    setTimeCondition((prev) => (prev?.id === id ? null : prev));
  }, []);

  const handleTimeConditionEdit = useCallback((id: string) => {
    setTimeCondition((prev) =>
      prev && prev.id === id ? { ...prev, isEditing: true } : prev
    );
  }, []);

  const toggleDataConditionsJoin = useCallback(() => {
    setDataConditionsJoin((j) => (j === 'and' ? 'or' : 'and'));
  }, []);

  const handleSnooze = useCallback(() => {
    if (activeTab === 'quick') {
      onSnooze({
        type: 'quick',
        duration: selectedDuration,
        customDuration: customSnoozeType === 'duration' ? customDuration : undefined,
        customDateTime: customSnoozeType === 'datetime' ? customDateTime : undefined,
      });
    } else {
      onSnooze({
        type: 'condition',
        conditionalSnooze: {
          timeCondition,
          dataConditions,
          dataConditionsJoin,
        },
      });
    }
  }, [
    activeTab,
    selectedDuration,
    customSnoozeType,
    customDuration,
    customDateTime,
    timeCondition,
    dataConditions,
    dataConditionsJoin,
    onSnooze,
  ]);

  return (
    <EuiPanel paddingSize="m">
      {/* Tab toggle */}
      <EuiButtonGroup
        legend={i18n.translate('xpack.responseOpsAlertsTable.snooze.tabToggleLegend', {
          defaultMessage: 'Snooze type',
        })}
        options={tabOptions}
        idSelected={`${panelId}-tab-${activeTab}`}
        onChange={handleTabChange}
        isFullWidth
        buttonSize="s"
      />

      <EuiSpacer size="s" />

      {activeTab === 'quick' ? (
        <QuickSnoozeTab
          panelId={panelId}
          selectedDuration={selectedDuration}
          durationOptions={durationOptions}
          customSnoozeType={customSnoozeType}
          customTypeOptions={customTypeOptions}
          customDuration={customDuration}
          customDateTime={customDateTime}
          unsnoozeDate={unsnoozeDate}
          onDurationChange={handleDurationChange}
          onCustomTypeChange={handleCustomTypeChange}
          onCustomDurationChange={setCustomDuration}
          onCustomDateTimeChange={setCustomDateTime}
        />
      ) : (
        <ConditionBasedTab
          panelId={panelId}
          timeCondition={timeCondition}
          dataConditions={dataConditions}
          dataConditionsJoin={dataConditionsJoin}
          conditionSummary={conditionSummary}
          onAddDataCondition={handleAddDataCondition}
          onAddTimeCondition={handleAddTimeCondition}
          onDataConditionConfirm={handleDataConditionConfirm}
          onDataConditionDelete={handleDataConditionDelete}
          onDataConditionEdit={handleDataConditionEdit}
          onTimeConditionConfirm={handleTimeConditionConfirm}
          onTimeConditionDelete={handleTimeConditionDelete}
          onTimeConditionEdit={handleTimeConditionEdit}
          onToggleDataConditionsJoin={toggleDataConditionsJoin}
        />
      )}

      <EuiSpacer size="s" />

      <EuiButton
        data-test-subj="snoozeAlertButton"
        fill
        fullWidth
        iconType="bellSlash"
        onClick={handleSnooze}
        isDisabled={!canSnooze}
      >
        {i18n.translate('xpack.responseOpsAlertsTable.snooze.snoozeAlertButton', {
          defaultMessage: 'Snooze alert',
        })}
      </EuiButton>
    </EuiPanel>
  );
};

interface QuickSnoozeTabProps {
  panelId: string;
  selectedDuration: QuickDuration;
  durationOptions: Array<{ id: string; label: string }>;
  customSnoozeType: CustomSnoozeType;
  customTypeOptions: Array<{ id: string; label: string; iconType: string }>;
  customDuration: CustomDuration;
  customDateTime: Moment | null;
  unsnoozeDate: Moment | null;
  onDurationChange: (id: string) => void;
  onCustomTypeChange: (id: string) => void;
  onCustomDurationChange: (duration: CustomDuration) => void;
  onCustomDateTimeChange: (date: Moment | null) => void;
}

const QuickSnoozeTab: React.FC<QuickSnoozeTabProps> = ({
  panelId,
  selectedDuration,
  durationOptions,
  customSnoozeType,
  customTypeOptions,
  customDuration,
  customDateTime,
  unsnoozeDate,
  onDurationChange,
  onCustomTypeChange,
  onCustomDurationChange,
  onCustomDateTimeChange,
}) => (
  <>
    <EuiText size="s">
      {i18n.translate('xpack.responseOpsAlertsTable.snooze.quickSnoozeQuestion', {
        defaultMessage: 'How long should this alert be snoozed?',
      })}
    </EuiText>

    <EuiSpacer size="s" />

    <EuiButtonGroup
      css={snoozeDurationButtonGroupStyles}
      legend={i18n.translate('xpack.responseOpsAlertsTable.snooze.durationLegend', {
        defaultMessage: 'Snooze duration',
      })}
      options={durationOptions}
      idSelected={`${panelId}-dur-${selectedDuration}`}
      onChange={onDurationChange}
      isFullWidth
      buttonSize="compressed"
    />

    {selectedDuration === 'custom' && (
      <>
        <EuiSpacer size="m" />
        <EuiButtonGroup
          legend={i18n.translate('xpack.responseOpsAlertsTable.snooze.customTypeLegend', {
            defaultMessage: 'Custom snooze type',
          })}
          options={customTypeOptions}
          idSelected={`${panelId}-cust-${customSnoozeType}`}
          onChange={onCustomTypeChange}
          isFullWidth
          buttonSize="compressed"
        />
        <EuiSpacer size="s" />
        {customSnoozeType === 'duration' ? (
          <EuiFlexGroup gutterSize="s">
            <EuiFlexItem>
              <EuiFieldNumber
                compressed
                value={customDuration.value}
                min={1}
                onChange={(e) =>
                  onCustomDurationChange({
                    ...customDuration,
                    value: parseInt(e.target.value, 10) || 1,
                  })
                }
                aria-label={i18n.translate(
                  'xpack.responseOpsAlertsTable.snooze.durationValueAriaLabel',
                  { defaultMessage: 'Duration value' }
                )}
              />
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiSelect
                compressed
                options={DURATION_UNIT_OPTIONS}
                value={customDuration.unit}
                onChange={(e) =>
                  onCustomDurationChange({
                    ...customDuration,
                    unit: e.target.value as DurationUnit,
                  })
                }
                aria-label={i18n.translate(
                  'xpack.responseOpsAlertsTable.snooze.durationUnitAriaLabel',
                  { defaultMessage: 'Duration unit' }
                )}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        ) : (
          <EuiDatePicker
            compressed
            selected={customDateTime}
            onChange={onCustomDateTimeChange}
            showTimeSelect
            dateFormat="MM/DD/YYYY hh:mm A"
            fullWidth
            placeholder={i18n.translate(
              'xpack.responseOpsAlertsTable.snooze.dateTimePickerPlaceholder',
              {
                defaultMessage: 'Select a date and time',
              }
            )}
          />
        )}
      </>
    )}

    {selectedDuration === 'indefinitely' && (
      <>
        <EuiSpacer size="m" />
        <EuiCallOut size="s" color="subdued" iconType={false}>
          {i18n.translate('xpack.responseOpsAlertsTable.snooze.indefiniteSnoozePreview', {
            defaultMessage:
              'Alert will be snoozed indefinitely or until manual unsnooze.',
          })}
        </EuiCallOut>
      </>
    )}

    {selectedDuration !== 'indefinitely' && unsnoozeDate && (
      <>
        <EuiSpacer size="m" />
        <EuiCallOut size="s" color="subdued" iconType={false}>
          {i18n.translate('xpack.responseOpsAlertsTable.snooze.unsnoozePreview', {
            defaultMessage: 'Alert will unsnooze on {date}',
            values: { date: formatUnsnoozeDate(unsnoozeDate) },
          })}
        </EuiCallOut>
      </>
    )}
  </>
);

const DataConditionsJoinSeparator: React.FC<{
  join: 'and' | 'or';
  onToggle: () => void;
}> = ({ join, onToggle }) => (
  <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
    <EuiFlexItem>
      <EuiHorizontalRule margin="none" />
    </EuiFlexItem>
    <EuiFlexItem grow={false}>
      <EuiBadge
        color="hollow"
        data-test-subj="dataConditionsJoinToggle"
        onClick={onToggle}
        onClickAriaLabel={i18n.translate(
          'xpack.responseOpsAlertsTable.snooze.dataConditionsJoinToggleAria',
          {
            defaultMessage: 'Toggle how data conditions are combined',
          }
        )}
      >
        {join === 'and'
          ? i18n.translate('xpack.responseOpsAlertsTable.snooze.dataJoinAnd', {
              defaultMessage: 'AND',
            })
          : i18n.translate('xpack.responseOpsAlertsTable.snooze.dataJoinOr', {
              defaultMessage: 'OR',
            })}
      </EuiBadge>
    </EuiFlexItem>
    <EuiFlexItem>
      <EuiHorizontalRule margin="none" />
    </EuiFlexItem>
  </EuiFlexGroup>
);

interface ConditionBasedTabProps {
  panelId: string;
  timeCondition: TimeCondition | null;
  dataConditions: DataCondition[];
  dataConditionsJoin: 'and' | 'or';
  conditionSummary: string;
  onAddDataCondition: () => void;
  onAddTimeCondition: () => void;
  onDataConditionConfirm: (id: string, updates: Partial<DataCondition>) => void;
  onDataConditionDelete: (id: string) => void;
  onDataConditionEdit: (id: string) => void;
  onTimeConditionConfirm: (id: string, updates: Partial<TimeCondition>) => void;
  onTimeConditionDelete: (id: string) => void;
  onTimeConditionEdit: (id: string) => void;
  onToggleDataConditionsJoin: () => void;
}

const ConditionBasedTab: React.FC<ConditionBasedTabProps> = ({
  panelId,
  timeCondition,
  dataConditions,
  dataConditionsJoin,
  conditionSummary,
  onAddDataCondition,
  onAddTimeCondition,
  onDataConditionConfirm,
  onDataConditionDelete,
  onDataConditionEdit,
  onTimeConditionConfirm,
  onTimeConditionDelete,
  onTimeConditionEdit,
  onToggleDataConditionsJoin,
}) => (
  <>
    <EuiText size="s">
      {i18n.translate('xpack.responseOpsAlertsTable.snooze.conditionBasedDescription', {
        defaultMessage: 'Alert is snoozed until conditions are met:',
      })}
    </EuiText>

    <EuiSpacer size="s" />

    {timeCondition ? (
      <TimeConditionRow
        key={`${timeCondition.id}-${timeCondition.isEditing}`}
        condition={timeCondition}
        groupId={`${panelId}-timecond-${timeCondition.id}`}
        onConfirm={onTimeConditionConfirm}
        onDelete={onTimeConditionDelete}
        onEdit={onTimeConditionEdit}
      />
    ) : (
      <EuiButton
        color="text"
        data-test-subj="addTimeConditionButton"
        fill={false}
        iconType="clock"
        size="s"
        onClick={onAddTimeCondition}
      >
        {i18n.translate('xpack.responseOpsAlertsTable.snooze.addTimeCondition', {
          defaultMessage: 'Add time condition',
        })}
      </EuiButton>
    )}

    <EuiSpacer size="m" />

    <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
      <EuiFlexItem>
        <EuiHorizontalRule margin="none" />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiText size="xs" color="subdued">
          <strong>
            {i18n.translate('xpack.responseOpsAlertsTable.snooze.timeDataOrSeparator', {
              defaultMessage: 'OR',
            })}
          </strong>
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiHorizontalRule margin="none" />
      </EuiFlexItem>
    </EuiFlexGroup>

    <EuiSpacer size="m" />

    {dataConditions.map((condition, index) => (
      <React.Fragment key={condition.id}>
        <DataConditionRow
          condition={condition}
          onConfirm={onDataConditionConfirm}
          onDelete={onDataConditionDelete}
          onEdit={onDataConditionEdit}
        />
        {index < dataConditions.length - 1 && (
          <>
            <EuiSpacer size="s" />
            <DataConditionsJoinSeparator
              join={dataConditionsJoin}
              onToggle={onToggleDataConditionsJoin}
            />
          </>
        )}
        <EuiSpacer size="s" />
      </React.Fragment>
    ))}

    <EuiButton
      color="text"
      data-test-subj="addDataConditionButton"
      fill={false}
      iconType="database"
      size="s"
      onClick={onAddDataCondition}
    >
      {i18n.translate('xpack.responseOpsAlertsTable.snooze.addDataCondition', {
        defaultMessage: 'Add data condition',
      })}
    </EuiButton>

    <EuiSpacer size="s" />

    <EuiCallOut size="s" color="subdued" iconType={false}>
      {conditionSummary ? (
        <EuiText size="s">
          {i18n.translate('xpack.responseOpsAlertsTable.snooze.conditionPreviewWithSummary', {
            defaultMessage: 'Alert will unsnooze if {summary}.',
            values: { summary: conditionSummary },
          })}
        </EuiText>
      ) : (
        <EuiText size="s" color="subdued">
          {i18n.translate('xpack.responseOpsAlertsTable.snooze.conditionPreviewEmpty', {
            defaultMessage: 'Add conditions to define when the alert will un-snooze.',
          })}
        </EuiText>
      )}
    </EuiCallOut>
  </>
);
