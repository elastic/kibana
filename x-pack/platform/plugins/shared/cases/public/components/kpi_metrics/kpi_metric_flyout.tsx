/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiButtonGroup,
  EuiComboBox,
  EuiFieldNumber,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiFormRow,
  EuiSelect,
  EuiSpacer,
  EuiSwitch,
  EuiText,
  EuiTextArea,
  EuiTitle,
  useGeneratedHtmlId,
} from '@elastic/eui';
import type { UserProfileWithAvatar } from '@kbn/user-profile-components';
import type { KpiMetricIndex } from '../../../common/constants';
import {
  KPI_FIELD_CATALOG,
  MAX_KPI_BREAKDOWN_SIZE,
  PREDEFINED_KPI_METRICS,
} from '../../../common/constants';
import type {
  KpiMetricErrorResult,
  KpiMetricRequest,
  KpiMetricResult,
} from '../../../common/types/api';
import type {
  KpiMetricAggregationType,
  KpiMetricDateField,
  KpiMetricThresholdUnit,
} from '../../../common/types/domain';
import { useBulkGetUserProfiles } from '../../containers/user_profiles/use_bulk_get_user_profiles';
import { usePreviewKpiMetric } from '../../containers/use_preview_kpi_metric';
import { formatKpiMetricValue } from '../all_cases/components/kpi_metric_tile';
import {
  formatKpiBreakdownSummary,
  getKpiBreakdownRows,
  getKpiBreakdownUserIds,
} from '../all_cases/components/kpi_breakdown_tile';
import type {
  DirectionOption,
  KpiMetricFormErrors,
  KpiMetricFormState,
  ThresholdComparatorOption,
} from './kpi_metric_form';
import {
  getFieldOptions,
  getGroupByFieldOptions,
  isBreakdownMetric,
  isDurationMetric,
  toKpiMetricFormState,
  toKpiMetricRequest,
  validateKpiMetricForm,
} from './kpi_metric_form';
import * as i18n from './translations';

const KIND_OPTIONS = [
  { id: 'predefined', label: i18n.PREDEFINED },
  { id: 'custom', label: i18n.CUSTOM },
];

const INDEX_OPTIONS: Array<{ value: KpiMetricIndex; text: string }> = [
  { value: 'cases', text: i18n.INDEX_CASES },
  { value: 'activity', text: i18n.INDEX_ACTIVITY },
  { value: 'attachments', text: i18n.INDEX_ATTACHMENTS },
];

const DATE_FIELD_OPTIONS: Array<{ value: KpiMetricDateField; text: string }> = [
  { value: 'created_at', text: i18n.DATE_FIELD_CREATED_AT },
  { value: 'closed_at', text: i18n.DATE_FIELD_CLOSED_AT },
];

const AGGREGATION_OPTIONS: Array<{ value: KpiMetricAggregationType; text: string }> = [
  { value: 'count', text: i18n.AGGREGATION_COUNT },
  { value: 'cardinality', text: i18n.AGGREGATION_CARDINALITY },
  { value: 'sum', text: i18n.AGGREGATION_SUM },
  { value: 'avg', text: i18n.AGGREGATION_AVG },
  { value: 'min', text: i18n.AGGREGATION_MIN },
  { value: 'max', text: i18n.AGGREGATION_MAX },
  { value: 'median', text: i18n.AGGREGATION_MEDIAN },
];

const THRESHOLD_OPTIONS: Array<{ value: ThresholdComparatorOption; text: string }> = [
  { value: 'none', text: i18n.THRESHOLD_NONE },
  { value: 'above', text: i18n.THRESHOLD_ABOVE },
  { value: 'below', text: i18n.THRESHOLD_BELOW },
];

const THRESHOLD_UNIT_OPTIONS: Array<{ value: KpiMetricThresholdUnit; text: string }> = [
  { value: 'm', text: i18n.THRESHOLD_UNIT_MINUTES },
  { value: 'h', text: i18n.THRESHOLD_UNIT_HOURS },
  { value: 'd', text: i18n.THRESHOLD_UNIT_DAYS },
];

