/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  EuiPageBody,
  EuiPageHeader,
  EuiSpacer,
  EuiPageSection,
  EuiPage,
  EuiFlexItem,
  EuiFormRow,
  EuiTextArea,
  EuiText,
  EuiLink,
} from '@elastic/eui';
import {
  ActionType,
  TriggersAndActionsUIPublicPluginStart,
} from '@kbn/triggers-actions-ui-plugin/public';
import { CoreStart, HttpSetup } from '@kbn/core/public';
import {
  ConnectorAddModal,
  loadActionTypes,
} from '@kbn/triggers-actions-ui-plugin/public/common/constants';
import { i18n } from '@kbn/i18n';
import { SetupConnector } from './components/setup_connector';
import { ListConnectors } from './components/list_connector';
import { StreamingResponse } from './components/streaming_response';

const width = 800;

export interface GenAiStreamingResponseExampleAppParams {
  http: CoreStart['http'];
  triggersActionsUi: TriggersAndActionsUIPublicPluginStart;
}

export interface LoadConnectorResult {
  id: string;
  actionTypeId: string;
  name: string;
}

const loadGenAiConnectors = async ({
  http,
}: {
  http: HttpSetup;
}): Promise<LoadConnectorResult[]> => {
  return await http.get(`/internal/examples/get_gen_ai_connectors`);
};

export const GenAiStreamingResponseExampleApp = ({
  http,
  triggersActionsUi,
}: GenAiStreamingResponseExampleAppParams) => {
  const { actionTypeRegistry } = triggersActionsUi;
  const [genAiConnectorType, setGenAiConnectorType] = useState<ActionType>({
    enabledInConfig: true,
    enabledInLicense: true,
    isSystemActionType: false,
    minimumLicenseRequired: 'platinum',
    supportedFeatureIds: ['general'],
    id: '.gen-ai',
    name: 'Generative AI',
    enabled: true,
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [connectors, setConnectors] = useState<LoadConnectorResult[]>([]);
  const [hasGenAiConnectors, setHasGenAiConnectors] = useState<boolean>(false);
  const [isConnectorModalVisible, setIsConnectorModalVisible] = useState<boolean>(false);
  const [selectedConnectorId, setSelectedConnectorId] = useState<string>('');
  const [prompt, setPrompt] = useState<string>();

  const getConnectors = useCallback(async () => {
    const result = await loadGenAiConnectors({ http });
    setConnectors(result);
    setHasGenAiConnectors(result.length > 0);
  }, [http, setConnectors, setHasGenAiConnectors]);

  useEffect(() => {
    (async function () {
      const result = await loadActionTypes({ http });
      const ga = result?.find((at) => at.id === '.gen-ai');
      if (ga) {
        setGenAiConnectorType(ga);
      }
    })();
  }, [http, setConnectors]);

  useEffect(() => {
    (async function () {
      await getConnectors();
      setLoading(false);
    })();
  }, [getConnectors]);

  const onPromptChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => setPrompt(e.target.value),
    [setPrompt]
  );

  const clearPrompt = useCallback(() => setPrompt(''), [setPrompt]);

  return (
    <EuiPage>
      <EuiPageBody>
        <EuiSpacer size="xl" />
        <EuiPageHeader
          paddingSize="l"
          restrictWidth={width}
          bottomBorder={`extended`}
          pageTitle={i18n.translate('genAiStreamingResponseExample.app.pageTitle', {
            defaultMessage: 'Gen AI Streaming Response Example',
          })}
        />
        <EuiPageSection restrictWidth={width} color={`plain`} grow={true}>
          {!loading && (
            <>
              {hasGenAiConnectors ? (
                <ListConnectors
                  connectors={connectors}
                  onConnectorSelect={setSelectedConnectorId}
                  setIsConnectorModalVisible={setIsConnectorModalVisible}
                />
              ) : (
                <SetupConnector setIsConnectorModalVisible={setIsConnectorModalVisible} />
              )}
              {isConnectorModalVisible && (
                <ConnectorAddModal
                  actionType={genAiConnectorType}
                  onClose={async () => {
                    // refetch the connectors
                    await getConnectors();
                    setIsConnectorModalVisible(false);
                  }}
                  actionTypeRegistry={actionTypeRegistry}
                />
              )}
              {selectedConnectorId.length > 0 && (
                <>
                  <EuiSpacer size="xl" />
                  <EuiFlexItem>
                    <EuiFormRow
                      fullWidth
                      label={i18n.translate('genAiStreamingResponseExample.app.userPromptLabel', {
                        defaultMessage: 'Enter a prompt',
                      })}
                      labelAppend={
                        <EuiText size="xs">
                          <EuiLink onClick={clearPrompt}>
                            {i18n.translate(
                              'genAiStreamingResponseExample.app.component.userPromptLabelAppend',
                              {
                                defaultMessage: 'Clear prompt',
                              }
                            )}
                          </EuiLink>
                        </EuiText>
                      }
                    >
                      <EuiTextArea
                        placeholder={i18n.translate(
                          'genAiStreamingResponseExample.app.component.textPlaceholder',
                          {
                            defaultMessage: 'Ask a question and get a streaming response',
                          }
                        )}
                        value={prompt}
                        fullWidth
                        onChange={onPromptChange}
                      />
                    </EuiFormRow>
                  </EuiFlexItem>
                  <EuiSpacer size={'m'} />
                  <EuiFlexItem>
                    {prompt && selectedConnectorId.length > 0 && (
                      <StreamingResponse
                        http={http}
                        prompt={prompt}
                        selectedConnectorId={selectedConnectorId}
                      />
                    )}
                  </EuiFlexItem>
                </>
              )}
            </>
          )}
        </EuiPageSection>
      </EuiPageBody>
    </EuiPage>
  );
};
