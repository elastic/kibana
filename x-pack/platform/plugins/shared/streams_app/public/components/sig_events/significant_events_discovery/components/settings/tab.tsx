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
import { OBSERVABILITY_STREAMS_SIG_EVENTS_INDEX_PATTERNS } from '@kbn/management-settings-ids';
import { DEFAULT_INDEX_PATTERNS } from '@kbn/streams-schema';
import {
  DEFAULT_EXTRACTION_INTERVAL_HOURS,
  MIN_EXTRACTION_INTERVAL_HOURS,
} from '@kbn/streams-plugin/common';
import { useKibana } from '../../../../../hooks/use_kibana';
import { getFormattedError } from '../../../../../util/errors';
import { useContinuousExtractionSettings } from './use_continuous_extraction_settings';

export function SettingsTab() {
  const {
    dependencies: {
      start: { share },
    },
    core,
  } = useKibana();

  const modelSettingsUrl = useMemo(() => {
    const managementLocator = share.url.locators.get(MANAGEMENT_APP_LOCATOR);
    return (
      managementLocator?.getRedirectUrl({
        sectionId: 'modelManagement',
        appId: 'model_settings',
      }) ?? ''
    );
  }, [share.url.locators]);

  const [savedIndexPatterns, setSavedIndexPatterns] = useState<string>(() =>
    core.settings.client.get<string>(
      OBSERVABILITY_STREAMS_SIG_EVENTS_INDEX_PATTERNS,
      DEFAULT_INDEX_PATTERNS
    )
  );
  const [indexPatterns, setIndexPatterns] = useState<string>(savedIndexPatterns);

  const continuousExtraction = useContinuousExtractionSettings({
    globalClient: core.settings.globalClient,
    http: core.http,
  });

  const [isSaving, setIsSaving] = useState(false);

  const hasChanges = indexPatterns !== savedIndexPatterns || continuousExtraction.hasChanged;

  const handleCancel = useCallback(() => {
    setIndexPatterns(savedIndexPatterns);
    continuousExtraction.reset();
  }, [savedIndexPatterns, continuousExtraction]);

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    try {
      if (indexPatterns !== savedIndexPatterns) {
        await core.settings.client.set(
          OBSERVABILITY_STREAMS_SIG_EVENTS_INDEX_PATTERNS,
          indexPatterns
        );
        setSavedIndexPatterns(indexPatterns);
      }

      if (continuousExtraction.hasChanged) {
        await continuousExtraction.save();
      }
    } catch (err) {
      core.notifications.toasts.addDanger({
        title: i18n.translate('xpack.streams.significantEventsDiscovery.settings.saveErrorTitle', {
          defaultMessage: 'Failed to save settings',
        }),
        text: getFormattedError(err).message,
      });
    } finally {
      setIsSaving(false);
    }
  }, [
    core.settings.client,
    core.notifications.toasts,
    indexPatterns,
    savedIndexPatterns,
    continuousExtraction,
  ]);

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
          {continuousExtraction.saved.enabled && (
            <>
              <EuiCallOut
                announceOnMount
                size="s"
                color="success"
                iconType="check"
                title={
                  (continuousExtraction.saved.intervalHours ??
                    DEFAULT_EXTRACTION_INTERVAL_HOURS) === 0
                    ? i18n.translate(
                        'xpack.streams.significantEventsDiscovery.settings.continuousKiExtractionActiveStatusEveryRun',
                        {
                          defaultMessage:
                            'Continuous extraction is active. Streams have no cooldown and are re-eligible for extraction immediately after each run.',
                        }
                      )
                    : i18n.translate(
                        'xpack.streams.significantEventsDiscovery.settings.continuousKiExtractionActiveStatus',
                        {
                          defaultMessage:
                            'Continuous extraction is active. Streams are re-extracted at most every {hours} hours.',
                          values: {
                            hours:
                              continuousExtraction.saved.intervalHours ??
                              DEFAULT_EXTRACTION_INTERVAL_HOURS,
                          },
                        }
                      )
                }
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
                    checked={continuousExtraction.draft.enabled}
                    onChange={(e) =>
                      continuousExtraction.setDraft((prev) => ({
                        ...prev,
                        enabled: e.target.checked,
                      }))
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
                        'Minimum period in hours between extractions for a given stream. Set to 0 for no cooldown between runs.',
                    }
                  )}
                >
                  <EuiFieldNumber
                    data-test-subj="streams-settings-extraction-interval"
                    value={continuousExtraction.draft.intervalHours}
                    onChange={(e) =>
                      continuousExtraction.setDraft((prev) => ({
                        ...prev,
                        intervalHours: Math.max(
                          MIN_EXTRACTION_INTERVAL_HOURS,
                          Number(e.target.value) || 0
                        ),
                      }))
                    }
                    min={MIN_EXTRACTION_INTERVAL_HOURS}
                    disabled={!continuousExtraction.draft.enabled}
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
                    value={continuousExtraction.draft.excludedStreamPatterns}
                    onChange={(e) =>
                      continuousExtraction.setDraft((prev) => ({
                        ...prev,
                        excludedStreamPatterns: e.target.value,
                      }))
                    }
                    disabled={!continuousExtraction.draft.enabled}
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
