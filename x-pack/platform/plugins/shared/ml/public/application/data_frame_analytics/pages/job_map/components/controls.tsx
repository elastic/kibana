/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useEffect, useCallback, useMemo, useState } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import moment from 'moment-timezone';
import type { EuiDescriptionListProps } from '@elastic/eui';
import {
  EuiButton,
  EuiCodeBlock,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiDescriptionList,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiFlyoutBody,
  EuiPopover,
  EuiPortal,
  EuiTitle,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { formatHumanReadableDateTimeSeconds } from '@kbn/ml-date-utils';
import { JOB_MAP_NODE_TYPES } from '@kbn/ml-data-frame-analytics-utils';
import { ML_PAGES } from '@kbn/ml-common-types/locator_ml_pages';
import { usePermissionCheck } from '../../../../capabilities/check_capabilities';
import {
  useMlLocator,
  useNotifications,
  useNavigateToPath,
  useMlKibana,
  useMlManagementLocator,
} from '../../../../contexts/kibana';
import { useEnabledFeatures } from '../../../../contexts/ml';
import { useNavigateToWizardWithClonedJob } from '../../analytics_management/components/action_clone/clone_action_name';
import {
  useDeleteAction,
  DeleteActionModal,
} from '../../analytics_management/components/action_delete';
import { DeleteSpaceAwareItemCheckModal } from '../../../../components/delete_space_aware_item_check_modal';
import { useMlIndexUtils } from '../../../../util/index_service';
import type { JobMapNodeData } from '../map_elements_to_flow';
import type { GetDataObjectParameter } from '../use_fetch_analytics_map_data';
import { JOB_MAP_INDEX_PATTERN_TYPE } from '../job_map_flow_constants';

interface Props {
  details: Record<string, any>;
  getNodeData: (params?: GetDataObjectParameter) => void;
  modelId?: string;
  selectedNodeData: JobMapNodeData | undefined;
  onClearSelection: () => void;
  updateElements: (nodeId: string, nodeLabel: string, destIndexNode?: string) => void;
  refreshJobsCallback: () => void;
}

function getListItemsFactory(showLicenseInfo: boolean) {
  return (details: Record<string, unknown>): EuiDescriptionListProps['listItems'] => {
    return Object.entries(details)
      .filter(([key]) => showLicenseInfo || key !== 'license_level')
      .map(([key, value]) => {
        let description: React.ReactNode;
        if (key === 'create_time') {
          description = formatHumanReadableDateTimeSeconds(
            moment(value as moment.MomentInput).unix() * 1000
          );
        } else if (typeof value === 'object') {
          description = (
            <EuiCodeBlock language="json" fontSize="s" paddingSize="s">
              {JSON.stringify(value, null, 2)}
            </EuiCodeBlock>
          );
        } else {
          description = String(value);
        }

        return {
          title: key,
          description,
        };
      });
  };
}

export const JobMapNodeFlyout: FC<Props> = React.memo(
  ({
    details,
    getNodeData,
    modelId,
    refreshJobsCallback,
    selectedNodeData,
    onClearSelection,
    updateElements,
  }) => {
    const [isPopoverOpen, setPopover] = useState<boolean>(false);
    const [didUntag, setDidUntag] = useState<boolean>(false);

    const canCreateDataFrameAnalytics: boolean = usePermissionCheck('canCreateDataFrameAnalytics');
    const canDeleteDataFrameAnalytics: boolean = usePermissionCheck('canDeleteDataFrameAnalytics');
    const deleteAction = useDeleteAction(canDeleteDataFrameAnalytics);
    const { showLicenseInfo } = useEnabledFeatures();
    const getListItems = useMemo(() => getListItemsFactory(showLicenseInfo), [showLicenseInfo]);

    const {
      closeDeleteJobCheckModal,
      deleteItem,
      deleteTargetIndex,
      isModalVisible,
      isDeleteJobCheckModalVisible,
      item,
      jobType,
      openModal,
      openDeleteJobCheckModal,
    } = deleteAction;

    const {
      services: {
        share,
        application: { navigateToUrl, capabilities },
      },
    } = useMlKibana();
    const { getDataViewIdFromName } = useMlIndexUtils();

    const hasIngestPipelinesCapabilities =
      capabilities.management?.ingest?.ingest_pipelines === true;

    const { toasts } = useNotifications();
    const mlLocator = useMlLocator()!;
    const mlManagementLocator = useMlManagementLocator();
    const navigateToPath = useNavigateToPath();
    const navigateToWizardWithClonedJob = useNavigateToWizardWithClonedJob();

    const closePopover = useCallback(() => {
      setPopover(false);
    }, []);

    const onCreateJobClick = useCallback(async () => {
      if (selectedNodeData === undefined) {
        return;
      }
      const dataViewId = await getDataViewIdFromName(selectedNodeData.label);

      if (dataViewId !== null && mlManagementLocator) {
        mlManagementLocator?.navigate({
          sectionId: 'ml',
          appId: `analytics/${ML_PAGES.DATA_FRAME_ANALYTICS_CREATE_JOB}?index=${dataViewId}`,
        });
      } else if (dataViewId === null) {
        toasts.addDanger(
          i18n.translate('xpack.ml.dataframe.analyticsMap.flyout.dataViewMissingMessage', {
            defaultMessage: 'To create a job from this index create a data view for {indexTitle}.',
            values: { indexTitle: selectedNodeData.label },
          })
        );
      }
    }, [getDataViewIdFromName, mlManagementLocator, selectedNodeData, toasts]);

    const onManagePipeline = useCallback(async () => {
      if (selectedNodeData === undefined) {
        return;
      }
      const ingestPipelineLocator = share.url.locators.get('INGEST_PIPELINES_APP_LOCATOR');
      if (ingestPipelineLocator) {
        const path = await ingestPipelineLocator.getUrl({
          page: 'pipeline_list',
        });

        // Passing pipelineId here because pipeline_list is not recognizing pipelineId params
        await navigateToUrl(`${path}/?pipeline=${selectedNodeData.label}`);
      }
    }, [navigateToUrl, selectedNodeData, share.url.locators]);

    const onAnalyzeDataDrift = useCallback(async () => {
      if (selectedNodeData === undefined) {
        return;
      }
      closePopover();
      const path = await mlLocator.getUrl({
        page: ML_PAGES.DATA_DRIFT_CUSTOM,
        pageState: { comparison: selectedNodeData.label },
      });
      await navigateToPath(path);
    }, [closePopover, mlLocator, navigateToPath, selectedNodeData]);

    const onCloneJobClick = useCallback(async () => {
      if (selectedNodeData === undefined) {
        return;
      }
      navigateToWizardWithClonedJob({
        config: details[selectedNodeData.id],
        stats: details[selectedNodeData.id]?.stats,
      });
    }, [details, navigateToWizardWithClonedJob, selectedNodeData]);

    const onActionsButtonClick = () => {
      setPopover((prev) => !prev);
    };

    useEffect(
      function updateElementsOnClose() {
        if (selectedNodeData === undefined) {
          return;
        }
        if ((isModalVisible === false && deleteItem === true) || didUntag === true) {
          let destIndexNode;
          if (deleteTargetIndex === true || didUntag === true) {
            const jobDetails = details[selectedNodeData.id];
            const destIndex = jobDetails.dest.index;
            destIndexNode = `${destIndex}-${JOB_MAP_NODE_TYPES.INDEX}`;
          }
          updateElements(selectedNodeData.id, selectedNodeData.label, destIndexNode);
          onClearSelection();
        }
      },
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [isModalVisible, deleteItem, didUntag]
    );

    const flyoutTitleId = useGeneratedHtmlId();

    if (selectedNodeData === undefined) {
      return null;
    }

    const { id: nodeId, label: nodeLabel, type: nodeType } = selectedNodeData;

    const button = (
      <EuiButton
        size="s"
        iconType="chevronSingleDown"
        iconSide="right"
        onClick={onActionsButtonClick}
      >
        <FormattedMessage
          id="xpack.ml.dataframe.analyticsMap.flyout.nodeActionsButton"
          defaultMessage="Node actions"
        />
      </EuiButton>
    );

    const items = [
      ...(nodeType === JOB_MAP_NODE_TYPES.ANALYTICS
        ? [
            <EuiContextMenuItem
              key={`${nodeId}-delete`}
              icon="trash"
              disabled={!canDeleteDataFrameAnalytics}
              onClick={() => {
                openDeleteJobCheckModal({ config: details[nodeId], stats: details[nodeId]?.stats });
              }}
            >
              <FormattedMessage
                id="xpack.ml.dataframe.analyticsMap.flyout.deleteJobButton"
                defaultMessage="Delete job"
              />
            </EuiContextMenuItem>,
            <EuiContextMenuItem
              key={`${nodeId}-clone`}
              icon="copy"
              disabled={!canCreateDataFrameAnalytics}
              onClick={onCloneJobClick}
            >
              <FormattedMessage
                id="xpack.ml.dataframe.analyticsMap.flyout.cloneJobButton"
                defaultMessage="Clone job"
              />
            </EuiContextMenuItem>,
          ]
        : []),
      ...(nodeType === JOB_MAP_NODE_TYPES.INDEX
        ? [
            <EuiContextMenuItem
              disabled={!canCreateDataFrameAnalytics}
              key={`${nodeId}-drift-data`}
              icon="chartTagCloud"
              onClick={onAnalyzeDataDrift}
            >
              <FormattedMessage
                id="xpack.ml.dataframe.analyticsMap.flyout.analyzeDrift"
                defaultMessage="Analyze data drift"
              />
            </EuiContextMenuItem>,
          ]
        : []),
      ...(nodeType === JOB_MAP_NODE_TYPES.INDEX
        ? [
            <EuiContextMenuItem
              disabled={!canCreateDataFrameAnalytics}
              key={`${nodeId}-create`}
              icon="plusCircle"
              onClick={onCreateJobClick}
            >
              <FormattedMessage
                id="xpack.ml.dataframe.analyticsMap.flyout.createJobButton"
                defaultMessage="Create job from this index"
              />
            </EuiContextMenuItem>,
          ]
        : []),
      ...(modelId !== nodeLabel &&
      (nodeType === JOB_MAP_NODE_TYPES.ANALYTICS || nodeType === JOB_MAP_NODE_TYPES.INDEX)
        ? [
            <EuiContextMenuItem
              key={`${nodeId}-fetch-related`}
              icon="branch"
              onClick={() => {
                getNodeData({ id: nodeLabel, type: nodeType });
                onClearSelection();
                setPopover(false);
              }}
            >
              <FormattedMessage
                id="xpack.ml.dataframe.analyticsMap.flyout.fetchRelatedNodesButton"
                defaultMessage="Fetch related nodes"
              />
            </EuiContextMenuItem>,
          ]
        : []),
      ...(modelId !== nodeLabel &&
      nodeType === JOB_MAP_NODE_TYPES.INGEST_PIPELINE &&
      hasIngestPipelinesCapabilities
        ? [
            <EuiContextMenuItem
              key={`${nodeId}-view-pipeline`}
              icon="pipelineApp"
              onClick={onManagePipeline}
            >
              <FormattedMessage
                id="xpack.ml.dataframe.analyticsMap.flyout.viewIngestPipelineButton"
                defaultMessage="View ingest pipeline"
              />
            </EuiContextMenuItem>,
          ]
        : []),
    ];

    return (
      <EuiPortal>
        <EuiFlyout
          aria-labelledby={flyoutTitleId}
          ownFocus
          size="m"
          onClose={onClearSelection}
          data-test-subj="mlAnalyticsJobMapFlyout"
        >
          <EuiFlyoutHeader>
            <EuiFlexGroup direction="column" gutterSize="xs">
              <EuiFlexItem grow={false}>
                <EuiTitle size="s">
                  <h3 id={flyoutTitleId} data-test-subj="mlDataFrameAnalyticsNodeDetailsTitle">
                    <FormattedMessage
                      id="xpack.ml.dataframe.analyticsMap.flyoutHeaderTitle"
                      defaultMessage="Details for {type} {id}"
                      values={{ id: nodeLabel, type: nodeType }}
                    />
                  </h3>
                </EuiTitle>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlyoutHeader>
          <EuiFlyoutBody>
            <EuiFlexGroup direction="column" gutterSize="s">
              <EuiFlexItem grow={false}>
                <EuiDescriptionList
                  compressed
                  type="column"
                  listItems={
                    nodeType === JOB_MAP_INDEX_PATTERN_TYPE
                      ? getListItems(details[nodeId][nodeLabel])
                      : getListItems(details[nodeId])
                  }
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlyoutBody>
          <EuiFlyoutFooter>
            {nodeType !== JOB_MAP_NODE_TYPES.TRAINED_MODEL && items.length > 0 ? (
              <EuiPopover
                aria-label={i18n.translate(
                  'xpack.ml.dataframe.analyticsMap.flyout.nodeActionsPopoverAria',
                  {
                    defaultMessage: 'Node actions',
                  }
                )}
                button={button}
                isOpen={isPopoverOpen}
                closePopover={closePopover}
                panelPaddingSize="s"
                anchorPosition="downLeft"
              >
                <EuiContextMenuPanel items={items} />
              </EuiPopover>
            ) : null}
          </EuiFlyoutFooter>
        </EuiFlyout>
        {isDeleteJobCheckModalVisible && item && (
          <DeleteSpaceAwareItemCheckModal
            mlSavedObjectType={jobType}
            ids={[item.config.id]}
            onCloseCallback={closeDeleteJobCheckModal}
            canDeleteCallback={() => {
              // Item will always be set by the time we open the delete modal
              openModal(deleteAction.item!);
              closeDeleteJobCheckModal();
            }}
            refreshJobsCallback={refreshJobsCallback}
            setDidUntag={setDidUntag}
          />
        )}
        {isModalVisible && <DeleteActionModal {...deleteAction} />}
      </EuiPortal>
    );
  }
);
