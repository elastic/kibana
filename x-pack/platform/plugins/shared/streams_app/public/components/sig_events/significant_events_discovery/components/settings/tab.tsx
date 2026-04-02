/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  EuiBadge,
  EuiBottomBar,
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiFieldNumber,
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  EuiFormRow,
  EuiLink,
  EuiPanel,
  EuiSpacer,
  EuiSwitch,
  EuiText,
  EuiTextArea,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { MANAGEMENT_APP_LOCATOR } from '@kbn/deeplinks-management/constants';
import {
  OBSERVABILITY_STREAMS_SIG_EVENTS_INDEX_PATTERNS,
  OBSERVABILITY_STREAMS_CONTINUOUS_KI_EXTRACTION_ENABLED,
  OBSERVABILITY_STREAMS_CONTINUOUS_KI_EXTRACTION_INTERVAL_HOURS,
  OBSERVABILITY_STREAMS_CONTINUOUS_KI_EXTRACTION_EXCLUDED_STREAM_PATTERNS,
} from '@kbn/management-settings-ids';
import { DEFAULT_INDEX_PATTERNS } from '@kbn/streams-schema';
import {
  DEFAULT_EXTRACTION_INTERVAL_HOURS,
  MIN_EXTRACTION_INTERVAL_HOURS,
} from '@kbn/streams-plugin/common';
import { useKibana } from '../../../../../hooks/use_kibana';

