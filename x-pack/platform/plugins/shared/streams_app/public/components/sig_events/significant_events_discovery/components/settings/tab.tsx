/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  EuiBadge,
  EuiBottomBar,
  EuiButton,
  EuiButtonEmpty,
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
  EuiText,
  EuiTextArea,
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
import { useKibana } from '../../../../../hooks/use_kibana';
import { useStreamsAppFetch } from '../../../../../hooks/use_streams_app_fetch';

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

  useEffect(() => {
    if (!settingsFetch.value) return;
    const v = settingsFetch.value;
    setKiExtraction(toFormValue(v.connectorIdKnowledgeIndicatorExtraction));
    setKiQueryGeneration(toFormValue(v.connectorIdRuleGeneration));
    setDiscovery(toFormValue(v.connectorIdDiscovery));
    setIndexPatterns(v.indexPatterns || DEFAULT_INDEX_PATTERNS);
  }, [settingsFetch.value]);

  const hasChanges = useMemo(() => {
    if (!settingsFetch.value) return false;
    const v = settingsFetch.value;
    return (
      kiExtraction !== toFormValue(v.connectorIdKnowledgeIndicatorExtraction) ||
      kiQueryGeneration !== toFormValue(v.connectorIdRuleGeneration) ||
      discovery !== toFormValue(v.connectorIdDiscovery) ||
      indexPatterns !== (v.indexPatterns || DEFAULT_INDEX_PATTERNS)
    );
  }, [settingsFetch.value, kiExtraction, kiQueryGeneration, discovery, indexPatterns]);

  const handleCancel = useCallback(() => {
    if (!settingsFetch.value) return;
    const v = settingsFetch.value;
    setKiExtraction(toFormValue(v.connectorIdKnowledgeIndicatorExtraction));
    setKiQueryGeneration(toFormValue(v.connectorIdRuleGeneration));
    setDiscovery(toFormValue(v.connectorIdDiscovery));
    setIndexPatterns(v.indexPatterns || DEFAULT_INDEX_PATTERNS);
    setSaveError(null);
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
    <>
      <EuiPanel hasBorder={true} hasShadow={false} paddingSize="none" grow={false}>
        <EuiPanel hasShadow={false} color="subdued">
          <EuiText size="s">
            <h3>
              {i18n.translate('xpack.streams.significantEventsDiscovery.settings.llmSectionTitle', {
                defaultMessage: 'LLM selection',
              })}
            </h3>
          </EuiText>
        </EuiPanel>
        <EuiPanel hasShadow={false} hasBorder={false}>
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
          <EuiFlexGroup alignItems="flexStart" gutterSize="l">
            <EuiFlexItem grow={2}>
              <EuiFlexGroup direction="column" gutterSize="xs">
                <EuiFlexItem>
                  <EuiText size="m">
                    <h4>
                      {i18n.translate(
                        'xpack.streams.significantEventsDiscovery.settings.defaultLlmLabel',
                        { defaultMessage: 'Default LLM' }
                      )}
                    </h4>
                  </EuiText>
                </EuiFlexItem>
                <EuiFlexItem>
                  <EuiText color="subdued" size="s">
                    {i18n.translate(
                      'xpack.streams.significantEventsDiscovery.settings.defaultLlmDescription',
                      {
                        defaultMessage:
                          'You can pick one default LLM for all tasks, or specify each per step.',
                      }
                    )}
                  </EuiText>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
            <EuiFlexItem grow={5}>
              <EuiForm component="div">
                <EuiFormRow
                  label={i18n.translate(
                    'xpack.streams.significantEventsDiscovery.settings.knowledgeIndicatorExtractionLabel',
                    { defaultMessage: 'Knowledge Indicator Feature extraction' }
                  )}
                  helpText={i18n.translate(
                    'xpack.streams.significantEventsDiscovery.settings.knowledgeIndicatorExtractionHelp',
                    { defaultMessage: 'Model used to extract knowledge indicators.' }
                  )}
                >
                  <EuiSelect
                    data-test-subj="streams-settings-connector-knowledge-indicator-extraction"
                    options={kiExtractionConnectorSelectOptions}
                    value={kiExtraction}
                    onChange={(e) => setKiExtraction(e.target.value)}
                    isLoading={connectorsLoading}
                  />
                </EuiFormRow>
                <EuiFormRow
                  label={i18n.translate(
                    'xpack.streams.significantEventsDiscovery.settings.ruleGenerationLabel',
                    { defaultMessage: 'Knowledge Indicator Query generation' }
                  )}
                  helpText={i18n.translate(
                    'xpack.streams.significantEventsDiscovery.settings.ruleGenerationHelp',
                    { defaultMessage: 'Model used for Knowledge Indicator Query generation.' }
                  )}
                >
                  <EuiSelect
                    data-test-subj="streams-settings-connector-rule-generation"
                    options={kiQueryGenerationConnectorSelectOptions}
                    value={kiQueryGeneration}
                    onChange={(e) => setKiQueryGeneration(e.target.value)}
                    isLoading={connectorsLoading}
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
                  />
                </EuiFormRow>
              </EuiForm>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiPanel>
      </EuiPanel>

      <EuiSpacer />

      <EuiPanel hasBorder={true} hasShadow={false} paddingSize="none" grow={false}>
        <EuiPanel hasShadow={false} color="subdued">
          <EuiText size="s">
            <h3>
              {i18n.translate(
                'xpack.streams.significantEventsDiscovery.settings.dataSourcesSectionTitle',
                { defaultMessage: 'Data sources' }
              )}
            </h3>
          </EuiText>
        </EuiPanel>
        <EuiPanel hasShadow={false} hasBorder={false}>
          <EuiFlexGroup alignItems="flexStart" gutterSize="l">
            <EuiFlexItem grow={2}>
              <EuiFlexGroup direction="column" gutterSize="xs">
                <EuiFlexItem>
                  <EuiText size="m">
                    <h4>
                      {i18n.translate(
                        'xpack.streams.significantEventsDiscovery.settings.indexPatternsLabel',
                        { defaultMessage: 'Index patterns' }
                      )}
                    </h4>
                  </EuiText>
                </EuiFlexItem>
                <EuiFlexItem>
                  <EuiText color="subdued" size="s">
                    {i18n.translate(
                      'xpack.streams.significantEventsDiscovery.settings.indexPatternsHelp',
                      {
                        defaultMessage:
                          'Comma-separated list of index patterns to use for feature detection and analysis.',
                      }
                    )}{' '}
                    {i18n.translate(
                      'xpack.streams.significantEventsDiscovery.settings.indexPatternsDefault',
                      { defaultMessage: 'Default:' }
                    )}{' '}
                    <EuiBadge color="hollow">{DEFAULT_INDEX_PATTERNS}</EuiBadge>
                  </EuiText>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
            <EuiFlexItem grow={5}>
              <EuiForm component="div">
                <EuiFormRow>
                  <EuiTextArea
                    data-test-subj="streams-settings-index-patterns"
                    value={indexPatterns}
                    onChange={(e) => setIndexPatterns(e.target.value)}
                    placeholder={DEFAULT_INDEX_PATTERNS}
                    rows={2}
                  />
                </EuiFormRow>
              </EuiForm>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiPanel>
      </EuiPanel>

      {saveError && (
        <>
          <EuiSpacer size="m" />
          <EuiCallOut
            title={i18n.translate(
              'xpack.streams.significantEventsDiscovery.settings.saveErrorTitle',
              { defaultMessage: 'Failed to save settings' }
            )}
            color="danger"
            iconType="error"
          >
            <p>{saveError.message}</p>
          </EuiCallOut>
        </>
      )}

      {hasChanges && (
        <EuiBottomBar data-test-subj="streams-significant-events-settings-bottom-bar">
          <EuiFlexGroup justifyContent="flexEnd">
            <EuiFlexItem grow={false}>
              <EuiFlexGroup gutterSize="s">
                <EuiFlexItem grow={false}>
                  <EuiButtonEmpty
                    data-test-subj="streams-settings-cancel-button"
                    color="text"
                    size="s"
                    onClick={handleCancel}
                    isDisabled={isSaving}
                  >
                    {i18n.translate(
                      'xpack.streams.significantEventsDiscovery.settings.cancelButton',
                      { defaultMessage: 'Cancel' }
                    )}
                  </EuiButtonEmpty>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiButton
                    data-test-subj="streams-settings-save-button"
                    color="primary"
                    fill
                    size="s"
                    onClick={handleSave}
                    isLoading={isSaving}
                    isDisabled={connectorsLoading}
                  >
                    {i18n.translate(
                      'xpack.streams.significantEventsDiscovery.settings.saveChangesButton',
                      { defaultMessage: 'Save changes' }
                    )}
                  </EuiButton>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiBottomBar>
      )}
    </>
  );
}