const toThresholdUnit = (value: string): KpiMetricThresholdUnit =>
  THRESHOLD_UNIT_OPTIONS.find((option) => option.value === value)?.value ?? 'h';

const DIRECTION_OPTIONS: Array<{ value: DirectionOption; text: string }> = [
  { value: 'none', text: i18n.DIRECTION_NONE },
  { value: 'higher_is_better', text: i18n.DIRECTION_HIGHER_IS_BETTER },
  { value: 'lower_is_better', text: i18n.DIRECTION_LOWER_IS_BETTER },
];

const getPreviewText = (
  result: Exclude<KpiMetricResult, KpiMetricErrorResult>,
  unit?: KpiMetricThresholdUnit,
  userProfiles?: Map<string, UserProfileWithAvatar>
): string =>
  result.type === 'breakdown'
    ? i18n.PREVIEW_BREAKDOWN(formatKpiBreakdownSummary(getKpiBreakdownRows(result, userProfiles)))
    : i18n.PREVIEW_VALUE(formatKpiMetricValue(result.value, result.format, unit));

interface KpiMetricRowsProps {
  state: KpiMetricFormState;
  errors: KpiMetricFormErrors;
  showErrors: boolean;
  update: (changes: Partial<KpiMetricFormState>) => void;
}

const KpiMetricGroupByRows: React.FC<KpiMetricRowsProps> = ({
  state,
  errors,
  showErrors,
  update,
}) => {
  const options = useMemo(
    () => getGroupByFieldOptions(state.index).map((field) => ({ label: field })),
    [state.index]
  );
  const selectedOptions = state.groupByField !== '' ? [{ label: state.groupByField }] : [];
  const isFieldInvalid = showErrors && errors.groupByField != null;
  const isSizeInvalid = showErrors && errors.groupBySize != null;

  const onChangeField = useCallback(
    (groupByField: string) =>
      update({
        groupByField,
        ...(groupByField !== '' && {
          percent: false,
          thresholdComparator: 'none' as const,
          thresholdValue: '',
        }),
      }),
    [update]
  );

  return (
    <>
      <EuiFormRow
        label={i18n.GROUP_BY}
        helpText={i18n.GROUP_BY_HELP}
        fullWidth
        isInvalid={isFieldInvalid}
        error={errors.groupByField}
      >
        <EuiComboBox
          fullWidth
          singleSelection={{ asPlainText: true }}
          placeholder={i18n.GROUP_BY_PLACEHOLDER}
          options={options}
          selectedOptions={selectedOptions}
          onChange={(selected) => onChangeField(selected[0]?.label ?? '')}
          onCreateOption={
            state.index === 'cases' ? (value) => onChangeField(value.trim()) : undefined
          }
          isClearable
          isInvalid={isFieldInvalid}
          data-test-subj="kpi-metric-group-by"
        />
      </EuiFormRow>
      {state.groupByField !== '' && (
        <EuiFormRow
          label={i18n.GROUP_BY_SIZE}
          helpText={i18n.GROUP_BY_SIZE_HELP}
          fullWidth
          isInvalid={isSizeInvalid}
          error={errors.groupBySize}
        >
          <EuiFieldNumber
            fullWidth
            min={1}
            max={MAX_KPI_BREAKDOWN_SIZE}
            step={1}
            value={state.groupBySize}
            onChange={(e) => update({ groupBySize: e.target.value })}
            isInvalid={isSizeInvalid}
            data-test-subj="kpi-metric-group-by-size"
          />
        </EuiFormRow>
      )}
    </>
  );
};
KpiMetricGroupByRows.displayName = 'KpiMetricGroupByRows';

