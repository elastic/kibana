/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEqual } from 'lodash';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  EuiBadge,
  EuiBottomBar,
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiComboBox,
  EuiFieldNumber,
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  EuiFormRow,
  EuiLink,
  EuiLoadingElastic,
  EuiPanel,
  EuiSelect,
  EuiSpacer,
  EuiSwitch,
  EuiText,
  EuiTextArea,
} from '@elastic/eui';
import type { EuiComboBoxOptionOption } from '@elastic/eui';
import { useAbortController } from '@kbn/react-hooks';
import { i18n } from '@kbn/i18n';
import { DEFAULT_INDEX_PATTERNS, Streams } from '@kbn/streams-schema';
import {
  DEFAULT_EXTRACTION_INTERVAL_HOURS,
  MIN_EXTRACTION_INTERVAL_HOURS,
} from '@kbn/streams-plugin/common';
import { useKibana } from '../../../../../hooks/use_kibana';
import { useGenAIConnectors } from '../../../../../hooks/use_genai_connectors';
import { useStreamsAppFetch } from '../../../../../hooks/use_streams_app_fetch';

const NOT_SET_VALUE = '';

const toFormValue = (saved: string | undefined): string => saved ?? NOT_SET_VALUE;

const GEN_AI_SETTINGS_PATH = '/ai/genAiSettings';

