/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiButtonEmpty,
  EuiButtonGroup,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiForm,
  EuiFormRow,
  EuiHorizontalRule,
  EuiSpacer,
  EuiSwitch,
  EuiTitle,
} from '@elastic/eui';
import {
  CHANGE_POINT_CHART_DEFAULT_SERIES,
  CHANGE_POINT_DETECTION_VIEW_TYPE,
  type ChangePointDetectionViewType,
} from '@kbn/aiops-change-point-detection/constants';
import type { DataViewField } from '@kbn/data-views-plugin/public';
import type { ChangePointGridFormConfiguration } from '@kbn/discover-utils';
import type { AggregateQuery, TimeRange } from '@kbn/es-query';
import { ESQLLangEditor } from '@kbn/esql/public';
import { apiPublishesESQLVariables, type ESQLControlVariable } from '@kbn/esql-types';
import { getChangePointSeriesColumns, hasChangePointCommand } from '@kbn/esql-utils';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { KbnWarningCallout } from '@kbn/ui-callout';
import React, { type FC, useCallback, useEffect, useMemo, useState } from 'react';
import useObservable from 'react-use/lib/useObservable';
import { of } from 'rxjs';
import {
  ChangePointDetectionControlsContextProvider,
  useChangePointDetectionControlsContext,
} from '../../components/change_point_detection/change_point_detection_context';
import { ViewTypeSelector } from '../../components/change_point_detection/view_type_selector';
import { TimeFieldWarning } from '../../components/time_field_warning';
import { useAiopsAppContext } from '../../hooks/use_aiops_app_context';
import { DataSourceContextProvider, useDataSource } from '../../hooks/use_data_source';
import { buildChangePointEsql } from './build_change_point_esql';
import {
  buildChangePointPanelPackage,
  type ChangePointEsqlFormSubmission,
} from './build_change_point_panel_state';
import { FormControls, type FormControlsProps } from './change_point_chart_initializer';
import {
  ChangePointPanelPreview,
  type ChangePointPreviewStateUpdate,
} from './change_point_preview';

const MAX_ESQL_QUERY_LENGTH = 10_000;

/** Excludes scripted and Kibana data-view runtime fields, which ES|QL cannot query. */
export const isEsqlCompatibleField = (field: DataViewField): boolean =>
  !field.scripted && !field.runtimeField && field.isMapped !== false;

const getInitialFormControls = (
  initialFormConfiguration?: ChangePointGridFormConfiguration
): FormControlsProps | undefined => {
  if (!initialFormConfiguration) {
    return undefined;
  }

  return {
    fn: initialFormConfiguration.aggregation_function,
    metricField: initialFormConfiguration.metric_field,
    splitField: initialFormConfiguration.split_field,
    partitions: initialFormConfiguration.partitions,
    maxSeriesToPlot: CHANGE_POINT_CHART_DEFAULT_SERIES,
  };
};

const validateDirectEsqlQuery = (esql: string): string | undefined => {
  if (!esql.trim()) {
    return i18n.translate('xpack.aiops.embeddableChangePointChart.emptyDirectQueryErrorMessage', {
      defaultMessage: 'Enter an ES|QL query that includes a CHANGE_POINT command.',
    });
  }
  if (esql.length > MAX_ESQL_QUERY_LENGTH) {
    return i18n.translate('xpack.aiops.embeddableChangePointChart.maxDirectQueryErrorMessage', {
      defaultMessage: 'The ES|QL query exceeds the maximum length of {maxLength} characters.',
      values: { maxLength: MAX_ESQL_QUERY_LENGTH },
    });
  }
  if (!hasChangePointCommand(esql) || !getChangePointSeriesColumns(esql)) {
    return i18n.translate(
      'xpack.aiops.embeddableChangePointChart.invalidChangePointQueryErrorMessage',
      {
        defaultMessage:
          'The ES|QL query must be valid and include a top-level CHANGE_POINT command with a metric column.',
      }
    );
  }
  return undefined;
};

interface ResolvedDataViewSnapshot {
  readonly id?: string;
  readonly indexPattern: string;
  readonly timeFieldName?: string;
  readonly isTimeBased: boolean;
  readonly metricFieldNames: readonly string[];
}

