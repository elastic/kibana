/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SearchFilterConfig } from '@elastic/eui';
import {
  EuiBadge,
  EuiButton,
  EuiButtonIcon,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiInMemoryTable,
  EuiLink,
  EuiProgress,
  EuiSpacer,
  EuiSwitch,
  EuiText,
  EuiTitle,
  EuiToolTip,
  type EuiSearchBarProps,
} from '@elastic/eui';
import type { EuiBasicTableColumn } from '@elastic/eui/src/components/basic_table/basic_table';
import type { EuiTableSelectionType } from '@elastic/eui/src/components/basic_table/table_types';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { useTimefilter } from '@kbn/ml-date-picker';
import { isPopulatedObject } from '@kbn/ml-is-populated-object';
import { useStorage } from '@kbn/ml-local-storage';
import { ELSER_ID_V1, MODEL_STATE } from '@kbn/ml-trained-models-utils';
import type { ListingPageUrlState } from '@kbn/ml-url-state';
import { usePageUrlState } from '@kbn/ml-url-state';
import { dynamic } from '@kbn/shared-ux-utility';
import type { FC } from 'react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import useObservable from 'react-use/lib/useObservable';
import { useUnsavedChangesPrompt } from '@kbn/unsaved-changes-prompt';
import type { ScopedHistory } from '@kbn/core/public';
import { ML_PAGES } from '../../../common/constants/locator';
import { ML_ELSER_CALLOUT_DISMISSED } from '../../../common/types/storage';
import type {
  DFAModelItem,
  NLPModelItem,
  TrainedModelItem,
  TrainedModelUIItem,
} from '../../../common/types/trained_models';
import {
  isBaseNLPModelItem,
  isBuiltInModel,
  isModelDownloadItem,
  isNLPModelItem,
} from '../../../common/types/trained_models';
import { AddInferencePipelineFlyout } from '../components/ml_inference';
import { SavedObjectsWarning } from '../components/saved_objects_warning';
import type { ModelsBarStats } from '../components/stats_bar';
import { StatsBar } from '../components/stats_bar';
import { TechnicalPreviewBadge } from '../components/technical_preview_badge';
import { useMlKibana } from '../contexts/kibana';
import { useTableSettings } from '../data_frame_analytics/pages/analytics_management/components/analytics_list/use_table_settings';
import { useRefresh } from '../routing/use_refresh';
import { useToastNotificationService } from '../services/toast_notification_service';
import { ModelsTableToConfigMapping } from './config_mapping';
import { DeleteModelsModal } from './delete_models_modal';
import { getModelStateColor } from './get_model_state';
import { useModelActions } from './model_actions';
import { TestDfaModelsFlyout } from './test_dfa_models_flyout';
import { TestModelAndPipelineCreationFlyout } from './test_models';
import { useTrainedModelsService } from './trained_models_service';

interface PageUrlState {
  pageKey: typeof ML_PAGES.TRAINED_MODELS_MANAGE;
  pageUrlState: ListingPageUrlState;
}

const ExpandedRow = dynamic(async () => ({
  default: (await import('./expanded_row')).ExpandedRow,
}));

const AddModelFlyout = dynamic(async () => ({
  default: (await import('./add_model_flyout')).AddModelFlyout,
}));

const modelIdColumnName = i18n.translate('xpack.ml.trainedModels.modelsList.modelIdHeader', {
  defaultMessage: 'ID',
});

export const getDefaultModelsListState = (): ListingPageUrlState => ({
  pageIndex: 0,
  pageSize: 10,
  sortField: modelIdColumnName,
  sortDirection: 'asc',
  showAll: false,
});

interface Props {
  history: ScopedHistory<unknown>;
  pageState?: ListingPageUrlState;
  updatePageState?: (update: Partial<ListingPageUrlState>) => void;
}

