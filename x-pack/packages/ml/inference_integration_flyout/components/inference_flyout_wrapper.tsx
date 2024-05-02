/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiFlyout,
  EuiFlyoutHeader,
  EuiTab,
  EuiTitle,
  EuiTabs,
  EuiFlyoutBody,
  EuiSpacer,
  EuiFlyoutFooter,
  EuiButtonEmpty,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { InferenceTaskType } from '@elastic/elasticsearch/lib/api/types';
import type { ModelConfig, Tab } from '../types';
import { TabType } from '../types';
import { ElandPythonClient } from './eland_python_client';
import { ConnectToApi } from './connect_to_api';
import { ElasticsearchModels } from './elasticsearch_models';
import { flyoutHeaderDescriptions } from '../lib/shared_values';
const tabs: Tab[] = [
  {
    id: TabType.elasticsearch_models,
    name: i18n.translate('xpack.ml.inferenceFlyoutWrapper.elasticsearchModelsTabTitle', {
      defaultMessage: 'Elasticsearch models',
    }),
  },
  {
    id: TabType.connect_to_api,
    name: i18n.translate('xpack.ml.inferenceFlyoutWrapper.connectToAPITabTitle', {
      defaultMessage: 'Connect to API',
    }),
  },
  {
    id: TabType.eland_python_client,
    name: i18n.translate('xpack.ml.inferenceFlyoutWrapper.elandPythonClientTabTitle', {
      defaultMessage: 'Eland Python Client',
    }),
  },
];
interface TabProps {
  setActiveTab: (id: TabType) => void;
  activeTab: TabType;
  setInferenceEndpointError: (error: string | undefined) => void;
}
const InferenceEndpointFlyoutTabs: React.FunctionComponent<TabProps> = React.memo(
  ({ setActiveTab, activeTab, setInferenceEndpointError }) => {
    return (
      <EuiTabs>
        {tabs.map((tab) => (
          <EuiTab
            onClick={() => {
              setActiveTab(tab.id);
              setInferenceEndpointError(undefined);
            }}
            isSelected={tab.id === activeTab}
            key={tab.id}
            data-test-subj={`${tab.id}Tab`}
          >
            {tab.name}
          </EuiTab>
        ))}
      </EuiTabs>
    );
  }
);
export interface SaveMappingOnClick {
  onSaveInferenceEndpoint: (
    inferenceId: string,
    taskType: InferenceTaskType,
    modelConfig: ModelConfig
  ) => void;
  isCreateInferenceApiLoading: boolean;
}
export interface DocumentationProps {
  elserv2documentationUrl?: string;
  e5documentationUrl?: string;
  supportedNlpModels?: string;
  nlpImportModel?: string;
}
export interface InferenceFlyoutProps extends SaveMappingOnClick, DocumentationProps {
  onFlyoutClose: (value: boolean) => void;
  isInferenceFlyoutVisible: boolean;
  errorCallout?: JSX.Element | '';
  trainedModels: string[];
  onInferenceEndpointChange: (inferenceId: string) => void;
  inferenceEndpointError?: string;
  setInferenceEndpointError: (error: string | undefined) => void;
}
export const InferenceFlyoutWrapper: React.FC<InferenceFlyoutProps> = ({
  onSaveInferenceEndpoint,
  onFlyoutClose,
  isInferenceFlyoutVisible,
  e5documentationUrl = '',
  elserv2documentationUrl = '',
  supportedNlpModels = '',
  nlpImportModel = '',
  errorCallout,
  trainedModels = [],
  isCreateInferenceApiLoading,
  onInferenceEndpointChange,
  inferenceEndpointError = undefined,
  setInferenceEndpointError,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>(TabType.elasticsearch_models);
  const tabToInferenceContentMap: Record<TabType, React.ReactNode> = {
    elasticsearch_models: (
      <ElasticsearchModels
        description={flyoutHeaderDescriptions[activeTab].description}
        e5documentationUrl={e5documentationUrl}
        elserv2documentationUrl={elserv2documentationUrl}
        onSaveInferenceEndpoint={onSaveInferenceEndpoint}
        isCreateInferenceApiLoading={isCreateInferenceApiLoading}
        trainedModels={trainedModels}
        onInferenceEndpointChange={onInferenceEndpointChange}
        inferenceEndpointError={inferenceEndpointError}
      />
    ),
    connect_to_api: (
      <ConnectToApi
        description={flyoutHeaderDescriptions[activeTab].description}
        onSaveInferenceEndpoint={onSaveInferenceEndpoint}
        isCreateInferenceApiLoading={isCreateInferenceApiLoading}
        onInferenceEndpointChange={onInferenceEndpointChange}
        inferenceEndpointError={inferenceEndpointError}
      />
    ),
    eland_python_client: (
      <ElandPythonClient supportedNlpModels={supportedNlpModels} nlpImportModel={nlpImportModel} />
    ),
  };
  const tabContent = tabToInferenceContentMap[activeTab];
  const content: React.ReactNode = (
    <>
      {errorCallout}
      <InferenceEndpointFlyoutTabs
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        setInferenceEndpointError={setInferenceEndpointError}
      />

      <EuiSpacer size="l" />
      {tabContent}
    </>
  );
  return (
    <EuiFlyout
      onClose={() => onFlyoutClose(!isInferenceFlyoutVisible)}
      data-test-subj="addInferenceEndpoint"
      ownFocus
    >
      <EuiFlyoutHeader>
        <EuiTitle size="m" data-test-subj="addInferenceEndpointTitle">
          <h2>
            <FormattedMessage
              id="xpack.ml.addInferenceEndpoint.header.title"
              defaultMessage="Add inference endpoint"
            />
          </h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody data-test-subj="inference_endpoint_content">{content}</EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiButtonEmpty
          onClick={() => onFlyoutClose(!isInferenceFlyoutVisible)}
          data-test-subj="closeInferenceFlyout"
        >
          {i18n.translate('xpack.ml.addInferenceEndpoint.footer.cancel', {
            defaultMessage: 'Cancel',
          })}
        </EuiButtonEmpty>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};