const KpiMetricThresholdRows: React.FC<KpiMetricRowsProps> = ({
  state,
  errors,
  showErrors,
  update,
}) => {
  const isDuration = isDurationMetric(state);
  const isValueInvalid = showErrors && errors.thresholdValue != null;

  return (
    <EuiFlexGroup gutterSize="s">
      <EuiFlexItem>
        <EuiFormRow label={i18n.THRESHOLD} fullWidth>
          <EuiSelect
            fullWidth
            options={THRESHOLD_OPTIONS}
            value={state.thresholdComparator}
            onChange={(e) => {
              const thresholdComparator =
                THRESHOLD_OPTIONS.find(({ value }) => value === e.target.value)?.value ?? 'none';
              update({ thresholdComparator });
            }}
            data-test-subj="kpi-metric-threshold-comparator"
          />
        </EuiFormRow>
      </EuiFlexItem>
      {state.thresholdComparator !== 'none' && (
        <>
          <EuiFlexItem>
            <EuiFormRow
              label={i18n.THRESHOLD_VALUE}
              helpText={isDuration ? i18n.THRESHOLD_DURATION_HELP : undefined}
              fullWidth
              isInvalid={isValueInvalid}
              error={errors.thresholdValue}
            >
              <EuiFieldNumber
                fullWidth
                value={state.thresholdValue}
                onChange={(e) => update({ thresholdValue: e.target.value })}
                isInvalid={isValueInvalid}
                data-test-subj="kpi-metric-threshold-value"
              />
            </EuiFormRow>
          </EuiFlexItem>
          {isDuration && (
            <EuiFlexItem>
              <EuiFormRow label={i18n.THRESHOLD_UNIT} fullWidth>
                <EuiSelect
                  fullWidth
                  options={THRESHOLD_UNIT_OPTIONS}
                  value={state.thresholdUnit}
                  onChange={(e) => update({ thresholdUnit: toThresholdUnit(e.target.value) })}
                  data-test-subj="kpi-metric-threshold-unit"
                />
              </EuiFormRow>
            </EuiFlexItem>
          )}
        </>
      )}
    </EuiFlexGroup>
  );
};
KpiMetricThresholdRows.displayName = 'KpiMetricThresholdRows';

export interface KpiMetricFlyoutProps {
  metric: KpiMetricRequest | null;
  isLoading: boolean;
  disabled: boolean;
  onClose: () => void;
  onSave: (metric: KpiMetricRequest) => void;
}

