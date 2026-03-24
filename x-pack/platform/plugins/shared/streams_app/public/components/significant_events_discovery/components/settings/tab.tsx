/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
import { useLoadConnectors } from '@kbn/inference-connectors';
import {
  GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR,
  GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR_DEFAULT_ONLY,
} from '@kbn/management-settings-ids';
import {
  DEFAULT_INDEX_PATTERNS,
  STREAMS_SIG_EVENTS_DISCOVERY_INFERENCE_FEATURE_ID,
  STREAMS_SIG_EVENTS_KI_EXTRACTION_INFERENCE_FEATURE_ID,
  STREAMS_SIG_EVENTS_KI_QUERY_GENERATION_INFERENCE_FEATURE_ID,
} from '@kbn/streams-schema';
import { useKibana } from '../../../../hooks/use_kibana';
import { useStreamsAppFetch } from '../../../../hooks/use_streams_app_fetch';

const NOT_SET_VALUE = '';

const NO_DEFAULT_CONNECTOR = 'NO_DEFAULT_CONNECTOR';

function toFormValue(saved: string | undefined): string {
  return saved ?? NOT_SET_VALUE;
}

const GEN_AI_SETTINGS_PATH = '/ai/genAiSettings';

function buildConnectorSelectOptions(connectors: { id: string; name: string }[] | undefined) {
  return [
    {
      value: NOT_SET_VALUE,
      text: i18n.translate('xpack.streams.significantEventsDiscovery.settings.useDefaultOption', {
        defaultMessage: 'Use default (genAiSettings:defaultAIConnector)',
      }),
    },
    ...(connectors ?? []).map((c) => ({ value: c.id, text: c.name })),
  ];
}

