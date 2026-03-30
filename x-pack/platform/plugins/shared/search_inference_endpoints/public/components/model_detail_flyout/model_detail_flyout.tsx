/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  EuiBadge,
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

import { docLinks } from '../../../common/doc_links';
import { isEndpointPreconfigured } from '../../utils/preconfigured_endpoint_helper';
import { TASK_TYPE_TOOLTIPS } from '../all_inference_endpoints/render_table_columns/render_endpoint/translations';
import { getModelId } from '../../utils/get_model_id';
import { AddEndpointModal } from './add_endpoint_modal';
import { ModelEndpointRow } from './model_endpoint_row';

export interface ModelDetailFlyoutProps {
  modelId: string;
  allEndpoints: InferenceAPIConfigResponse[];
  onClose: () => void;
  onSaveEndpoint: () => void;
  onDeleteEndpoint: (endpoint: InferenceAPIConfigResponse) => void;
  onCopyEndpointId: (id: string) => void;
}

function getServiceDisplayName(service: string): string {
  const serviceNames: Record<string, string> = {
    elastic: 'Elastic',
    anthropic: 'Anthropic',
    openai: 'OpenAI',
    google_vertex_ai: 'Google',
    azureaistudio: 'Azure AI Studio',
    azureopenai: 'Azure OpenAI',
    cohere: 'Cohere',
    hugging_face: 'Hugging Face',
    mistral: 'Mistral',
    amazon_bedrock: 'Amazon Bedrock',
    watsonx_ai: 'IBM watsonx',
  };
  return serviceNames[service] ?? service;
}

export const ModelDetailFlyout: React.FC<ModelDetailFlyoutProps> = ({
  modelId,
  allEndpoints,
  onClose,
  onSaveEndpoint,
  onDeleteEndpoint,
  onCopyEndpointId,
}) => {
  const flyoutTitleId = useGeneratedHtmlId();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEndpoint, setEditingEndpoint] = useState<InferenceAPIConfigResponse | undefined>();

  const endpoints = useMemo(
    () => allEndpoints.filter((ep) => getModelId(ep) === modelId),
    [allEndpoints, modelId]
  );

  const firstEndpoint = endpoints[0];
  const serviceDisplayName = firstEndpoint ? getServiceDisplayName(firstEndpoint.service) : '';

  const { taskTypeOptions, uniqueTaskTypes } = useMemo(() => {
    const taskTypes = [...new Set(endpoints.map((e) => e.task_type))];
    return {
      uniqueTaskTypes: taskTypes,
      taskTypeOptions: taskTypes.map((tt) => ({
        value: tt,
        label: tt,
        description: TASK_TYPE_TOOLTIPS[tt] ?? '',
      })),
    };
  }, [endpoints]);

  const handleOpenAddModal = useCallback(() => {
    setEditingEndpoint(undefined);
    setIsModalOpen(true);
  }, []);

  const handleOpenEditModal = useCallback((endpoint: InferenceAPIConfigResponse) => {
    setEditingEndpoint(endpoint);
    setIsModalOpen(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false);
    setEditingEndpoint(undefined);
  }, []);

  const descriptionListItems = [
    {
      title: i18n.translate('xpack.searchInferenceEndpoints.modelDetailFlyout.modelAuthorLabel', {
        defaultMessage: 'Model author',
      }),
      description: serviceDisplayName,
    },
    {
      title: i18n.translate('xpack.searchInferenceEndpoints.modelDetailFlyout.documentationLabel', {
        defaultMessage: 'Documentation',
      }),
      description: (
        <EuiLink href={docLinks.elasticInferenceService} target="_blank" external>
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
          <h2 id={flyoutTitleId}>{modelId}</h2>
        </EuiTitle>
        <EuiSpacer size="xs" />
        {uniqueTaskTypes.map((taskType) => (
          <EuiBadge key={taskType}>{taskType}</EuiBadge>
        ))}
      </EuiFlyoutHeader>

      <EuiFlyoutBody>
        <EuiDescriptionList
          type="column"
          compressed
          columnGutterSize="m"
          listItems={descriptionListItems}
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
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty
                  size="s"
                  iconType="plusInCircle"
                  color="text"
                  onClick={handleOpenAddModal}
                  data-test-subj="modelDetailFlyoutAddEndpointButton"
                >
                  {i18n.translate(
                    'xpack.searchInferenceEndpoints.modelDetailFlyout.addEndpointButton',
                    { defaultMessage: 'Add endpoint' }
                  )}
                </EuiButtonEmpty>
              </EuiFlexItem>
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
                    onDelete={onDeleteEndpoint}
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
          mode={editingEndpoint ? 'edit' : 'add'}
          modelId={modelId}
          taskTypes={taskTypeOptions}
          initialEndpointId={editingEndpoint?.inference_id}
          initialTaskType={editingEndpoint?.task_type}
          isPreconfigured={
            editingEndpoint ? isEndpointPreconfigured(editingEndpoint.inference_id) : false
          }
          onSave={onSaveEndpoint}
          onCancel={handleCloseModal}
        />
      )}
    </EuiFlyout>
  );
};