const ResolvedDataViewControls: FC<{
  readonly formInput?: FormControlsProps;
  readonly onChange: (update: FormControlsProps) => void;
  readonly onResolvedDataViewChange: (snapshot: ResolvedDataViewSnapshot) => void;
}> = ({ formInput, onChange, onResolvedDataViewChange }) => {
  const { dataView } = useDataSource();
  const { metricFieldOptions } = useChangePointDetectionControlsContext();

  const metricFieldNames = useMemo(
    () => metricFieldOptions.map((field) => field.name),
    [metricFieldOptions]
  );

  useEffect(() => {
    const isTimeBased = dataView.isTimeBased();
    onResolvedDataViewChange({
      id: dataView.id,
      indexPattern: dataView.getIndexPattern(),
      timeFieldName: isTimeBased ? dataView.timeFieldName : undefined,
      isTimeBased,
      metricFieldNames,
    });
  }, [dataView, metricFieldNames, onResolvedDataViewChange]);

  if (!dataView.isTimeBased() || !dataView.timeFieldName) {
    return <TimeFieldWarning />;
  }

  if (metricFieldOptions.length === 0) {
    return (
      <KbnWarningCallout
        size="s"
        data-test-subj="aiopsChangePointNoCompatibleMetricFieldsWarning"
        title={i18n.translate('xpack.aiops.embeddableChangePointChart.noMetricFieldsTitle', {
          defaultMessage: 'No compatible metric fields found.',
        })}
        text={i18n.translate('xpack.aiops.embeddableChangePointChart.noMetricFieldsDescription', {
          defaultMessage:
            'Select a data view that contains at least one mapped numeric field supported by ES|QL.',
        })}
      />
    );
  }

  return <FormControls formInput={formInput} onChange={onChange} showMaxSeries={false} />;
};

export interface ChangePointEsqlInitializerProps {
  readonly dashboardParentApi: unknown;
  readonly showTableOption?: boolean;
  readonly isEditing?: boolean;
  readonly initialMode?: 'form' | 'esql';
  readonly initialFormConfiguration?: ChangePointGridFormConfiguration;
  readonly initialEsql?: string;
  readonly previewTimeRange?: TimeRange;
  readonly onConfirm: (submission: ChangePointEsqlFormSubmission) => void;
  readonly onCancel: () => void;
}

