/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
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
import type { GroupedInferenceEndpointsData } from '../../types';
import { ModelEndpointRow } from './model_endpoint_row';

export interface ModelDetailFlyoutProps {
  modelGroup: GroupedInferenceEndpointsData;
  onClose: () => void;
  onAddEndpoint: () => void;
  onViewEndpoint: (endpoint: InferenceAPIConfigResponse) => void;
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
  modelGroup,
  onClose,
  onAddEndpoint,
  onViewEndpoint,
  onCopyEndpointId,
}) => {
  const flyoutTitleId = useGeneratedHtmlId();

  const firstEndpoint = modelGroup.endpoints[0];
  const serviceDisplayName = firstEndpoint ? getServiceDisplayName(firstEndpoint.service) : '';
  const uniqueTaskTypes = [...new Set(modelGroup.endpoints.map((e) => e.task_type))];

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
          <h2 id={flyoutTitleId}>{modelGroup.groupLabel}</h2>
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
                  onClick={onAddEndpoint}
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
              {modelGroup.endpoints.map((endpoint, index) => (
                <React.Fragment key={endpoint.inference_id}>
                  <ModelEndpointRow
                    endpoint={endpoint}
                    onView={onViewEndpoint}
                    onCopy={onCopyEndpointId}
                  />
                  {index !== modelGroup.endpoints.length - 1 && <EuiHorizontalRule margin="none" />}
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
    </EuiFlyout>
  );
};