export const ModelsList: FC<Props> = ({
  pageState: pageStateExternal,
  updatePageState: updatePageStateExternal,
  history,
}) => {
  const {
    services: {
      application: { capabilities, navigateToUrl },
      docLinks,
      overlays,
      http,
    },
  } = useMlKibana();

  const trainedModelsService = useTrainedModelsService();
  const isInitialized = trainedModelsService.isInitialized();
  const items = useObservable(trainedModelsService.models$, trainedModelsService.models);
  const isLoading = useObservable(trainedModelsService.isLoading$, trainedModelsService.isLoading);
  const activeOperations = useObservable(
    trainedModelsService.activeOperations$,
    trainedModelsService.activeOperations
  );

  // Navigation blocker when there are active operations
  useUnsavedChangesPrompt({
    hasUnsavedChanges: activeOperations.length > 0,
    openConfirm: overlays.openConfirm,
    history,
    http,
    navigateToUrl,
    messageText: i18n.translate('xpack.ml.trainedModels.modelsList.leavePageMessage', {
      defaultMessage: 'You have active operations. Are you sure you want to leave this page?',
    }),
    titleText: i18n.translate('xpack.ml.trainedModels.modelsList.leavePageTitle', {
      defaultMessage: 'You have active operations',
    }),
    confirmButtonText: i18n.translate('xpack.ml.trainedModels.modelsList.leavePageConfirmButton', {
      defaultMessage: 'Leave',
    }),
    cancelButtonText: i18n.translate('xpack.ml.trainedModels.modelsList.leavePageCancelButton', {
      defaultMessage: 'Cancel',
    }),
  });

  const nlpElserDocUrl = docLinks.links.ml.nlpElser;

  const [isElserCalloutDismissed, setIsElserCalloutDismissed] = useStorage(
    ML_ELSER_CALLOUT_DISMISSED,
    false
  );

  useTimefilter({ timeRangeSelector: false, autoRefreshSelector: true });

  // allow for an internally controlled page state which stores the state in the URL
  // or an external page state, which is passed in as a prop.
  // external page state is used on the management page.
  const [pageStateInternal, updatePageStateInternal] = usePageUrlState<PageUrlState>(
    ML_PAGES.TRAINED_MODELS_MANAGE,
    getDefaultModelsListState()
  );

  const [pageState, updatePageState] =
    pageStateExternal && updatePageStateExternal
      ? [pageStateExternal, updatePageStateExternal]
      : [pageStateInternal, updatePageStateInternal];

  const refresh = useRefresh();

  const searchQueryText = pageState.queryText ?? '';

  const canDeleteTrainedModels = capabilities.ml.canDeleteTrainedModels as boolean;

  const { displayErrorToast } = useToastNotificationService();

  const [selectedModels, setSelectedModels] = useState<TrainedModelUIItem[]>([]);
  const [modelsToDelete, setModelsToDelete] = useState<TrainedModelUIItem[]>([]);
  const [modelToDeploy, setModelToDeploy] = useState<DFAModelItem | undefined>();
  const [itemIdToExpandedRowMap, setItemIdToExpandedRowMap] = useState<Record<string, JSX.Element>>(
    {}
  );
  const [modelToTest, setModelToTest] = useState<TrainedModelItem | null>(null);
  const [dfaModelToTest, setDfaModelToTest] = useState<DFAModelItem | null>(null);
  const [isAddModelFlyoutVisible, setIsAddModelFlyoutVisible] = useState(false);

  // List of downloaded/existing models
  const existingModels = useMemo<Array<NLPModelItem | DFAModelItem>>(() => {
    return items.filter((i): i is NLPModelItem | DFAModelItem => !isModelDownloadItem(i));
  }, [items]);

  useEffect(() => {
    return () => {
      if (trainedModelsService) {
        trainedModelsService.destroy();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(
    function updateOnTimerRefresh() {
      if (!refresh) return;

      // Register callback for expanded rows updates
      const removeCallback = trainedModelsService.onFetch((modelItems) => {
        // Refresh expanded rows
        setItemIdToExpandedRowMap((prevMap) => {
          return Object.fromEntries(
            Object.keys(prevMap).map((modelId) => {
              const item = modelItems.find((i) => i.model_id === modelId);
              return item ? [modelId, <ExpandedRow item={item as TrainedModelItem} />] : [];
            })
          );
        });
      });

      const fetchData = async () => {
        try {
          await trainedModelsService.fetchModels();
        } catch (error) {
          displayErrorToast(
            error,
            i18n.translate('xpack.ml.trainedModels.modelsList.fetchFailedErrorMessage', {
              defaultMessage: 'Error loading trained models',
            })
          );
        }
      };

      fetchData();

      return () => {
        removeCallback();
      };
    },
    [displayErrorToast, refresh, trainedModelsService]
  );

  const modelsStats: ModelsBarStats = useMemo(() => {
    return {
      total: {
        show: true,
        value: existingModels.length,
        label: i18n.translate('xpack.ml.trainedModels.modelsList.totalAmountLabel', {
          defaultMessage: 'Total trained models',
        }),
      },
    };
  }, [existingModels]);

  /**
   * Unique inference types from models
   */
  const inferenceTypesOptions = useMemo(() => {
    const result = existingModels.reduce((acc, item) => {
      const type = item.inference_config && Object.keys(item.inference_config)[0];
      if (type) {
        acc.add(type);
      }
      if (item.model_type) {
        acc.add(item.model_type);
      }
      return acc;
    }, new Set<string>());
    return [...result]
      .sort((a, b) => a.localeCompare(b))
      .map((v) => ({
        value: v,
        name: v,
      }));
  }, [existingModels]);

  const modelAndDeploymentIds = useMemo(() => {
    const nlpModels = existingModels.filter(isNLPModelItem);
    return [
      ...new Set([
        ...nlpModels.flatMap((v) => v.deployment_ids),
        ...nlpModels.map((i) => i.model_id),
      ]),
    ];
  }, [existingModels]);

  const onModelDownloadRequest = useCallback(
    async (modelId: string) => {
      try {
        await trainedModelsService.downloadModel(modelId);
      } catch (e) {
        displayErrorToast(
          e,
          i18n.translate('xpack.ml.trainedModels.modelsList.downloadFailed', {
            defaultMessage: 'Failed to download "{modelId}"',
            values: { modelId },
          })
        );
      }
    },
    [displayErrorToast, trainedModelsService]
  );

  /**
   * Table actions
   */
  const actions = useModelActions({
    isLoading,
    onTestAction: setModelToTest,
    onDfaTestAction: setDfaModelToTest,
    onModelsDeleteRequest: setModelsToDelete,
    onModelDeployRequest: setModelToDeploy,
    modelAndDeploymentIds,
    onModelDownloadRequest,
  });

  const toggleDetails = async (item: TrainedModelUIItem) => {
    const itemIdToExpandedRowMapValues = { ...itemIdToExpandedRowMap };
    if (itemIdToExpandedRowMapValues[item.model_id]) {
      delete itemIdToExpandedRowMapValues[item.model_id];
    } else {
      itemIdToExpandedRowMapValues[item.model_id] = <ExpandedRow item={item as TrainedModelItem} />;
    }
    setItemIdToExpandedRowMap(itemIdToExpandedRowMapValues);
  };

  const columns: Array<EuiBasicTableColumn<TrainedModelUIItem>> = [
    {
      isExpander: true,
      align: 'center',
      render: (item: TrainedModelUIItem) => {
        if (isModelDownloadItem(item) || !item.stats) {
          return null;
        }
        return (
          <EuiButtonIcon
            onClick={toggleDetails.bind(null, item)}
            aria-label={
              itemIdToExpandedRowMap[item.model_id]
                ? i18n.translate('xpack.ml.trainedModels.modelsList.collapseRow', {
                    defaultMessage: 'Collapse',
                  })
                : i18n.translate('xpack.ml.trainedModels.modelsList.expandRow', {
                    defaultMessage: 'Expand',
                  })
            }
            iconType={itemIdToExpandedRowMap[item.model_id] ? 'arrowDown' : 'arrowRight'}
          />
        );
      },
      'data-test-subj': 'mlModelsTableRowDetailsToggle',
    },
    {
      name: modelIdColumnName,
      sortable: ({ model_id: modelId }: TrainedModelUIItem) => modelId,
      truncateText: false,
      textOnly: false,
      'data-test-subj': 'mlModelsTableColumnId',
      render: (item: TrainedModelUIItem) => {
        const { description, model_id: modelId, type } = item;

        const isTechPreview =
          description?.includes('(Tech Preview)') || (isNLPModelItem(item) && item.techPreview);

        let descriptionText = description?.replace('(Tech Preview)', '');

        let tooltipContent = null;

        if (isBaseNLPModelItem(item)) {
          const { disclaimer, recommended, supported } = item;
          if (disclaimer) {
            descriptionText += '. ' + disclaimer;
          }

          tooltipContent =
            supported === false ? (
              <FormattedMessage
                id="xpack.ml.trainedModels.modelsList.notSupportedDownloadContent"
                defaultMessage="Model version is not supported by your cluster's hardware configuration"
              />
            ) : recommended === false ? (
              <FormattedMessage
                id="xpack.ml.trainedModels.modelsList.notRecommendedDownloadContent"
                defaultMessage="Model version is not optimized for your cluster's hardware configuration"
              />
            ) : null;
        }

        return (
          <EuiFlexGroup gutterSize={'xs'} direction={'column'}>
            <EuiFlexGroup gutterSize={'s'} alignItems={'center'} wrap={true}>
              <EuiFlexItem grow={false}>
                <strong data-test-subj="mlModelsTableColumnIdValueId">{modelId}</strong>
              </EuiFlexItem>
              {isTechPreview ? (
                <EuiFlexItem grow={false}>
                  <TechnicalPreviewBadge compressed />
                </EuiFlexItem>
              ) : null}
            </EuiFlexGroup>

            {descriptionText ? (
              <EuiText
                color={'subdued'}
                size={'xs'}
                data-test-subj="mlModelsTableColumnIdValueDescription"
              >
                {descriptionText}
                {tooltipContent ? (
                  <>
                    &nbsp;
                    <EuiToolTip content={tooltipContent}>
                      <EuiIcon type={'warning'} color="warning" />
                    </EuiToolTip>
                  </>
                ) : null}
              </EuiText>
            ) : null}

            {Array.isArray(type) && type.length > 0 ? (
              <EuiFlexGroup gutterSize={'xs'} direction={'row'}>
                {type.map((t) => (
                  <EuiFlexItem key={t} grow={false}>
                    <span>
                      <EuiBadge color="hollow" data-test-subj="mlModelType">
                        {t}
                      </EuiBadge>
                    </span>
                  </EuiFlexItem>
                ))}
              </EuiFlexGroup>
            ) : null}
          </EuiFlexGroup>
        );
      },
    },
    {
      name: i18n.translate('xpack.ml.trainedModels.modelsList.stateHeader', {
        defaultMessage: 'Model state',
      }),
      truncateText: false,
      width: '150px',
      render: (item: TrainedModelUIItem) => {
        if (!isBaseNLPModelItem(item)) return null;

        const { state, downloadState } = item;
        const config = getModelStateColor(state);
        if (!config) return null;

        const isProgressbarVisible = state === MODEL_STATE.DOWNLOADING && downloadState;

        const label = (
          <EuiText size="xs" color={config.color}>
            {config.name}
          </EuiText>
        );

        return (
          <EuiFlexGroup direction={'column'} gutterSize={'none'} css={{ width: '100%' }}>
            {isProgressbarVisible ? (
              <EuiFlexItem>
                <EuiProgress
                  label={config.name}
                  valueText={
                    <>
                      {downloadState
                        ? (
                            (downloadState.downloaded_parts / (downloadState.total_parts || -1)) *
                            100
                          ).toFixed(0) + '%'
                        : '100%'}
                    </>
                  }
                  value={downloadState?.downloaded_parts ?? 1}
                  max={downloadState?.total_parts ?? 1}
                  size="xs"
                  color={config.color}
                />
              </EuiFlexItem>
            ) : (
              <EuiFlexItem grow={false}>
                <span>{config.component ?? label}</span>
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        );
      },
      'data-test-subj': 'mlModelsTableColumnDeploymentState',
    },
    {
      name: i18n.translate('xpack.ml.trainedModels.modelsList.actionsHeader', {
        defaultMessage: 'Actions',
      }),
      width: '200px',
      actions,
      'data-test-subj': 'mlModelsTableColumnActions',
    },
  ];

  const filters: SearchFilterConfig[] =
    inferenceTypesOptions && inferenceTypesOptions.length > 0
      ? [
          {
            type: 'field_value_selection',
            field: 'type',
            name: i18n.translate('xpack.ml.dataframe.analyticsList.typeFilter', {
              defaultMessage: 'Type',
            }),
            multiSelect: 'or',
            options: inferenceTypesOptions,
          },
        ]
      : [];

  const toolsLeft = (
    <EuiFlexItem grow={false}>
      <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
        <EuiFlexItem grow={false}>
          <EuiTitle size="s">
            <h5>
              <FormattedMessage
                id="xpack.ml.trainedModels.modelsList.selectedModelsMessage"
                defaultMessage="{modelsCount, plural, one{# model} other {# models}} selected"
                values={{ modelsCount: selectedModels.length }}
              />
            </h5>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiButton
            color="danger"
            onClick={setModelsToDelete.bind(null, selectedModels)}
            data-test-subj="mlTrainedModelsDeleteSelectedModelsButton"
          >
            <FormattedMessage
              id="xpack.ml.trainedModels.modelsList.deleteModelsButtonLabel"
              defaultMessage="Delete"
            />
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFlexItem>
  );

  const isSelectionAllowed = canDeleteTrainedModels;

  const selection: EuiTableSelectionType<TrainedModelUIItem> | undefined = isSelectionAllowed
    ? {
        selectableMessage: (selectable, item) => {
          if (selectable) {
            return i18n.translate('xpack.ml.trainedModels.modelsList.selectableMessage', {
              defaultMessage: 'Select a model',
            });
          }
          // TODO support multiple model downloads with selection
          if (!isModelDownloadItem(item) && isPopulatedObject(item.pipelines)) {
            return i18n.translate('xpack.ml.trainedModels.modelsList.disableSelectableMessage', {
              defaultMessage: 'Model has associated pipelines',
            });
          }
          if (isBuiltInModel(item)) {
            return i18n.translate('xpack.ml.trainedModels.modelsList.builtInModelMessage', {
              defaultMessage: 'Built-in model',
            });
          }
          return '';
        },
        selectable: (item) =>
          !isModelDownloadItem(item) && !isPopulatedObject(item.pipelines) && !isBuiltInModel(item),
        onSelectionChange: (selectedItems) => {
          setSelectedModels(selectedItems);
        },
      }
    : undefined;

  const { onTableChange, pagination, sorting } = useTableSettings<TrainedModelUIItem>(
    items.length,
    pageState,
    updatePageState,
    true
  );

  const search: EuiSearchBarProps = {
    query: searchQueryText,
    onChange: (searchChange) => {
      if (searchChange.error !== null) {
        return false;
      }
      updatePageState({ queryText: searchChange.queryText, pageIndex: 0 });
      return true;
    },
    box: {
      incremental: true,
    },
    ...(inferenceTypesOptions && inferenceTypesOptions.length > 0
      ? {
          filters,
        }
      : {}),
    ...(selectedModels.length > 0
      ? {
          toolsLeft,
        }
      : {}),
  };

  const isElserCalloutVisible =
    !isElserCalloutDismissed && items.findIndex((i) => i.model_id === ELSER_ID_V1) >= 0;

  const tableItems = useMemo(() => {
    if (pageState.showAll) {
      return items;
    } else {
      // by default show only deployed models or recommended for download
      return items.filter((item) => !isModelDownloadItem(item) || item.recommended);
    }
  }, [items, pageState.showAll]);

  if (!isInitialized) return null;

  return (
    <>
      <SavedObjectsWarning
        onCloseFlyout={trainedModelsService.fetchModels.bind(trainedModelsService)}
        forceRefresh={isLoading}
      />
      <EuiFlexGroup justifyContent="spaceBetween">
        {modelsStats ? (
          <EuiFlexItem>
            <EuiFlexGroup alignItems="center">
              <EuiFlexItem grow={false}>
                <StatsBar stats={modelsStats} dataTestSub={'mlInferenceModelsStatsBar'} />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiSwitch
                  label={
                    <FormattedMessage
                      id="xpack.ml.trainedModels.modelsList.showAllLabel"
                      defaultMessage="Show all"
                    />
                  }
                  checked={!!pageState.showAll}
                  onChange={(e) => updatePageState({ showAll: e.target.checked })}
                  data-test-subj="mlModelsShowAllSwitch"
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        ) : null}
        <EuiFlexItem grow={false}>
          <EuiButton
            fill
            iconType={'plusInCircle'}
            color={'primary'}
            onClick={setIsAddModelFlyoutVisible.bind(null, true)}
            data-test-subj="mlModelsAddTrainedModelButton"
          >
            <FormattedMessage
              id="xpack.ml.trainedModels.modelsList.addModelButtonLabel"
              defaultMessage="Add trained model"
            />
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="m" />
      <div data-test-subj="mlModelsTableContainer">
        <EuiInMemoryTable<TrainedModelUIItem>
          tableLayout={'auto'}
          responsiveBreakpoint={'xl'}
          allowNeutralSort={false}
          columns={columns}
          itemIdToExpandedRowMap={itemIdToExpandedRowMap}
          items={tableItems}
          itemId={ModelsTableToConfigMapping.id}
          loading={isLoading}
          search={search}
          selection={selection}
          rowProps={(item) => ({
            'data-test-subj': `mlModelsTableRow row-${item.model_id}`,
          })}
          pagination={pagination}
          onTableChange={onTableChange}
          sorting={sorting}
          data-test-subj={isLoading ? 'mlModelsTable loading' : 'mlModelsTable loaded'}
          childrenBetween={
            isElserCalloutVisible ? (
              <>
                <EuiCallOut
                  size="s"
                  title={
                    <FormattedMessage
                      id="xpack.ml.trainedModels.modelsList.newElserModelTitle"
                      defaultMessage="New ELSER model now available"
                    />
                  }
                  onDismiss={setIsElserCalloutDismissed.bind(null, true)}
                >
                  <FormattedMessage
                    id="xpack.ml.trainedModels.modelsList.newElserModelDescription"
                    defaultMessage="A new version of ELSER that shows faster performance and improved relevance is now available. {docLink} for information on how to start using it."
                    values={{
                      docLink: (
                        <EuiLink href={nlpElserDocUrl} external target={'_blank'}>
                          <FormattedMessage
                            id="xpack.ml.trainedModels.modelsList.startDeployment.viewElserDocLink"
                            defaultMessage="View documentation"
                          />
                        </EuiLink>
                      ),
                    }}
                  />
                </EuiCallOut>
                <EuiSpacer size="m" />
              </>
            ) : null
          }
        />
      </div>
      {modelsToDelete.length > 0 && (
        <DeleteModelsModal
          onClose={(refreshList) => {
            modelsToDelete.forEach((model) => {
              if (isBaseNLPModelItem(model) && model.state === MODEL_STATE.DOWNLOADING) {
                trainedModelsService.markDownloadAborted(model.model_id);
              }
            });

            setItemIdToExpandedRowMap((prev) => {
              const newMap = { ...prev };
              modelsToDelete.forEach((model) => {
                delete newMap[model.model_id];
              });
              return newMap;
            });

            setModelsToDelete([]);

            if (refreshList) {
              trainedModelsService.fetchModels();
            }
          }}
          models={modelsToDelete}
        />
      )}
      {modelToTest === null ? null : (
        <TestModelAndPipelineCreationFlyout
          model={modelToTest}
          onClose={(refreshList?: boolean) => {
            setModelToTest(null);
            if (refreshList) {
              trainedModelsService.fetchModels();
            }
          }}
        />
      )}
      {dfaModelToTest === null ? null : (
        <TestDfaModelsFlyout model={dfaModelToTest} onClose={setDfaModelToTest.bind(null, null)} />
      )}
      {modelToDeploy !== undefined ? (
        <AddInferencePipelineFlyout
          onClose={setModelToDeploy.bind(null, undefined)}
          model={modelToDeploy}
        />
      ) : null}
      {isAddModelFlyoutVisible ? (
        <AddModelFlyout
          modelDownloads={items.filter(isModelDownloadItem)}
          onClose={setIsAddModelFlyoutVisible.bind(null, false)}
          onSubmit={(modelId) => {
            onModelDownloadRequest(modelId);
            setIsAddModelFlyoutVisible(false);
          }}
        />
      ) : null}
    </>
  );
};