export const SettingsTab = () => {
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
  const [continuousExtraction, setContinuousExtraction] = useState({
    enabled: false,
    intervalHours: DEFAULT_EXTRACTION_INTERVAL_HOURS,
    excludedStreams: [] as string[],
  });
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<Error | null>(null);

  const streamsListFetch = useStreamsAppFetch(
    ({ signal }) => {
      if (!continuousExtraction.enabled) {
        return { streams: [] };
      }
      return streams.streamsRepositoryClient.fetch('GET /api/streams 2023-10-31', { signal });
    },
    [streams.streamsRepositoryClient, continuousExtraction.enabled]
  );

  const streamOptions: EuiComboBoxOptionOption[] = useMemo(
    () =>
      (streamsListFetch.value?.streams ?? [])
        .filter((s) => !Streams.QueryStream.Definition.is(s))
        .map((s) => ({ label: s.name })),
    [streamsListFetch.value]
  );

  const savedCE = useMemo(
    () => ({
      enabled: settingsFetch.value?.continuousExtraction?.enabled ?? false,
      intervalHours:
        settingsFetch.value?.continuousExtraction?.intervalHours ??
        DEFAULT_EXTRACTION_INTERVAL_HOURS,
      excludedStreams: settingsFetch.value?.continuousExtraction?.excludedStreams ?? [],
    }),
    [settingsFetch.value]
  );

  useEffect(() => {
    if (!settingsFetch.value) return;
    const v = settingsFetch.value;
    setKnowledgeIndicatorExtraction(toFormValue(v.connectorIdKnowledgeIndicatorExtraction));
    setRuleGeneration(toFormValue(v.connectorIdRuleGeneration));
    setDiscovery(toFormValue(v.connectorIdDiscovery));
    setIndexPatterns(v.indexPatterns || DEFAULT_INDEX_PATTERNS);
    setContinuousExtraction(savedCE);
  }, [settingsFetch.value, savedCE]);

  const hasChanges = useMemo(() => {
    if (!settingsFetch.value) return false;
    const v = settingsFetch.value;
    return (
      knowledgeIndicatorExtraction !== toFormValue(v.connectorIdKnowledgeIndicatorExtraction) ||
      ruleGeneration !== toFormValue(v.connectorIdRuleGeneration) ||
      discovery !== toFormValue(v.connectorIdDiscovery) ||
      indexPatterns !== (v.indexPatterns || DEFAULT_INDEX_PATTERNS) ||
      continuousExtraction.enabled !== savedCE.enabled ||
      continuousExtraction.intervalHours !== savedCE.intervalHours ||
      !isEqual(continuousExtraction.excludedStreams, savedCE.excludedStreams)
    );
  }, [
    settingsFetch.value,
    knowledgeIndicatorExtraction,
    ruleGeneration,
    discovery,
    indexPatterns,
    continuousExtraction,
    savedCE,
  ]);

  const handleCancel = useCallback(() => {
    if (!settingsFetch.value) return;
    const v = settingsFetch.value;
    setKnowledgeIndicatorExtraction(toFormValue(v.connectorIdKnowledgeIndicatorExtraction));
    setRuleGeneration(toFormValue(v.connectorIdRuleGeneration));
    setDiscovery(toFormValue(v.connectorIdDiscovery));
    setIndexPatterns(v.indexPatterns || DEFAULT_INDEX_PATTERNS);
    setContinuousExtraction(savedCE);
    setSaveError(null);
  }, [settingsFetch.value, savedCE]);

  const handleSave = useCallback(async () => {
    setSaveError(null);
    setIsSaving(true);
    try {
      const ceChanged =
        continuousExtraction.enabled !== savedCE.enabled ||
        continuousExtraction.intervalHours !== savedCE.intervalHours ||
        !isEqual(continuousExtraction.excludedStreams, savedCE.excludedStreams);

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
              ...(ceChanged ? { continuousExtraction } : {}),
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
    continuousExtraction,
    savedCE,
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
                    {defaultConnectorName && (
                      <>
                        {' '}
                        {i18n.translate(
                          'xpack.streams.significantEventsDiscovery.settings.defaultConnectorLabel',
                          { defaultMessage: 'Default connector:' }
                        )}{' '}
                        <EuiBadge color="hollow">{defaultConnectorName}</EuiBadge>
                      </>
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
                    options={connectorOptions}
                    value={knowledgeIndicatorExtraction}
                    onChange={(e) => setKnowledgeIndicatorExtraction(e.target.value)}
                    isLoading={genAiConnectors.loading}
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
                    options={connectorOptions}
                    value={ruleGeneration}
                    onChange={(e) => setRuleGeneration(e.target.value)}
                    isLoading={genAiConnectors.loading}
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

      <EuiSpacer />

      <EuiPanel hasBorder={true} hasShadow={false} paddingSize="none" grow={false}>
        <EuiPanel hasShadow={false} color="subdued">
          <EuiText size="s">
            <h3>
              {i18n.translate(
                'xpack.streams.significantEventsDiscovery.settings.continuousExtractionTitle',
                { defaultMessage: 'Continuous KI extraction' }
              )}
            </h3>
          </EuiText>
        </EuiPanel>
        <EuiPanel hasShadow={false} hasBorder={false}>
          {settingsFetch.value?.continuousExtraction?.enabled && (
            <>
              <EuiCallOut
                announceOnMount
                size="s"
                color="success"
                iconType="check"
                title={i18n.translate(
                  'xpack.streams.significantEventsDiscovery.settings.continuousExtractionActiveStatus',
                  {
                    defaultMessage:
                      'Continuous extraction is active. Knowledge indicators are extracted every {hours} hours.',
                    values: {
                      hours:
                        settingsFetch.value?.continuousExtraction?.intervalHours ??
                        DEFAULT_EXTRACTION_INTERVAL_HOURS,
                    },
                  }
                )}
                data-test-subj="streams-settings-continuous-extraction-status"
              />
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
                        'xpack.streams.significantEventsDiscovery.settings.continuousExtractionLabel',
                        { defaultMessage: 'Automatic extraction' }
                      )}
                    </h4>
                  </EuiText>
                </EuiFlexItem>
                <EuiFlexItem>
                  <EuiText color="subdued" size="s">
                    {i18n.translate(
                      'xpack.streams.significantEventsDiscovery.settings.continuousExtractionHelp',
                      {
                        defaultMessage:
                          'When enabled, knowledge indicator extraction runs automatically on managed streams at the configured interval.',
                      }
                    )}
                  </EuiText>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
            <EuiFlexItem grow={5}>
              <EuiForm component="div">
                <EuiFormRow>
                  <EuiSwitch
                    data-test-subj="streams-settings-continuous-extraction-toggle"
                    label={i18n.translate(
                      'xpack.streams.significantEventsDiscovery.settings.enableContinuousExtraction',
                      { defaultMessage: 'Enable continuous KI extraction' }
                    )}
                    checked={continuousExtraction.enabled}
                    onChange={(e) =>
                      setContinuousExtraction((prev) => ({ ...prev, enabled: e.target.checked }))
                    }
                  />
                </EuiFormRow>
                <EuiFormRow
                  label={i18n.translate(
                    'xpack.streams.significantEventsDiscovery.settings.extractionIntervalLabel',
                    { defaultMessage: 'Extraction interval (hours)' }
                  )}
                  helpText={i18n.translate(
                    'xpack.streams.significantEventsDiscovery.settings.extractionIntervalHelp',
                    {
                      defaultMessage:
                        'How often to run KI extraction per stream. Minimum: {min} hour.',
                      values: { min: MIN_EXTRACTION_INTERVAL_HOURS },
                    }
                  )}
                >
                  <EuiFieldNumber
                    data-test-subj="streams-settings-extraction-interval"
                    value={continuousExtraction.intervalHours}
                    onChange={(e) =>
                      setContinuousExtraction((prev) => ({
                        ...prev,
                        intervalHours: Math.max(
                          MIN_EXTRACTION_INTERVAL_HOURS,
                          Number(e.target.value) || MIN_EXTRACTION_INTERVAL_HOURS
                        ),
                      }))
                    }
                    min={MIN_EXTRACTION_INTERVAL_HOURS}
                    disabled={!continuousExtraction.enabled}
                  />
                </EuiFormRow>
                <EuiFormRow
                  label={i18n.translate(
                    'xpack.streams.significantEventsDiscovery.settings.excludedStreamsLabel',
                    { defaultMessage: 'Excluded streams' }
                  )}
                  helpText={i18n.translate(
                    'xpack.streams.significantEventsDiscovery.settings.excludedStreamsHelp',
                    {
                      defaultMessage:
                        'Streams selected here will be skipped during continuous extraction.',
                    }
                  )}
                >
                  <EuiComboBox
                    data-test-subj="streams-settings-excluded-streams"
                    options={streamOptions}
                    selectedOptions={continuousExtraction.excludedStreams.map((s) => ({
                      label: s,
                    }))}
                    onChange={(selected) =>
                      setContinuousExtraction((prev) => ({
                        ...prev,
                        excludedStreams: selected.map((o) => o.label),
                      }))
                    }
                    isLoading={streamsListFetch.loading}
                    isDisabled={!continuousExtraction.enabled}
                    placeholder={i18n.translate(
                      'xpack.streams.significantEventsDiscovery.settings.excludedStreamsPlaceholder',
                      { defaultMessage: 'Select streams to exclude' }
                    )}
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
            announceOnMount
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
                    isDisabled={genAiConnectors.loading}
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
};