function isSavedConnectorStale(
  savedId: string | undefined,
  connectors: { id: string }[] | undefined
): boolean {
  if (!savedId || connectors === undefined) {
    return false;
  }
  return !connectors.some((c) => c.id === savedId);
}

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

  const kiExtractionConnectors = useLoadConnectors({
    http: core.http,
    settings: core.settings,
    featureId: STREAMS_SIG_EVENTS_KI_EXTRACTION_INFERENCE_FEATURE_ID,
    toasts: core.notifications.toasts,
  });

  const kiQueryGenerationConnectors = useLoadConnectors({
    http: core.http,
    settings: core.settings,
    featureId: STREAMS_SIG_EVENTS_KI_QUERY_GENERATION_INFERENCE_FEATURE_ID,
    toasts: core.notifications.toasts,
  });

  const discoveryConnectors = useLoadConnectors({
    http: core.http,
    settings: core.settings,
    featureId: STREAMS_SIG_EVENTS_DISCOVERY_INFERENCE_FEATURE_ID,
    toasts: core.notifications.toasts,
  });

  const defaultConnectorSetting = core.uiSettings.get<string>(GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR);
  const defaultConnectorOnly = core.uiSettings.get<boolean>(
    GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR_DEFAULT_ONLY,
    false
  );
  const defaultConnector =
    defaultConnectorSetting && defaultConnectorSetting !== NO_DEFAULT_CONNECTOR
      ? defaultConnectorSetting
      : undefined;

  const settingsFetch = useStreamsAppFetch(
    async ({ signal }) =>
      streams.streamsRepositoryClient.fetch('GET /internal/streams/_significant_events/settings', {
        signal,
      }),
    [streams.streamsRepositoryClient]
  );

  const [kiExtraction, setKiExtraction] = useState<string>('');
  const [kiQueryGeneration, setKiQueryGeneration] = useState<string>('');
  const [discovery, setDiscovery] = useState<string>('');
  const [indexPatterns, setIndexPatterns] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<Error | null>(null);

  // Initialize form from API (undefined or '' = not set, string = connector id)
  useEffect(() => {
    if (!settingsFetch.value) return;
    const v = settingsFetch.value;
    setKiExtraction(toFormValue(v.connectorIdKnowledgeIndicatorExtraction));
    setKiQueryGeneration(toFormValue(v.connectorIdRuleGeneration));
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
              connectorIdKnowledgeIndicatorExtraction: kiExtraction,
              connectorIdRuleGeneration: kiQueryGeneration,
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
    kiExtraction,
    kiQueryGeneration,
    discovery,
    indexPatterns,
    settingsFetch,
  ]);

  const kiExtractionConnectorSelectOptions = useMemo(
    () => buildConnectorSelectOptions(kiExtractionConnectors.data),
    [kiExtractionConnectors.data]
  );
  const kiQueryGenerationConnectorSelectOptions = useMemo(
    () => buildConnectorSelectOptions(kiQueryGenerationConnectors.data),
    [kiQueryGenerationConnectors.data]
  );
  const discoveryConnectorSelectOptions = useMemo(
    () => buildConnectorSelectOptions(discoveryConnectors.data),
    [discoveryConnectors.data]
  );

  const connectorsLoading =
    kiExtractionConnectors.isLoading ||
    kiQueryGenerationConnectors.isLoading ||
    discoveryConnectors.isLoading;

  const showStaleSavedConnectorCallout = useMemo(() => {
    const v = settingsFetch.value;
    if (!v) {
      return false;
    }
    return (
      isSavedConnectorStale(
        v.connectorIdKnowledgeIndicatorExtraction,
        kiExtractionConnectors.data
      ) ||
      isSavedConnectorStale(v.connectorIdRuleGeneration, kiQueryGenerationConnectors.data) ||
      isSavedConnectorStale(v.connectorIdDiscovery, discoveryConnectors.data)
    );
  }, [
    settingsFetch.value,
    kiExtractionConnectors.data,
    kiQueryGenerationConnectors.data,
    discoveryConnectors.data,
  ]);

  if (settingsFetch.loading && !settingsFetch.value) {
    return <EuiLoadingElastic />;
  }

  const hasDefaultConnector = Boolean(defaultConnector);
  const anyUsesDefault =
    kiExtraction === NOT_SET_VALUE ||
    kiQueryGeneration === NOT_SET_VALUE ||
    discovery === NOT_SET_VALUE;
  const showNoDefaultCallout =
    !connectorsLoading && !hasDefaultConnector && !defaultConnectorOnly && anyUsesDefault;

  return (
    <EuiPanel paddingSize="l">
      <EuiTitle size="s">
        <h2>
          {i18n.translate('xpack.streams.significantEventsDiscovery.settings.title', {
            defaultMessage: 'Model selection',
          })}
        </h2>
      </EuiTitle>
      <EuiSpacer size="m" />
      {showStaleSavedConnectorCallout && (
        <>
          <EuiCallOut
            announceOnMount
            title={i18n.translate(
              'xpack.streams.significantEventsDiscovery.settings.staleConnectorTitle',
              {
                defaultMessage: 'Saved model is no longer available for this task',
              }
            )}
            color="warning"
            iconType="warning"
            data-test-subj="streams-settings-stale-connector-callout"
          >
            <p>
              {i18n.translate(
                'xpack.streams.significantEventsDiscovery.settings.staleConnectorDescription',
                {
                  defaultMessage:
                    'A previously selected connector is not in the current list for this feature (for example after Model Settings changed). Choose a model below or use the default, then save.',
                }
              )}
            </p>
          </EuiCallOut>
          <EuiSpacer size="m" />
        </>
      )}
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
                options={kiExtractionConnectorSelectOptions}
                value={kiExtraction}
                onChange={(e) => setKiExtraction(e.target.value)}
                isLoading={connectorsLoading}
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
                options={kiQueryGenerationConnectorSelectOptions}
                value={kiQueryGeneration}
                onChange={(e) => setKiQueryGeneration(e.target.value)}
                isLoading={connectorsLoading}
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
                options={discoveryConnectorSelectOptions}
                value={discovery}
                onChange={(e) => setDiscovery(e.target.value)}
                isLoading={connectorsLoading}
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
                  isDisabled={connectorsLoading}
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