const KpiMetricFlyoutComponent: React.FC<KpiMetricFlyoutProps> = ({
  metric,
  isLoading,
  disabled,
  onClose,
  onSave,
}) => {
  const titleId = useGeneratedHtmlId();
  const [state, setState] = useState<KpiMetricFormState>(() => toKpiMetricFormState(metric));
  const [showErrors, setShowErrors] = useState(false);

  const {
    mutate: preview,
    data: previewResult,
    isLoading: isPreviewLoading,
    reset: resetPreview,
  } = usePreviewKpiMetric();

  const previewUids = useMemo(() => getKpiBreakdownUserIds(previewResult), [previewResult]);
  const { data: previewUserProfiles } = useBulkGetUserProfiles({ uids: previewUids });

  const errors = useMemo(() => validateKpiMetricForm(state), [state]);
  const hasErrors = Object.keys(errors).length > 0;
  const isBreakdown = isBreakdownMetric(state);
  const previewUnit = useMemo(
    () => toKpiMetricRequest(state, metric).threshold?.unit,
    [state, metric]
  );

  const update = useCallback(
    (changes: Partial<KpiMetricFormState>) => {
      setState((prev) => ({ ...prev, ...changes }));
      resetPreview();
    },
    [resetPreview]
  );

  const onTestQuery = useCallback(() => {
    if (hasErrors) {
      setShowErrors(true);
      return;
    }

    const request = toKpiMetricRequest(state, metric);

    if (request.kind === 'custom') {
      preview(request);
    }
  }, [hasErrors, metric, preview, state]);

  const fieldOptions = useMemo(
    () => getFieldOptions(state.index, state.aggregationType),
    [state.index, state.aggregationType]
  );

  const queryHelp = useMemo(
    () => i18n.QUERY_HELP(KPI_FIELD_CATALOG[state.index].map(({ field }) => field).join(', ')),
    [state.index]
  );

  const onSubmit = useCallback(() => {
    if (hasErrors) {
      setShowErrors(true);
      return;
    }

    onSave(toKpiMetricRequest(state, metric));
  }, [hasErrors, metric, onSave, state]);

  return (
    <EuiFlyout onClose={onClose} aria-labelledby={titleId} data-test-subj="kpi-metric-flyout">
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="s">
          <h3 id={titleId}>{metric != null ? i18n.EDIT_METRIC : i18n.ADD_METRIC}</h3>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <EuiFormRow label={i18n.KIND} fullWidth>
          <EuiButtonGroup
            legend={i18n.KIND}
            options={KIND_OPTIONS}
            idSelected={state.kind}
            onChange={(id) => update({ kind: id === 'predefined' ? 'predefined' : 'custom' })}
            isFullWidth
            data-test-subj="kpi-metric-kind"
          />
        </EuiFormRow>

        {state.kind === 'predefined' ? (
          <EuiFormRow label={i18n.PREDEFINED_METRIC} fullWidth>
            <EuiSelect
              fullWidth
              options={PREDEFINED_KPI_METRICS.map(({ id, label }) => ({
                value: id,
                text: i18n.PREDEFINED_LABELS[id] ?? label,
              }))}
              value={state.predefinedId}
              onChange={(e) => update({ predefinedId: e.target.value })}
              data-test-subj="kpi-metric-predefined-id"
            />
          </EuiFormRow>
        ) : (
          <>
            <EuiFormRow
              label={i18n.LABEL}
              fullWidth
              isInvalid={showErrors && errors.label != null}
              error={errors.label}
            >
              <EuiFieldText
                fullWidth
                value={state.label}
                onChange={(e) => update({ label: e.target.value })}
                isInvalid={showErrors && errors.label != null}
                data-test-subj="kpi-metric-label"
              />
            </EuiFormRow>
            <EuiFormRow label={i18n.INDEX} fullWidth>
              <EuiSelect
                fullWidth
                options={INDEX_OPTIONS}
                value={state.index}
                onChange={(e) => {
                  const index = INDEX_OPTIONS.find(({ value }) => value === e.target.value)?.value;
                  update({
                    index: index ?? 'cases',
                    field: '',
                    dateField: 'created_at',
                    groupByField: '',
                  });
                }}
                data-test-subj="kpi-metric-index"
              />
            </EuiFormRow>
            {state.index === 'cases' && (
              <EuiFormRow label={i18n.DATE_FIELD} helpText={i18n.DATE_FIELD_HELP} fullWidth>
                <EuiSelect
                  fullWidth
                  options={DATE_FIELD_OPTIONS}
                  value={state.dateField}
                  onChange={(e) => {
                    const dateField =
                      DATE_FIELD_OPTIONS.find(({ value }) => value === e.target.value)?.value ??
                      'created_at';
                    update({ dateField });
                  }}
                  data-test-subj="kpi-metric-date-field"
                />
              </EuiFormRow>
            )}
            <EuiFormRow
              label={i18n.QUERY}
              helpText={queryHelp}
              fullWidth
              isInvalid={showErrors && errors.query != null}
              error={errors.query}
            >
              <EuiTextArea
                fullWidth
                rows={3}
                value={state.query}
                onChange={(e) => update({ query: e.target.value })}
                isInvalid={showErrors && errors.query != null}
                data-test-subj="kpi-metric-query"
              />
            </EuiFormRow>
            <EuiFormRow label={i18n.AGGREGATION} fullWidth>
              <EuiSelect
                fullWidth
                options={AGGREGATION_OPTIONS}
                value={state.aggregationType}
                onChange={(e) => {
                  const aggregationType =
                    AGGREGATION_OPTIONS.find(({ value }) => value === e.target.value)?.value ??
                    'count';
                  update({ aggregationType, field: '', groupByField: '' });
                }}
                data-test-subj="kpi-metric-aggregation"
              />
            </EuiFormRow>
            {state.aggregationType === 'count' && (
              <KpiMetricGroupByRows
                state={state}
                errors={errors}
                showErrors={showErrors}
                update={update}
              />
            )}
            {state.aggregationType === 'count' && !isBreakdown && (
              <EuiFormRow fullWidth helpText={i18n.PERCENT_HELP}>
                <EuiSwitch
                  label={i18n.PERCENT}
                  checked={state.percent}
                  onChange={(e) => update({ percent: e.target.checked })}
                  data-test-subj="kpi-metric-percent"
                />
              </EuiFormRow>
            )}
            {state.aggregationType !== 'count' && (
              <EuiFormRow
                label={i18n.FIELD}
                fullWidth
                isInvalid={showErrors && errors.field != null}
                error={errors.field}
              >
                <EuiSelect
                  fullWidth
                  hasNoInitialSelection
                  options={fieldOptions.map((field) => ({ value: field, text: field }))}
                  value={state.field}
                  onChange={(e) => update({ field: e.target.value })}
                  isInvalid={showErrors && errors.field != null}
                  data-test-subj="kpi-metric-field"
                />
              </EuiFormRow>
            )}
            <EuiFormRow fullWidth>
              <EuiFlexGroup alignItems="center" gutterSize="m" responsive={false}>
                <EuiFlexItem grow={false}>
                  <EuiButton
                    size="s"
                    iconType="play"
                    onClick={onTestQuery}
                    isLoading={isPreviewLoading}
                    data-test-subj="kpi-metric-test-query"
                  >
                    {i18n.TEST_QUERY}
                  </EuiButton>
                </EuiFlexItem>
                {previewResult != null && (
                  <EuiFlexItem>
                    {previewResult.type === 'error' ? (
                      <EuiText size="s" color="danger" data-test-subj="kpi-metric-preview-error">
                        {previewResult.message}
                      </EuiText>
                    ) : (
                      <EuiText size="s" data-test-subj="kpi-metric-preview-value">
                        {getPreviewText(previewResult, previewUnit, previewUserProfiles)}
                      </EuiText>
                    )}
                  </EuiFlexItem>
                )}
              </EuiFlexGroup>
            </EuiFormRow>
          </>
        )}

        {!isBreakdown && (
          <>
            <EuiSpacer size="m" />
            <KpiMetricThresholdRows
              state={state}
              errors={errors}
              showErrors={showErrors}
              update={update}
            />
            <EuiSpacer size="m" />
          </>
        )}

        {state.kind === 'custom' && (
          <EuiFormRow label={i18n.DIRECTION} helpText={i18n.DIRECTION_HELP} fullWidth>
            <EuiSelect
              fullWidth
              options={DIRECTION_OPTIONS}
              value={state.direction}
              onChange={(e) => {
                const direction =
                  DIRECTION_OPTIONS.find(({ value }) => value === e.target.value)?.value ?? 'none';
                update({ direction });
              }}
              data-test-subj="kpi-metric-direction"
            />
          </EuiFormRow>
        )}
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty onClick={onClose} data-test-subj="kpi-metric-cancel">
              {i18n.CANCEL}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              fill
              onClick={onSubmit}
              isLoading={isLoading}
              disabled={disabled}
              data-test-subj="kpi-metric-save"
            >
              {i18n.SAVE}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};
KpiMetricFlyoutComponent.displayName = 'KpiMetricFlyout';

export const KpiMetricFlyout = React.memo(KpiMetricFlyoutComponent);
