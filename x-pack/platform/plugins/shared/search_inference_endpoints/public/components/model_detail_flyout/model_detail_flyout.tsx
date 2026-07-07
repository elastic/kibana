/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  EuiBadge,
  EuiBadgeGroup,
  EuiButtonEmpty,
  EuiDescriptionList,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiHorizontalRule,
  EuiLink,
  EuiSpacer,
  EuiSplitPanel,
  EuiTitle,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { InferenceAPIConfigResponse } from '@kbn/ml-trained-models-utils';

import { TASK_TYPE_DESCRIPTIONS } from '@kbn/inference-endpoint-ui-common';
import { docLinks } from '../../../common/doc_links';
import {
  isInferenceEndpointWithMetadata,
  isInferenceEndpointWithDisplayNameMetadata,
  isInferenceEndpointWithDisplayCreatorMetadata,
} from '../../../common/type_guards';
import { getModelId } from '../../utils/get_model_id';
import { AddEndpointModal } from './add_endpoint_modal';
import { ModelEndpointRow } from './model_endpoint_row';
import { useUsageTracker } from '../../contexts/usage_tracker_context';
import { EventType } from '../../analytics/constants';
import { getModelEOLDate, getModelReleaseDate, getModelStatus } from '../../utils/eis_utils';
import { EisModelStatus } from '../../types';
import { ModelStatusBadge } from '../model_status/model_status_badge';

export interface ModelDetailFlyoutProps {
  modelId: string;
  allEndpoints: InferenceAPIConfigResponse[];
  onClose: () => void;
  onSaveEndpoint: () => void;
  onDeleteEndpoint?: (endpoint: InferenceAPIConfigResponse) => void;
  onCopyEndpointId: (id: string) => void;
  canManage?: boolean;
}