export const ChangePointEsqlInitializer: FC<ChangePointEsqlInitializerProps> = ({
  dashboardParentApi,
  showTableOption = true,
  isEditing = false,
  initialMode = 'form',
  initialFormConfiguration,
  initialEsql = '',
  previewTimeRange,
  onConfirm,
  onCancel,
}) => {
  const appContextValue = useAiopsAppContext();
  const {
    data: { dataViews },
    unifiedSearch: {
      ui: { IndexPatternSelect },
    },
  } = appContextValue;

  const esqlVariables$ = useMemo(
    () =>
      apiPublishesESQLVariables(dashboardParentApi)
        ? dashboardParentApi.esqlVariables$
        : of<ESQLControlVariable[] | undefined>(undefined),
    [dashboardParentApi]
  );
  const esqlVariables = useObservable(esqlVariables$, undefined);

  const [viewType, setViewType] = useState<ChangePointDetectionViewType>(
    CHANGE_POINT_DETECTION_VIEW_TYPE.CHARTS
  );
  const [inputMode, setInputMode] = useState(initialMode);
  const [dataViewId, setDataViewId] = useState(initialFormConfiguration?.data_view_id ?? '');
  const [formInput, setFormInput] = useState<FormControlsProps | undefined>(() =>
    getInitialFormControls(initialFormConfiguration)
  );
  const [onlyChangePoints, setOnlyChangePoints] = useState(false);
  const [resolvedDataView, setResolvedDataView] = useState<ResolvedDataViewSnapshot | undefined>(
    undefined
  );

  const [directEsql, setDirectEsql] = useState(() => (initialMode === 'esql' ? initialEsql : ''));
  const [submittedEsql, setSubmittedEsql] = useState<string | undefined>(undefined);

  const [previewState, setPreviewState] = useState<ChangePointPreviewStateUpdate>({
    key: undefined,
    status: 'idle',
  });

  const isTableView = viewType === CHANGE_POINT_DETECTION_VIEW_TYPE.TABLE;
  const effectiveOnlyChangePoints = isTableView && onlyChangePoints;

  const generatedEsql = useMemo(() => {
    if (
      !dataViewId ||
      !resolvedDataView ||
      resolvedDataView.id !== dataViewId ||
      !resolvedDataView.isTimeBased ||
      !resolvedDataView.timeFieldName ||
      !formInput?.metricField ||
      !resolvedDataView.metricFieldNames.includes(formInput.metricField)
    ) {
      return undefined;
    }

    return buildChangePointEsql({
      indexPattern: resolvedDataView.indexPattern,
      timeField: resolvedDataView.timeFieldName,
      aggregationFunction: formInput.fn,
      metricField: formInput.metricField,
      splitField: formInput.splitField,
      partitions: formInput.partitions,
      onlyChangePoints: effectiveOnlyChangePoints,
    });
  }, [dataViewId, effectiveOnlyChangePoints, formInput, resolvedDataView]);

  const isQueryMode = inputMode === 'esql';
  const structuralError = useMemo(
    () => (isQueryMode ? validateDirectEsqlQuery(directEsql) : undefined),
    [directEsql, isQueryMode]
  );

  const submission = useMemo<ChangePointEsqlFormSubmission | undefined>(() => {
    if (isQueryMode) {
      if (structuralError || !directEsql.trim()) {
        return undefined;
      }
      return {
        mode: 'esql',
        viewType,
        esql: directEsql,
      };
    }

    if (!generatedEsql || !dataViewId || !formInput?.metricField) {
      return undefined;
    }

    return {
      mode: 'form',
      viewType,
      esql: generatedEsql,
      dataViewId,
      aggregationFunction: formInput.fn,
      metricField: formInput.metricField,
      ...(formInput.splitField ? { splitField: formInput.splitField } : {}),
      ...(formInput.splitField && formInput.partitions?.length
        ? { partitions: formInput.partitions }
        : {}),
    };
  }, [dataViewId, directEsql, formInput, generatedEsql, isQueryMode, structuralError, viewType]);

  const previewPackage = useMemo(
    () => (submission ? buildChangePointPanelPackage(submission, { previewTimeRange }) : undefined),
    [previewTimeRange, submission]
  );
  const currentPreviewKey = submission
    ? `${submission.viewType}:${previewTimeRange?.from ?? ''}:${previewTimeRange?.to ?? ''}:${
        submission.esql
      }`
    : undefined;
  const previewDebounceMs =
    isQueryMode && submittedEsql !== undefined && submittedEsql === directEsql ? 0 : undefined;

  const canConfirm = Boolean(
    submission &&
      !structuralError &&
      currentPreviewKey &&
      previewState.key === currentPreviewKey &&
      previewState.status === 'ready'
  );

  const handleChangeInputMode = useCallback(
    (nextModeId: string) => {
      const nextMode = nextModeId === 'esql' ? 'esql' : 'form';
      if (nextMode === 'esql' && !directEsql.trim() && generatedEsql) {
        setDirectEsql(generatedEsql);
      }
      setInputMode(nextMode);
    },
    [directEsql, generatedEsql]
  );

  const handleSubmitDirectQuery = useCallback(
    async (nextQuery?: AggregateQuery) => {
      const submittedQuery = nextQuery ? nextQuery.esql : directEsql;
      if (nextQuery && nextQuery.esql !== directEsql) {
        setDirectEsql(nextQuery.esql);
      }
      setSubmittedEsql(submittedQuery);
    },
    [directEsql]
  );

  const inputModeOptions = useMemo(
    () => [
      {
        id: 'form',
        'data-test-subj': 'aiopsChangePointInputModeForm',
        label: i18n.translate('xpack.aiops.embeddableChangePointChart.inputModeFormLabel', {
          defaultMessage: 'Build with form',
        }),
      },
      {
        id: 'esql',
        'data-test-subj': 'aiopsChangePointInputModeEsql',
        label: i18n.translate('xpack.aiops.embeddableChangePointChart.inputModeEsqlLabel', {
          defaultMessage: 'Write a query',
        }),
        toolTipContent: i18n.translate(
          'xpack.aiops.embeddableChangePointChart.inputModeEsqlTooltip',
          {
            defaultMessage:
              'Write a custom ES|QL query that includes a CHANGE_POINT command to configure this panel.',
          }
        ),
      },
    ],
    []
  );

  return (
    <>
      <EuiFlyoutHeader>
        <EuiTitle>
          <h2 id="changePointConfig">
            <FormattedMessage
              id="xpack.aiops.embeddableChangePointChart.modalTitle"
              defaultMessage="Change point detection configuration"
            />
          </h2>
        </EuiTitle>
      </EuiFlyoutHeader>

      <EuiFlyoutBody>
        <EuiForm data-test-subj="aiopsChangePointDetectionControls" fullWidth>
          <EuiFormRow fullWidth data-test-subj="aiopsChangePointInputModeSelector">
            <EuiButtonGroup
              isFullWidth
              options={inputModeOptions}
              idSelected={inputMode}
              onChange={handleChangeInputMode}
              legend={i18n.translate('xpack.aiops.embeddableChangePointChart.inputModeLegend', {
                defaultMessage: 'Select configuration input',
              })}
            />
          </EuiFormRow>

          <ViewTypeSelector
            value={viewType}
            onChange={setViewType}
            showTableOption={showTableOption}
            isDisabled={isEditing}
            fullWidth={false}
          />

          {!isQueryMode ? (
            <>
              <EuiFormRow
                fullWidth
                label={i18n.translate('xpack.aiops.embeddableChangePointChart.dataViewLabel', {
                  defaultMessage: 'Data view',
                })}
              >
                <IndexPatternSelect
                  autoFocus={!dataViewId}
                  fullWidth
                  compressed
                  indexPatternId={dataViewId}
                  placeholder={i18n.translate(
                    'xpack.aiops.embeddableChangePointChart.dataViewSelectorPlaceholder',
                    {
                      defaultMessage: 'Select data view',
                    }
                  )}
                  onChange={(newId) => {
                    const nextId = newId ?? '';
                    if (nextId !== dataViewId) {
                      setDataViewId(nextId);
                      setResolvedDataView(undefined);
                      setFormInput(undefined);
                    }
                  }}
                  data-test-subj="aiopsChangePointChartEmbeddableDataViewSelector"
                />
              </EuiFormRow>
              <EuiHorizontalRule margin="s" />
              <DataSourceContextProvider
                key={dataViewId}
                dataViews={dataViews}
                dataViewId={dataViewId}
              >
                <ChangePointDetectionControlsContextProvider fieldFilter={isEsqlCompatibleField}>
                  <ResolvedDataViewControls
                    formInput={formInput}
                    onChange={setFormInput}
                    onResolvedDataViewChange={setResolvedDataView}
                  />
                </ChangePointDetectionControlsContextProvider>
              </DataSourceContextProvider>
              {isTableView ? (
                <>
                  <EuiSpacer size="m" />
                  <EuiFormRow fullWidth>
                    <EuiSwitch
                      data-test-subj="aiopsChangePointOnlyDetectedSwitch"
                      checked={onlyChangePoints}
                      onChange={(event) => setOnlyChangePoints(event.target.checked)}
                      label={
                        <FormattedMessage
                          id="xpack.aiops.embeddableChangePointChart.onlyDetectedSwitchLabel"
                          defaultMessage="Only show detected change points"
                        />
                      }
                    />
                  </EuiFormRow>
                </>
              ) : null}
            </>
          ) : (
            <EuiFormRow fullWidth>
              <ESQLLangEditor
                query={{ esql: directEsql }}
                onTextLangQueryChange={(nextQuery) => {
                  setDirectEsql(nextQuery.esql);
                }}
                onTextLangQuerySubmit={handleSubmitDirectQuery}
                isDisabled={false}
                editorIsInline
                hasOutline
                hideQueryHistory
                hideQuickSearch
                disableAutoFocus
                expandToFitQueryOnMount
                initialState={{ editorHeight: 140 }}
                errors={[]}
                esqlVariables={esqlVariables}
                dataTestSubj="aiopsChangePointEsqlEditor"
              />
            </EuiFormRow>
          )}

          <EuiSpacer size="m" />

          <EuiTitle size="xxs">
            <h3>
              <FormattedMessage
                id="xpack.aiops.embeddableChangePointChart.previewSectionTitle"
                defaultMessage="Preview"
              />
            </h3>
          </EuiTitle>
          <EuiSpacer size="s" />

          <ChangePointPanelPreview
            panelPackage={previewPackage}
            previewKey={currentPreviewKey}
            structuralError={structuralError}
            dashboardParentApi={dashboardParentApi}
            debounceMs={previewDebounceMs}
            onStatusChange={setPreviewState}
          />
        </EuiForm>
      </EuiFlyoutBody>

      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              onClick={onCancel}
              data-test-subj="aiopsChangePointChartsInitializerCancelButton"
            >
              <FormattedMessage
                id="xpack.aiops.embeddableChangePointChart.setupModal.cancelButtonLabel"
                defaultMessage="Cancel"
              />
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              data-test-subj="aiopsChangePointChartsInitializerConfirmButton"
              isDisabled={!canConfirm}
              onClick={() => submission && onConfirm(submission)}
              fill
            >
              <FormattedMessage
                id="xpack.aiops.embeddableChangePointChart.setupModal.confirmButtonLabel"
                defaultMessage="Confirm configurations"
              />
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </>
  );
};
