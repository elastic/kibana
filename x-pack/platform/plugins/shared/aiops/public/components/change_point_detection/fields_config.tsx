/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type FC, type PropsWithChildren, useCallback, useMemo, useState } from 'react';
import {
  EuiButton,
  EuiButtonIcon,
  EuiCallOut,
  EuiContextMenu,
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  EuiFormRow,
  EuiPanel,
  EuiPopover,
  EuiProgress,
  EuiSpacer,
  EuiSwitch,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import type { FieldStatsServices } from '@kbn/unified-field-list/src/components/field_stats';
import { useTimefilter, useTimeRangeUpdates } from '@kbn/ml-date-picker';
import type { SaveModalDashboardProps } from '@kbn/presentation-util-plugin/public';
import {
  LazySavedObjectSaveModalDashboard,
  withSuspense,
} from '@kbn/presentation-util-plugin/public';
import type { EuiContextMenuProps } from '@elastic/eui/src/components/context_menu/context_menu';
import { isDefined } from '@kbn/ml-is-defined';
import type { ChangePointDetectionViewType } from '@kbn/aiops-change-point-detection/constants';
import {
  CHANGE_POINT_DETECTION_VIEW_TYPE,
  EMBEDDABLE_CHANGE_POINT_CHART_TYPE,
} from '@kbn/aiops-change-point-detection/constants';
import type { ChangePointEmbeddableRuntimeState } from '../../embeddables/change_point_chart/types';
import { MaxSeriesControl } from './max_series_control';
import { useCasesModal } from '../../hooks/use_cases_modal';
import { useDataSource } from '../../hooks/use_data_source';
import { useAiopsAppContext } from '../../hooks/use_aiops_app_context';
import { ChangePointsTable } from './change_points_table';
import { MAX_CHANGE_POINT_CONFIGS, SPLIT_FIELD_CARDINALITY_LIMIT } from './constants';
import { FunctionPicker } from './function_picker';
import { MetricFieldSelector } from './metric_field_selector';
import { SplitFieldSelector } from './split_field_selector';
import type { SelectedChangePoint } from './change_point_detection_context';
import {
  type ChangePointAnnotation,
  type FieldConfig,
  useChangePointDetectionContext,
} from './change_point_detection_context';
import { useChangePointResults } from './use_change_point_agg_request';
import { useSplitFieldCardinality } from './use_split_field_cardinality';
import { ViewTypeSelector } from './view_type_selector';
import { CASES_TOAST_MESSAGES_TITLES } from '../../cases/constants';

const selectControlCss = { width: '350px' };

const SavedObjectSaveModalDashboard = withSuspense(LazySavedObjectSaveModalDashboard);

/**
 * Contains panels with controls and change point results.
 */
export const FieldsConfig: FC = () => {
  const {
    requestParams: { fieldConfigs },
    updateRequestParams,
    selectedChangePoints,
    setSelectedChangePoints,
  } = useChangePointDetectionContext();

  const onChange = useCallback(
    (update: FieldConfig, index: number) => {
      fieldConfigs.splice(index, 1, update);
      updateRequestParams({ fieldConfigs });
    },
    [updateRequestParams, fieldConfigs]
  );

  const onAdd = useCallback(() => {
    const update = [...fieldConfigs];
    update.push(update[update.length - 1]);
    updateRequestParams({ fieldConfigs: update });
  }, [updateRequestParams, fieldConfigs]);

  const onRemove = useCallback(
    (index: number) => {
      fieldConfigs.splice(index, 1);
      updateRequestParams({ fieldConfigs });

      delete selectedChangePoints[index];
      setSelectedChangePoints({
        ...selectedChangePoints,
      });
    },
    [updateRequestParams, fieldConfigs, setSelectedChangePoints, selectedChangePoints]
  );

  const onSelectionChange = useCallback(
    (update: SelectedChangePoint[], index: number) => {
      setSelectedChangePoints({
        ...selectedChangePoints,
        [index]: update,
      });
    },
    [setSelectedChangePoints, selectedChangePoints]
  );

  return (
    <>
      {fieldConfigs.map((fieldConfig, index) => {
        const key = index;
        return (
          <React.Fragment key={key}>
            <FieldPanel
              panelIndex={index}
              data-test-subj={`aiopsChangePointPanel_${index}`}
              fieldConfig={fieldConfig}
              onChange={(value) => onChange(value, index)}
              onRemove={onRemove.bind(null, index)}
              removeDisabled={fieldConfigs.length === 1}
              onSelectionChange={(update) => {
                onSelectionChange(update, index);
              }}
            />
            <EuiSpacer size="s" />
          </React.Fragment>
        );
      })}
      <EuiButton
        onClick={onAdd}
        disabled={fieldConfigs.length >= MAX_CHANGE_POINT_CONFIGS}
        data-test-subj={'aiopsChangePointAddConfig'}
      >
        <FormattedMessage
          id="xpack.aiops.changePointDetection.addButtonLabel"
          defaultMessage="Add"
        />
      </EuiButton>
    </>
  );
};

export interface FieldPanelProps {
  panelIndex: number;
  fieldConfig: FieldConfig;
  removeDisabled: boolean;
  onChange: (update: FieldConfig) => void;
  onRemove: () => void;
  onSelectionChange: (update: SelectedChangePoint[]) => void;
  'data-test-subj': string;
}

/**
 * Components that combines field config and state for change point response.
 * @param fieldConfig
 * @param onChange
 * @param onRemove
 * @param removeDisabled
 * @constructor
 */
const FieldPanel: FC<FieldPanelProps> = ({
  panelIndex,
  fieldConfig,
  onChange,
  onRemove,
  removeDisabled,
  onSelectionChange,
  'data-test-subj': dataTestSubj,
}) => {
  const {
    embeddable,
    application: { capabilities },
    cases,
  } = useAiopsAppContext();

  const { dataView } = useDataSource();

  const { combinedQuery, requestParams, selectedChangePoints } = useChangePointDetectionContext();

  const splitFieldCardinality = useSplitFieldCardinality(fieldConfig.splitField, combinedQuery);

  const [isExpanded, setIsExpanded] = useState<boolean>(true);
  const [isActionMenuOpen, setIsActionMenuOpen] = useState(false);
  const [isDashboardFormValid, setIsDashboardFormValid] = useState(true);

  const canEditDashboards = capabilities.dashboard_v2?.createNew ?? false;
  const { create: canCreateCase, update: canUpdateCase } = cases?.helpers?.canUseCases() ?? {
    create: false,
    update: false,
  };

  const [dashboardAttachment, setDashboardAttachment] = useState<{
    applyTimeRange: boolean;
    maxSeriesToPlot: number;
    viewType: ChangePointDetectionViewType;
  }>({
    applyTimeRange: false,
    maxSeriesToPlot: 6,
    viewType: CHANGE_POINT_DETECTION_VIEW_TYPE.CHARTS,
  });

  const [caseAttachment, setCaseAttachment] = useState<{
    viewType: ChangePointDetectionViewType;
  }>({ viewType: CHANGE_POINT_DETECTION_VIEW_TYPE.CHARTS });

  const [dashboardAttachmentReady, setDashboardAttachmentReady] = useState<boolean>(false);

  const {
    results: annotations,
    isLoading: annotationsLoading,
    progress,
  } = useChangePointResults(fieldConfig, requestParams, combinedQuery, splitFieldCardinality);

  const selectedPartitions = useMemo(() => {
    return (selectedChangePoints[panelIndex] ?? []).map((v) => v.group?.value as string);
  }, [selectedChangePoints, panelIndex]);

  const openCasesModalCallback = useCasesModal(
    EMBEDDABLE_CHANGE_POINT_CHART_TYPE,
    CASES_TOAST_MESSAGES_TITLES.CHANGE_POINT_DETECTION(
      caseAttachment.viewType,
      selectedPartitions.length
    )
  );

  const caseAttachmentButtonDisabled =
    isDefined(fieldConfig.splitField) && selectedPartitions.length === 0;

  const timeRange = useTimeRangeUpdates();

  const panels = useMemo<EuiContextMenuProps['panels']>(() => {
    return [
      {
        id: 'panelActions',
        size: 's',
        items: [
          ...(canEditDashboards || canUpdateCase || canCreateCase
            ? [
                {
                  name:
                    selectedPartitions.length > 0
                      ? i18n.translate(
                          'xpack.aiops.changePointDetection.attachSelectedChartsLabel',
                          {
                            defaultMessage: 'Attach selected charts',
                          }
                        )
                      : i18n.translate('xpack.aiops.changePointDetection.attachChartsLabel', {
                          defaultMessage: 'Attach charts',
                        }),
                  icon: 'plusInCircle',
                  panel: 'attachMainPanel',
                  'data-test-subj': 'aiopsChangePointDetectionAttachButton',
                },
              ]
            : []),
          {
            name: i18n.translate('xpack.aiops.changePointDetection.removeConfigLabel', {
              defaultMessage: 'Remove configuration',
            }),
            icon: 'trash',
            onClick: onRemove,
            disabled: removeDisabled,
          },
        ],
        'data-test-subj': 'aiopsChangePointDetectionContextMenuPanel',
      },
      {
        id: 'attachMainPanel',
        size: 's',
        initialFocusedItemIndex: 0,
        title:
          selectedPartitions.length > 0
            ? i18n.translate('xpack.aiops.changePointDetection.attachSelectedChartsLabel', {
                defaultMessage: 'Attach selected charts',
              })
            : i18n.translate('xpack.aiops.changePointDetection.attachChartsLabel', {
                defaultMessage: 'Attach charts',
              }),
        items: [
          ...(canEditDashboards
            ? [
                {
                  name: i18n.translate('xpack.aiops.changePointDetection.attachToDashboardLabel', {
                    defaultMessage: 'To dashboard',
                  }),
                  panel: 'attachToDashboardPanel',
                  icon: 'dashboardApp',
                  'data-test-subj': 'aiopsChangePointDetectionAttachToDashboardButton',
                },
              ]
            : []),
          ...(canUpdateCase || canCreateCase
            ? [
                {
                  name: i18n.translate('xpack.aiops.changePointDetection.attachToCaseLabel', {
                    defaultMessage: 'To case',
                  }),
                  disabled: caseAttachmentButtonDisabled,
                  ...(caseAttachmentButtonDisabled
                    ? {
                        toolTipProps: { position: 'left' as const },
                        toolTipContent: i18n.translate(
                          'xpack.aiops.changePointDetection.attachToCaseTooltipContent',
                          {
                            defaultMessage: 'Select change points to attach',
                          }
                        ),
                      }
                    : {}),
                  'data-test-subj': 'aiopsChangePointDetectionAttachToCaseButton',
                  panel: 'attachToCasePanel',
                  icon: 'casesApp',
                },
              ]
            : []),
        ],
        'data-test-subj': 'aiopsChangePointDetectionAttachChartPanel',
      },
      {
        id: 'attachToDashboardPanel',
        title: i18n.translate('xpack.aiops.changePointDetection.attachToDashboardTitle', {
          defaultMessage: 'Attach to dashboard',
        }),
        size: 's',
        content: (
          <EuiPanel paddingSize={'s'}>
            <EuiSpacer size={'s'} />
            <EuiForm data-test-subj="aiopsChangePointDetectionDashboardAttachmentForm">
              <ViewTypeSelector
                value={dashboardAttachment.viewType}
                onChange={(v) => {
                  setDashboardAttachment((prevState) => {
                    return {
                      ...prevState,
                      viewType: v,
                    };
                  });
                }}
              />
              <EuiFormRow fullWidth>
                <EuiSwitch
                  label={i18n.translate('xpack.aiops.changePointDetection.applyTimeRangeLabel', {
                    defaultMessage: 'Apply time range',
                  })}
                  checked={dashboardAttachment.applyTimeRange}
                  onChange={(e) =>
                    setDashboardAttachment((prevState) => {
                      return {
                        ...prevState,
                        applyTimeRange: e.target.checked,
                      };
                    })
                  }
                  compressed
                  data-test-subj="aiopsChangePointDetectionAttachToDashboardApplyTimeRangeSwitch"
                />
              </EuiFormRow>
              {isDefined(fieldConfig.splitField) && selectedPartitions.length === 0 ? (
                <MaxSeriesControl
                  value={dashboardAttachment.maxSeriesToPlot}
                  onChange={(v) => {
                    setDashboardAttachment((prevState) => {
                      return {
                        ...prevState,
                        maxSeriesToPlot: v,
                      };
                    });
                  }}
                  onValidationChange={(result) => {
                    setIsDashboardFormValid(result === null);
                  }}
                />
              ) : null}

              <EuiSpacer size={'m'} />

              <EuiButton
                data-test-subj="aiopsChangePointDetectionSubmitDashboardAttachButton"
                fill
                type={'submit'}
                fullWidth
                onClick={() => {
                  setIsActionMenuOpen(false);
                  setDashboardAttachmentReady(true);
                }}
                disabled={!isDashboardFormValid}
              >
                <FormattedMessage
                  id="xpack.aiops.changePointDetection.submitDashboardAttachButtonLabel"
                  defaultMessage="Attach"
                />
              </EuiButton>
            </EuiForm>
          </EuiPanel>
        ),
      },
      {
        id: 'attachToCasePanel',
        title: i18n.translate('xpack.aiops.changePointDetection.attachToCaseTitle', {
          defaultMessage: 'Attach to case',
        }),
        size: 's',
        content: (
          <EuiPanel paddingSize={'s'}>
            <EuiSpacer size={'s'} />
            <EuiForm data-test-subj="aiopsChangePointDetectionCaseAttachmentForm">
              <ViewTypeSelector
                value={caseAttachment.viewType}
                onChange={(v) => {
                  setCaseAttachment((prevState) => {
                    return {
                      ...prevState,
                      viewType: v,
                    };
                  });
                }}
              />
              <EuiButton
                data-test-subj="aiopsChangePointDetectionSubmitCaseAttachButton"
                fill
                type={'submit'}
                fullWidth
                onClick={() => {
                  setIsActionMenuOpen(false);
                  openCasesModalCallback({
                    timeRange,
                    viewType: caseAttachment.viewType,
                    fn: fieldConfig.fn,
                    metricField: fieldConfig.metricField,
                    dataViewId: dataView.id,
                    ...(fieldConfig.splitField
                      ? {
                          splitField: fieldConfig.splitField,
                          partitions: selectedPartitions,
                        }
                      : {}),
                  });
                }}
                disabled={!isDashboardFormValid}
              >
                <FormattedMessage
                  id="xpack.aiops.changePointDetection.submitDashboardAttachButtonLabel"
                  defaultMessage="Attach"
                />
              </EuiButton>
            </EuiForm>
          </EuiPanel>
        ),
      },
    ];
  }, [
    canCreateCase,
    canEditDashboards,
    canUpdateCase,
    caseAttachment.viewType,
    caseAttachmentButtonDisabled,
    dashboardAttachment.applyTimeRange,
    dashboardAttachment.maxSeriesToPlot,
    dashboardAttachment.viewType,
    dataView.id,
    fieldConfig.fn,
    fieldConfig.metricField,
    fieldConfig.splitField,
    isDashboardFormValid,
    onRemove,
    openCasesModalCallback,
    removeDisabled,
    selectedPartitions,
    timeRange,
  ]);

  const onSaveCallback: SaveModalDashboardProps['onSave'] = useCallback(
    ({ dashboardId, newTitle, newDescription }) => {
      const stateTransfer = embeddable!.getStateTransfer();

      const embeddableInput: Partial<ChangePointEmbeddableRuntimeState> = {
        title: newTitle,
        description: newDescription,
        viewType: dashboardAttachment.viewType,
        dataViewId: dataView.id,
        metricField: fieldConfig.metricField,
        splitField: fieldConfig.splitField,
        fn: fieldConfig.fn,
        ...(dashboardAttachment.applyTimeRange ? { timeRange } : {}),
        maxSeriesToPlot: dashboardAttachment.maxSeriesToPlot,
        ...(selectedChangePoints[panelIndex]?.length ? { partitions: selectedPartitions } : {}),
      };

      const state = {
        input: embeddableInput,
        type: EMBEDDABLE_CHANGE_POINT_CHART_TYPE,
      };

      const path = dashboardId === 'new' ? '#/create' : `#/view/${dashboardId}`;

      stateTransfer.navigateToWithEmbeddablePackage('dashboards', {
        state,
        path,
      });
    },
    [
      embeddable,
      dashboardAttachment.viewType,
      dashboardAttachment.applyTimeRange,
      dashboardAttachment.maxSeriesToPlot,
      dataView.id,
      fieldConfig.metricField,
      fieldConfig.splitField,
      fieldConfig.fn,
      timeRange,
      selectedChangePoints,
      panelIndex,
      selectedPartitions,
    ]
  );

  return (
    <EuiPanel paddingSize="s" hasBorder hasShadow={false} data-test-subj={dataTestSubj}>
      <EuiFlexGroup alignItems={'flexStart'} justifyContent={'spaceBetween'} gutterSize={'s'}>
        <EuiFlexItem grow={false}>
          <EuiButtonIcon
            data-test-subj="aiopsChangePointDetectionExpandConfigButton"
            iconType={isExpanded ? 'arrowDown' : 'arrowRight'}
            onClick={setIsExpanded.bind(null, (prevState) => !prevState)}
            aria-label={i18n.translate('xpack.aiops.changePointDetection.expandConfigLabel', {
              defaultMessage: 'Expand configuration',
            })}
            size="s"
          />
        </EuiFlexItem>

        <EuiFlexItem>
          <FieldsControls fieldConfig={fieldConfig} onChange={onChange} data-test-subj="blablabla">
            <EuiFlexItem {...(progress === null && { css: { display: 'none' } })} grow={true}>
              <EuiProgress
                label={
                  <FormattedMessage
                    id="xpack.aiops.changePointDetection.progressBarLabel"
                    defaultMessage="Fetching change points"
                  />
                }
                value={progress ?? 0}
                max={100}
                valueText
                size="m"
              />
              <EuiSpacer size="s" />
            </EuiFlexItem>
          </FieldsControls>
        </EuiFlexItem>

        <EuiFlexItem grow={false}>
          <EuiFlexGroup alignItems={'center'} justifyContent={'spaceBetween'} gutterSize={'s'}>
            <EuiFlexItem grow={false}>
              <EuiPopover
                id={`panelContextMenu_${panelIndex}`}
                button={
                  <EuiButtonIcon
                    data-test-subj="aiopsChangePointDetectionContextMenuButton"
                    aria-label={i18n.translate(
                      'xpack.aiops.changePointDetection.configActionsLabel',
                      {
                        defaultMessage: 'Context menu',
                      }
                    )}
                    color="text"
                    display="base"
                    size="s"
                    isSelected={isActionMenuOpen}
                    iconType="boxesHorizontal"
                    onClick={setIsActionMenuOpen.bind(null, !isActionMenuOpen)}
                  />
                }
                isOpen={isActionMenuOpen}
                closePopover={setIsActionMenuOpen.bind(null, false)}
                panelPaddingSize="none"
                anchorPosition="downLeft"
              >
                <EuiContextMenu panels={panels} initialPanelId={'panelActions'} />
              </EuiPopover>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>

      {isExpanded ? (
        <ChangePointResults
          fieldConfig={fieldConfig}
          isLoading={annotationsLoading}
          annotations={annotations}
          splitFieldCardinality={splitFieldCardinality}
          onSelectionChange={onSelectionChange}
        />
      ) : null}

      {dashboardAttachmentReady ? (
        <SavedObjectSaveModalDashboard
          canSaveByReference={false}
          objectType={i18n.translate('xpack.aiops.changePointDetection.objectTypeLabel', {
            defaultMessage: 'Change point chart',
          })}
          documentInfo={{
            title: i18n.translate('xpack.aiops.changePointDetection.attachmentTitle', {
              defaultMessage: 'Change point: {function}({metric}){splitBy}',
              values: {
                function: fieldConfig.fn,
                metric: fieldConfig.metricField,
                splitBy: fieldConfig.splitField
                  ? i18n.translate('xpack.aiops.changePointDetection.splitByTitle', {
                      defaultMessage: ' split by "{splitField}"',
                      values: { splitField: fieldConfig.splitField },
                    })
                  : '',
              },
            }),
          }}
          onClose={() => {
            setDashboardAttachmentReady(false);
          }}
          onSave={onSaveCallback}
        />
      ) : null}
    </EuiPanel>
  );
};

interface FieldsControlsProps {
  fieldConfig: FieldConfig;
  onChange: (update: FieldConfig) => void;
}

/**
 * Renders controls for fields selection and emits updates on change.
 */
export const FieldsControls: FC<PropsWithChildren<FieldsControlsProps>> = ({
  fieldConfig,
  onChange,
  children,
}) => {
  const { splitFieldsOptions, combinedQuery } = useChangePointDetectionContext();
  const { dataView } = useDataSource();
  const { data, uiSettings, fieldFormats, charts, fieldStats } = useAiopsAppContext();
  const timefilter = useTimefilter();
  // required in order to trigger state updates
  useTimeRangeUpdates();
  const timefilterActiveBounds = timefilter.getActiveBounds();

  const fieldStatsServices: FieldStatsServices = useMemo(() => {
    return {
      uiSettings,
      dataViews: data.dataViews,
      data,
      fieldFormats,
      charts,
    };
  }, [uiSettings, data, fieldFormats, charts]);

  const FieldStatsFlyoutProvider = fieldStats!.FieldStatsFlyoutProvider;

  const onChangeFn = useCallback(
    (field: keyof FieldConfig, value: string) => {
      const result = { ...fieldConfig, [field]: value };
      onChange(result);
    },
    [onChange, fieldConfig]
  );

  return (
    <FieldStatsFlyoutProvider
      fieldStatsServices={fieldStatsServices}
      dataView={dataView}
      dslQuery={combinedQuery}
      timeRangeMs={
        timefilterActiveBounds
          ? {
              from: timefilterActiveBounds.min!.valueOf(),
              to: timefilterActiveBounds.max!.valueOf(),
            }
          : undefined
      }
    >
      <EuiFlexGroup alignItems={'center'} responsive={true} wrap={true} gutterSize={'s'}>
        <EuiFlexItem grow={false} css={{ width: '200px' }}>
          <FunctionPicker value={fieldConfig.fn} onChange={(v) => onChangeFn('fn', v)} />
        </EuiFlexItem>
        <EuiFlexItem grow={false} css={selectControlCss}>
          <MetricFieldSelector
            value={fieldConfig.metricField!}
            onChange={(v) => onChangeFn('metricField', v)}
          />
        </EuiFlexItem>
        {splitFieldsOptions.length > 0 ? (
          <EuiFlexItem grow={false} css={selectControlCss}>
            <SplitFieldSelector
              value={fieldConfig.splitField}
              onChange={(v) => onChangeFn('splitField', v!)}
            />
          </EuiFlexItem>
        ) : null}

        {children}
      </EuiFlexGroup>
    </FieldStatsFlyoutProvider>
  );
};

interface ChangePointResultsProps {
  fieldConfig: FieldConfig;
  splitFieldCardinality: number | null;
  isLoading: boolean;
  annotations: ChangePointAnnotation[];
  onSelectionChange: (update: SelectedChangePoint[]) => void;
}

/**
 * Handles request and rendering results of the change point  with provided config.
 */
export const ChangePointResults: FC<ChangePointResultsProps> = ({
  fieldConfig,
  splitFieldCardinality,
  isLoading,
  annotations,
  onSelectionChange,
}) => {
  const cardinalityExceeded =
    splitFieldCardinality && splitFieldCardinality > SPLIT_FIELD_CARDINALITY_LIMIT;

  return (
    <>
      <EuiSpacer size="s" />

      {cardinalityExceeded ? (
        <>
          <EuiCallOut
            title={i18n.translate('xpack.aiops.changePointDetection.cardinalityWarningTitle', {
              defaultMessage: 'Analysis has been limited',
            })}
            color="warning"
            iconType="warning"
          >
            <p>
              {i18n.translate('xpack.aiops.changePointDetection.cardinalityWarningMessage', {
                defaultMessage:
                  'The "{splitField}" field cardinality is {cardinality} which exceeds the limit of {cardinalityLimit}. Only the first {cardinalityLimit} partitions, sorted by document count, are analyzed.',
                values: {
                  cardinality: splitFieldCardinality,
                  cardinalityLimit: SPLIT_FIELD_CARDINALITY_LIMIT,
                  splitField: fieldConfig.splitField,
                },
              })}
            </p>
          </EuiCallOut>
          <EuiSpacer size="m" />
        </>
      ) : null}

      <ChangePointsTable
        annotations={annotations}
        fieldConfig={fieldConfig}
        isLoading={isLoading}
        onSelectionChange={onSelectionChange}
      />
    </>
  );
};
