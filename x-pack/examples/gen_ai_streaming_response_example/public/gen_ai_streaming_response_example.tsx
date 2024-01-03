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
    name: 'OpenAI',
    enabled: true,
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [connectors, setConnectors] = useState<LoadConnectorResult[]>([]);
  const [hasGenAiConnectors, setHasGenAiConnectors] = useState<boolean>(false);
  const [isConnectorModalVisible, setIsConnectorModalVisible] = useState<boolean>(false);
  const [selectedConnectorId, setSelectedConnectorId] = useState<string>('');
  const [prompt, setPrompt] = useState<string>();

  // The refresh behavior is implemented like this:
  //
  // - On refresh the current prompt gets stored in `toBeRefreshedPrompt` and
  //   and then the actual prompt gets cleared. React will rerender and unmount
  //   the `StreamingResponse` component because of the empty prompt.
  // - A `useEffect` then checks if `toBeRefreshedPrompt` is populated
  //   and will apply it to `prompt` again.
  // - In combination with `initialIsOpen=true` this will cause the
  //   `StreamingResponse` component to start fetching a new response
  //   immediately after remounting.
  //
  // This pattern requires a bit more logic in this component but it avoids
  // tight coupling via callbacks of this component and `StreamingResponse`.
  const [toBeRefreshedPrompt, setToBeRefreshedPrompt] = useState<string>();
  const [initialIsOpen, setInitialIsOpen] = useState(false);

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

  const clearPromptHandler = () => {
    setInitialIsOpen(false);
    setPrompt('');
  };

  const refreshPromptHandler = () => {
    setInitialIsOpen(true);
    setToBeRefreshedPrompt(prompt);
    setPrompt('');
  };

  useEffect(() => {
    if (prompt === '' && toBeRefreshedPrompt && toBeRefreshedPrompt !== '') {
      setPrompt(toBeRefreshedPrompt);
      setToBeRefreshedPrompt('');
    }
  }, [prompt, toBeRefreshedPrompt]);

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
                        <>
                          <EuiText size="xs">
                            <EuiLink onClick={clearPromptHandler}>
                              {i18n.translate(
                                'genAiStreamingResponseExample.app.component.userPromptLabelAppendClearPrompt',
                                {
                                  defaultMessage: 'Clear prompt',
                                }
                              )}
                            </EuiLink>{' '}
                            |{' '}
                            <EuiLink onClick={refreshPromptHandler}>
                              {i18n.translate(
                                'genAiStreamingResponseExample.app.component.userPromptLabelAppendRefreshPrompt',
                                {
                                  defaultMessage: 'Refresh prompt',
                                }
                              )}
                            </EuiLink>
                          </EuiText>
                        </>
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
                        initialIsOpen={initialIsOpen}
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