export function SettingsTab() {
  const {
    dependencies: {
      start: { share },
    },
    core,
  } = useKibana();

  const modelSettingsUrl = useMemo(() => {
    const managementLocator = share.url.locators.get(MANAGEMENT_APP_LOCATOR);
    return managementLocator?.getRedirectUrl({ sectionId: 'ml', appId: 'model_settings' }) ?? '';
  }, [share.url.locators]);

  const [savedIndexPatterns, setSavedIndexPatterns] = useState<string>(() =>
    core.settings.client.get<string>(
      OBSERVABILITY_STREAMS_SIG_EVENTS_INDEX_PATTERNS,
      DEFAULT_INDEX_PATTERNS
    )
  );
  const [indexPatterns, setIndexPatterns] = useState<string>(savedIndexPatterns);

  const [savedCE, setSavedCE] = useState(() => ({
    enabled: core.settings.globalClient.get<boolean>(
      OBSERVABILITY_STREAMS_CONTINUOUS_KI_EXTRACTION_ENABLED,
      false
    ),
    intervalHours: core.settings.globalClient.get<number>(
      OBSERVABILITY_STREAMS_CONTINUOUS_KI_EXTRACTION_INTERVAL_HOURS,
      DEFAULT_EXTRACTION_INTERVAL_HOURS
    ),
    excludedStreamPatterns: core.settings.globalClient.get<string>(
      OBSERVABILITY_STREAMS_CONTINUOUS_KI_EXTRACTION_EXCLUDED_STREAM_PATTERNS,
      ''
    ),
  }));
  const [continuousKiExtraction, setContinuousKiExtraction] = useState(savedCE);

  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<Error | null>(null);

  const ceChanged = useMemo(
    () =>
      continuousKiExtraction.enabled !== savedCE.enabled ||
      continuousKiExtraction.intervalHours !== savedCE.intervalHours ||
      continuousKiExtraction.excludedStreamPatterns !== savedCE.excludedStreamPatterns,
    [continuousKiExtraction, savedCE]
  );

  const hasChanges = indexPatterns !== savedIndexPatterns || ceChanged;

  const handleCancel = useCallback(() => {
    setIndexPatterns(savedIndexPatterns);
    setContinuousKiExtraction(savedCE);
    setSaveError(null);
  }, [savedIndexPatterns, savedCE]);

  const handleSave = useCallback(async () => {
    setSaveError(null);
    setIsSaving(true);
    try {
      if (indexPatterns !== savedIndexPatterns) {
        await core.settings.client.set(
          OBSERVABILITY_STREAMS_SIG_EVENTS_INDEX_PATTERNS,
          indexPatterns
        );
        setSavedIndexPatterns(indexPatterns);
      }

      if (ceChanged) {
        await core.http.put('/internal/streams/_significant_events/settings', {
          body: JSON.stringify({ continuousKiExtraction }),
        });
        setSavedCE(continuousKiExtraction);
      }
    } catch (err) {
      setSaveError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setIsSaving(false);
    }
  }, [core.settings.client, core.http, indexPatterns, savedIndexPatterns, continuousKiExtraction, ceChanged]);

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
          <EuiText size="s">
            <p>
              {i18n.translate(
                'xpack.streams.significantEventsDiscovery.settings.modelSettingsDescription',
                {
                  defaultMessage:
                    'LLM models for Significant Events features are managed centrally in the Model Settings page under Stack Management.',
                }
              )}
            </p>
          </EuiText>
          {modelSettingsUrl && (
            <>
              <EuiSpacer size="s" />
              <EuiLink href={modelSettingsUrl} external>
                {i18n.translate(
                  'xpack.streams.significantEventsDiscovery.settings.modelSettingsLink',
                  { defaultMessage: 'Go to Model Settings' }
                )}
              </EuiLink>
            </>
          )}
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
                'xpack.streams.significantEventsDiscovery.settings.continuousKiExtractionTitle',
                { defaultMessage: 'Continuous KI extraction' }
              )}
            </h3>
          </EuiText>
        </EuiPanel>
        <EuiPanel hasShadow={false} hasBorder={false}>
          {savedCE.enabled && (
            <>
              <EuiCallOut
                announceOnMount
                size="s"
                color="success"
                iconType="check"
                title={i18n.translate(
                  'xpack.streams.significantEventsDiscovery.settings.continuousKiExtractionActiveStatus',
                  {
                    defaultMessage:
                      'Continuous extraction is active. Knowledge indicators are extracted every {hours} hours.',
                    values: {
                      hours: savedCE.intervalHours ?? DEFAULT_EXTRACTION_INTERVAL_HOURS,
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
                        'xpack.streams.significantEventsDiscovery.settings.continuousKiExtractionLabel',
                        { defaultMessage: 'Automatic extraction' }
                      )}
                    </h4>
                  </EuiText>
                </EuiFlexItem>
                <EuiFlexItem>
                  <EuiText color="subdued" size="s">
                    {i18n.translate(
                      'xpack.streams.significantEventsDiscovery.settings.continuousKiExtractionHelp',
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
                    checked={continuousKiExtraction.enabled}
                    onChange={(e) =>
                      setContinuousKiExtraction((prev) => ({ ...prev, enabled: e.target.checked }))
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
                    value={continuousKiExtraction.intervalHours}
                    onChange={(e) =>
                      setContinuousKiExtraction((prev) => ({
                        ...prev,
                        intervalHours: Math.max(
                          MIN_EXTRACTION_INTERVAL_HOURS,
                          Number(e.target.value) || MIN_EXTRACTION_INTERVAL_HOURS
                        ),
                      }))
                    }
                    min={MIN_EXTRACTION_INTERVAL_HOURS}
                    disabled={!continuousKiExtraction.enabled}
                  />
                </EuiFormRow>
                <EuiFormRow
                  label={i18n.translate(
                    'xpack.streams.significantEventsDiscovery.settings.excludedStreamPatternsLabel',
                    { defaultMessage: 'Excluded streams' }
                  )}
                  helpText={i18n.translate(
                    'xpack.streams.significantEventsDiscovery.settings.excludedStreamPatternsHelp',
                    {
                      defaultMessage:
                        'Comma-separated list of stream names or glob patterns (e.g. logs.debug.*) to skip during continuous extraction.',
                    }
                  )}
                >
                  <EuiTextArea
                    data-test-subj="streams-settings-excluded-streams"
                    value={continuousKiExtraction.excludedStreamPatterns}
                    onChange={(e) =>
                      setContinuousKiExtraction((prev) => ({
                        ...prev,
                        excludedStreamPatterns: e.target.value,
                      }))
                    }
                    disabled={!continuousKiExtraction.enabled}
                    placeholder={i18n.translate(
                      'xpack.streams.significantEventsDiscovery.settings.excludedStreamPatternsPlaceholder',
                      { defaultMessage: 'logs.debug.*' }
                    )}
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
