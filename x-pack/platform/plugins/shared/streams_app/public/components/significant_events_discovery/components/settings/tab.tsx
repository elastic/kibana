/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  EuiButton,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  EuiFormRow,
  EuiLink,
  EuiLoadingElastic,
  EuiPanel,
  EuiSelect,
  EuiSpacer,
  EuiTextArea,
  EuiTitle,
} from '@elastic/eui';
import { useAbortController } from '@kbn/react-hooks';
import { i18n } from '@kbn/i18n';
import { DEFAULT_INDEX_PATTERNS } from '@kbn/streams-schema';
import { useKibana } from '../../../../hooks/use_kibana';
import { useGenAIConnectors } from '../../../../hooks/use_genai_connectors';
import { useStreamsAppFetch } from '../../../../hooks/use_streams_app_fetch';

const NOT_SET_VALUE = '';

function toFormValue(saved: string | undefined): string {
  return saved ?? NOT_SET_VALUE;
}

const GEN_AI_SETTINGS_PATH = '/ai/genAiSettings';

export function SettingsTab() {
  const {
    dependencies: {
      start: { streams },
    },
    core,
  } = useKibana();

  const genAiSettingsUrl = core.application.getUrlForApp('management', {
    path: GEN_AI_SETTINGS_PATH,
  });

  const { signal: abortSignal } = useAbortController();
  const genAiConnectors = useGenAIConnectors({
    streamsRepositoryClient: streams.streamsRepositoryClient,
    uiSettings: core.uiSettings,
  });

  const defaultConnectorFetch = useStreamsAppFetch(
    async ({ signal }) => {
      if (!genAiConnectors.defaultConnector) return undefined;
      return streams.streamsRepositoryClient.fetch(
        'GET /internal/streams/connectors/{connectorId}',
        { signal, params: { path: { connectorId: genAiConnectors.defaultConnector } } }
      );
    },
    [streams.streamsRepositoryClient, genAiConnectors.defaultConnector]
  );

  const settingsFetch = useStreamsAppFetch(
    async ({ signal }) =>
      streams.streamsRepositoryClient.fetch('GET /internal/streams/_significant_events/settings', {
        signal,
      }),
    [streams.streamsRepositoryClient]
  );

  const [knowledgeIndicatorExtraction, setKnowledgeIndicatorExtraction] = useState<string>('');
  const [ruleGeneration, setRuleGeneration] = useState<string>('');
  const [discovery, setDiscovery] = useState<string>('');
  const [indexPatterns, setIndexPatterns] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<Error | null>(null);

  // Initialize form from API (undefined or '' = not set, string = connector id)
  useEffect(() => {
    if (!settingsFetch.value) return;
    const v = settingsFetch.value;
    setKnowledgeIndicatorExtraction(toFormValue(v.connectorIdKnowledgeIndicatorExtraction));
    setRuleGeneration(toFormValue(v.connectorIdRuleGeneration));
    setDiscovery(toFormValue(v.connectorIdDiscovery));
    setIndexPatterns(v.indexPatterns || DEFAULT_INDEX_PATTERNS);
  }, [settingsFetch.value]);

  const handleSave = useCallback(async () => {
    setSaveError(null);
    setIsSaving(true);
    try {
      await streams.streamsRepositoryClient.fetch(
        'PUT /internal/streams/_significant_events/settings',
        {
          signal: abortSignal,
          params: {
            body: {
              connectorIdKnowledgeIndicatorExtraction: knowledgeIndicatorExtraction,
              connectorIdRuleGeneration: ruleGeneration,
              connectorIdDiscovery: discovery,
              indexPatterns,
            },
          },
        }
      );
      settingsFetch.refresh();
    } catch (err) {
      setSaveError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setIsSaving(false);
    }
  }, [
    streams.streamsRepositoryClient,
    abortSignal,
    knowledgeIndicatorExtraction,
    ruleGeneration,
    discovery,
    indexPatterns,
    settingsFetch,
  ]);

  const connectorOptions = [
    {
      value: NOT_SET_VALUE,
      text: i18n.translate('xpack.streams.significantEventsDiscovery.settings.useDefaultOption', {
        defaultMessage: 'Use default (genAiSettings:defaultAIConnector)',
      }),
    },
    ...(genAiConnectors.connectors ?? []).map((c) => ({ value: c.connectorId, text: c.name })),
  ];

  if (settingsFetch.loading && !settingsFetch.value) {
    return <EuiLoadingElastic />;
  }

  const hasDefaultConnector = Boolean(genAiConnectors.defaultConnector);
  const anyUsesDefault =
    knowledgeIndicatorExtraction === NOT_SET_VALUE ||
    ruleGeneration === NOT_SET_VALUE ||
    discovery === NOT_SET_VALUE;
  const showNoDefaultCallout = !genAiConnectors.loading && !hasDefaultConnector && anyUsesDefault;
  const defaultConnectorName =
    hasDefaultConnector && anyUsesDefault ? defaultConnectorFetch.value?.name : undefined;

  return (
    <EuiPanel paddingSize="l">
      <EuiTitle size="s">
        <h2>
          {i18n.translate('xpack.streams.significantEventsDiscovery.settings.title', {
            defaultMessage: 'Model selection',
          })}
        </h2>
      </EuiTitle>
      {defaultConnectorName && (
        <>
          <EuiSpacer size="m" />
          <p>
            {i18n.translate(
              'xpack.streams.significantEventsDiscovery.settings.defaultConnectorLabel',
              {
                defaultMessage: 'Default connector: {name}',
                values: { name: defaultConnectorName },
              }
            )}
          </p>
        </>
      )}
      <EuiSpacer size="m" />
      {showNoDefaultCallout && (
        <>
          <EuiCallOut
            announceOnMount
            title={i18n.translate(
              'xpack.streams.significantEventsDiscovery.settings.noDefaultConnectorTitle',
              { defaultMessage: 'No default connector configured' }
            )}
            color="warning"
            iconType="warning"
            data-test-subj="streams-settings-no-default-connector-callout"
          >
            <p>
              {i18n.translate(
                'xpack.streams.significantEventsDiscovery.settings.noDefaultConnectorDescription',
                {
                  defaultMessage:
                    'Processes that use "Use default" require a default connector. Open GenAI Settings to configure one.',
                }
              )}{' '}
              <EuiLink href={genAiSettingsUrl} external>
                {i18n.translate(
                  'xpack.streams.significantEventsDiscovery.settings.genAiSettingsLink',
                  { defaultMessage: 'Open GenAI Settings' }
                )}
              </EuiLink>
            </p>
          </EuiCallOut>
          <EuiSpacer size="m" />
        </>
      )}
      <EuiFlexGroup justifyContent="flexStart">
        <EuiFlexItem grow={false} style={{ maxWidth: 480 }}>
          <EuiForm
            component="form"
            onSubmit={(e) => {
              e.preventDefault();
              handleSave();
            }}
          >
            <EuiFormRow
              label={i18n.translate(
                'xpack.streams.significantEventsDiscovery.settings.knowledgeIndicatorExtractionLabel',
                { defaultMessage: 'Knowledge Indicator Feature extraction' }
              )}
              helpText={i18n.translate(
                'xpack.streams.significantEventsDiscovery.settings.knowledgeIndicatorExtractionHelp',
                {
                  defaultMessage: 'Model used to extract knowledge indicators.',
                }
              )}
            >
              <EuiSelect
                data-test-subj="streams-settings-connector-knowledge-indicator-extraction"
                options={connectorOptions}
                value={knowledgeIndicatorExtraction}
                onChange={(e) => setKnowledgeIndicatorExtraction(e.target.value)}
                isLoading={genAiConnectors.loading}
                style={{ minWidth: 280 }}
              />
            </EuiFormRow>
            <EuiFormRow
              label={i18n.translate(
                'xpack.streams.significantEventsDiscovery.settings.ruleGenerationLabel',
                { defaultMessage: 'Knowledge Indicator Query generation' }
              )}
              helpText={i18n.translate(
                'xpack.streams.significantEventsDiscovery.settings.ruleGenerationHelp',
                {
                  defaultMessage: 'Model used for Knowledge Indicator Query generation.',
                }
              )}
            >
              <EuiSelect
                data-test-subj="streams-settings-connector-rule-generation"
                options={connectorOptions}
                value={ruleGeneration}
                onChange={(e) => setRuleGeneration(e.target.value)}
                isLoading={genAiConnectors.loading}
                style={{ minWidth: 280 }}
              />
            </EuiFormRow>
            <EuiFormRow
              label={i18n.translate(
                'xpack.streams.significantEventsDiscovery.settings.discoveryLabel',
                { defaultMessage: 'Discovery & Significant Event generation' }
              )}
              helpText={i18n.translate(
                'xpack.streams.significantEventsDiscovery.settings.discoveryHelp',
                {
                  defaultMessage:
                    'Model used during Discovery phase and Significant Event generation',
                }
              )}
            >
              <EuiSelect
                data-test-subj="streams-settings-connector-discovery"
                options={connectorOptions}
                value={discovery}
                onChange={(e) => setDiscovery(e.target.value)}
                isLoading={genAiConnectors.loading}
                style={{ minWidth: 280 }}
              />
            </EuiFormRow>
            <EuiFormRow
              label={i18n.translate(
                'xpack.streams.significantEventsDiscovery.settings.indexPatternsLabel',
                { defaultMessage: 'Index patterns' }
              )}
              helpText={i18n.translate(
                'xpack.streams.significantEventsDiscovery.settings.indexPatternsHelp',
                {
                  defaultMessage:
                    'Comma-separated list of index patterns to use for feature detection and analysis. Default: logs*',
                }
              )}
            >
              <EuiTextArea
                data-test-subj="streams-settings-index-patterns"
                value={indexPatterns}
                onChange={(e) => setIndexPatterns(e.target.value)}
                placeholder={DEFAULT_INDEX_PATTERNS}
                rows={2}
                style={{ minWidth: 280 }}
              />
            </EuiFormRow>
            {saveError && (
              <>
                <EuiSpacer size="s" />
                <EuiFormRow isInvalid error={saveError.message}>
                  <span />
                </EuiFormRow>
              </>
            )}
            <EuiSpacer size="l" />
            <EuiFlexGroup justifyContent="flexEnd">
              <EuiFlexItem grow={false}>
                <EuiButton
                  data-test-subj="streams-settings-save-button"
                  fill
                  onClick={handleSave}
                  isLoading={isSaving}
                  isDisabled={genAiConnectors.loading}
                >
                  {i18n.translate('xpack.streams.significantEventsDiscovery.settings.saveButton', {
                    defaultMessage: 'Save',
                  })}
                </EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiForm>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
}