export const ModelDetailFlyout: React.FC<ModelDetailFlyoutProps> = ({
  modelId,
  allEndpoints,
  onClose,
  onSaveEndpoint,
  onDeleteEndpoint,
  onCopyEndpointId,
  canManage = true,
}) => {
  const flyoutTitleId = useGeneratedHtmlId();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEndpoint, setEditingEndpoint] = useState<InferenceAPIConfigResponse | undefined>();
  const usageTracker = useUsageTracker();

  useEffect(() => {
    usageTracker.load([EventType.EIS_MODEL_VIEWED, `${EventType.EIS_MODEL_VIEWED}_${modelId}`]);
  }, [usageTracker, modelId]);

  const {
    endpoints,
    displayName,
    modelAuthor,
    modelStatus,
    modelMetadata,
    modelReleaseDate,
    modelEOLDate,
  } = useMemo(() => {
    const filtered = allEndpoints.filter((ep) => getModelId(ep) === modelId);

    const endpointWithName = filtered.find(isInferenceEndpointWithDisplayNameMetadata);
    const endpointWithCreator = filtered.find(isInferenceEndpointWithDisplayCreatorMetadata);
    const endpointModelMetadata = filtered.find(isInferenceEndpointWithMetadata)?.metadata;

    return {
      endpoints: filtered,
      displayName: endpointWithName ? endpointWithName.metadata.display.name : modelId,
      modelAuthor: endpointWithCreator
        ? endpointWithCreator.metadata.display.model_creator
        : i18n.translate('xpack.searchInferenceEndpoints.modelDetailFlyout.unknownAuthor', {
            defaultMessage: 'Unknown',
          }),
      modelStatus: getModelStatus(endpointModelMetadata),
      modelMetadata: endpointModelMetadata,
      modelReleaseDate: getModelReleaseDate(endpointModelMetadata)?.format('l') ?? '--',
      modelEOLDate: getModelEOLDate(endpointModelMetadata)?.format('l') ?? '--',
    };
  }, [allEndpoints, modelId]);

  const { taskTypeOptions, uniqueTaskTypes } = useMemo(() => {
    const taskTypes = [...new Set(endpoints.map((e) => e.task_type))];
    return {
      uniqueTaskTypes: taskTypes,
      taskTypeOptions: taskTypes.map((tt) => ({
        value: tt,
        label: tt,
        description: TASK_TYPE_DESCRIPTIONS[tt] ?? '',
      })),
    };
  }, [endpoints]);

  const handleOpenAddModal = useCallback(() => {
    usageTracker.count([EventType.MODAL_OPENED, `${EventType.MODAL_OPENED}_add_endpoint`]);
    setEditingEndpoint(undefined);
    setIsModalOpen(true);
  }, [usageTracker]);

  const handleOpenEditModal = useCallback(
    (endpoint: InferenceAPIConfigResponse) => {
      usageTracker.count([EventType.MODAL_OPENED, `${EventType.MODAL_OPENED}_edit_endpoint`]);
      setEditingEndpoint(endpoint);
      setIsModalOpen(true);
    },
    [usageTracker]
  );

  const handleCloseModal = useCallback(() => {
    const modalKind = editingEndpoint ? 'edit_endpoint' : 'add_endpoint';
    usageTracker.count([EventType.MODAL_CLOSED, `${EventType.MODAL_CLOSED}_${modalKind}`]);
    setIsModalOpen(false);
    setEditingEndpoint(undefined);
  }, [usageTracker, editingEndpoint]);

  const descriptionListItems = [
    {
      title: i18n.translate('xpack.searchInferenceEndpoints.modelDetailFlyout.modelAuthorLabel', {
        defaultMessage: 'Model author',
      }),
      description: modelAuthor,
    },
    {
      title: i18n.translate('xpack.searchInferenceEndpoints.modelDetailFlyout.modelReleaseDate', {
        defaultMessage: 'Release date',
      }),
      description: modelReleaseDate,
    },
    {
      title: i18n.translate('xpack.searchInferenceEndpoints.modelDetailFlyout.modelEndOfLifeDate', {
        defaultMessage: 'End-of-life date',
      }),
      description: modelEOLDate,
    },
    {
      title: i18n.translate('xpack.searchInferenceEndpoints.modelDetailFlyout.documentationLabel', {
        defaultMessage: 'Documentation',
      }),
      description: (
        <EuiLink
          data-test-subj="searchInferenceEndpointsModelDetailFlyoutViewDocumentationLink"
          href={docLinks.elasticInferenceService}
          target="_blank"
          external
        >
          {i18n.translate(
            'xpack.searchInferenceEndpoints.modelDetailFlyout.viewDocumentationLink',
            { defaultMessage: 'View documentation' }
          )}
        </EuiLink>
      ),
    },
  ];

  return (
    <EuiFlyout
      onClose={onClose}
      size="m"
      aria-labelledby={flyoutTitleId}
      data-test-subj="modelDetailFlyout"
    >
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2 id={flyoutTitleId}>{displayName}</h2>
        </EuiTitle>
        <EuiSpacer size="xs" />
        <EuiBadgeGroup data-test-subj="flyoutTaskBadges">
          <ModelStatusBadge id={modelId} status={modelStatus} metadata={modelMetadata} />
          {uniqueTaskTypes.map((taskType) => (
            <EuiBadge key={taskType}>{taskType}</EuiBadge>
          ))}
        </EuiBadgeGroup>
      </EuiFlyoutHeader>

      <EuiFlyoutBody>
        <EuiDescriptionList
          type="column"
          compressed
          columnGutterSize="m"
          listItems={descriptionListItems}
          data-test-subj="flyoutModelDetails"
        />

        <EuiHorizontalRule margin="xxl" />

        <EuiFlexGroup direction="column" gutterSize="s">
          <EuiFlexItem>
            <EuiFlexGroup justifyContent="spaceBetween" alignItems="center" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiTitle size="xxs">
                  <h3>
                    {i18n.translate(
                      'xpack.searchInferenceEndpoints.modelDetailFlyout.modelEndpointsTitle',
                      { defaultMessage: 'Model endpoints' }
                    )}
                  </h3>
                </EuiTitle>
              </EuiFlexItem>
              {canManage && (
                <EuiFlexItem grow={false}>
                  <EuiButtonEmpty
                    size="s"
                    iconType="plusInCircle"
                    color="text"
                    onClick={handleOpenAddModal}
                    disabled={modelStatus === EisModelStatus.DeprecatedEOL}
                    data-test-subj="modelDetailFlyoutAddEndpointButton"
                  >
                    {i18n.translate(
                      'xpack.searchInferenceEndpoints.modelDetailFlyout.addEndpointButton',
                      { defaultMessage: 'Add endpoint' }
                    )}
                  </EuiButtonEmpty>
                </EuiFlexItem>
              )}
            </EuiFlexGroup>
          </EuiFlexItem>

          <EuiFlexItem>
            <EuiSplitPanel.Outer hasBorder>
              {endpoints.map((endpoint, index) => (
                <React.Fragment key={endpoint.inference_id}>
                  <ModelEndpointRow
                    endpoint={endpoint}
                    onView={handleOpenEditModal}
                    onCopy={onCopyEndpointId}
                    onDelete={canManage ? onDeleteEndpoint : undefined}
                  />
                  {index !== endpoints.length - 1 && <EuiHorizontalRule margin="none" />}
                </React.Fragment>
              ))}
            </EuiSplitPanel.Outer>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutBody>

      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="flexEnd">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty onClick={onClose} data-test-subj="modelDetailFlyoutCloseButton">
              {i18n.translate('xpack.searchInferenceEndpoints.modelDetailFlyout.closeButton', {
                defaultMessage: 'Close',
              })}
            </EuiButtonEmpty>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
      {isModalOpen && (
        <AddEndpointModal
          mode={editingEndpoint ? 'view' : 'add'}
          modelId={modelId}
          taskTypes={taskTypeOptions}
          initialEndpointId={editingEndpoint?.inference_id}
          initialTaskType={editingEndpoint?.task_type}
          onSave={onSaveEndpoint}
          onCancel={handleCloseModal}
        />
      )}
    </EuiFlyout>
  );
};
