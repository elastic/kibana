/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import useObservable from 'react-use/lib/useObservable';
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
import {
  OBSERVABILITY_STREAMS_SIGNIFICANT_EVENTS_INDEX_PATTERNS,
  OBSERVABILITY_STREAMS_SIGNIFICANT_EVENTS_TUNING_CONFIG,
} from '@kbn/management-settings-ids';
import { DEFAULT_INDEX_PATTERNS } from '@kbn/streams-schema';
import {
  DEFAULT_SIGNIFICANT_EVENTS_TUNING_CONFIG,
  type SignificantEventsTuningConfig,
} from '@kbn/significant-events-schema';
import {
  DEFAULT_EXTRACTION_INTERVAL_HOURS,
  MIN_EXTRACTION_INTERVAL_HOURS,
  STREAMS_SIGNIFICANT_EVENTS_APPS_ENABLED_FLAG,
  DEFAULT_SIG_EVENTS_SCHEDULED_DETECTION_INTERVAL_MINUTES,
  DEFAULT_SIG_EVENTS_SCHEDULED_REVIEW_INTERVAL_MINUTES,
  MAX_SIG_EVENTS_SCHEDULED_BATCH_SIZE,
  MAX_SIG_EVENTS_SCHEDULED_REVIEW_PASSES,
  MIN_SIG_EVENTS_SCHEDULED_BATCH_SIZE,
  MIN_SIG_EVENTS_SCHEDULED_INTERVAL_MINUTES,
  MIN_SIG_EVENTS_SCHEDULED_REVIEW_PASSES,
} from '@kbn/significant-events-plugin/common';
import { useKibana } from '../../../../../hooks/use_kibana';
import { useModelSettingsUrl } from '../../../../../hooks/use_model_settings_url';
import { useStreamsPrivileges } from '../../../../../hooks/use_streams_privileges';
import { getFormattedError } from '../../../../../util/errors';
import { useContinuousExtractionSettings } from './use_continuous_extraction_settings';
import { useScheduledDiscoverySettings } from './use_scheduled_discovery_settings';
import {
  SignificantEventsTuningConfigEditor,
  configToAnnotatedYaml,
} from './significant_events_tuning_config_editor';
import { AppsSection } from './apps_section';

const clampNumber = (value: string, min: number, max: number) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return min;
  }
  return Math.min(max, Math.max(min, parsed));
};

export function SettingsTab() {
  const { core } = useKibana();
  const modelSettingsUrl = useModelSettingsUrl();

  // Saving these settings hits two routes with different privileges: the streams
  // settings route (requires the streams `manage` privilege) and core's UI
  // settings routes used by `core.settings.client`/`globalClient` (require
  // `advancedSettings.save`). Gate the whole form on both so the user never
  // triggers a partial save that 403s halfway through.
  const { ui: streamsUiPrivileges } = useStreamsPrivileges();
  const canManageStreams = streamsUiPrivileges.manage;
  const canSaveAdvancedSettings = core.application.capabilities.advancedSettings?.save === true;
  const canEditSettings = canManageStreams && canSaveAdvancedSettings;

  // getBooleanValue$ builds a new observable on every call, so memoize it —
  // otherwise useObservable re-subscribes (and re-evaluates the flag) on every
  // render of this settings tab, not just when the flag actually changes.
  const isAppsEnabledObservable = useMemo(
    () => core.featureFlags.getBooleanValue$(STREAMS_SIGNIFICANT_EVENTS_APPS_ENABLED_FLAG, false),
    [core.featureFlags]
  );
  const isAppsEnabled = useObservable(isAppsEnabledObservable, false);

  const [savedIndexPatterns, setSavedIndexPatterns] = useState<string>(() =>
    core.settings.client.get<string>(
      OBSERVABILITY_STREAMS_SIGNIFICANT_EVENTS_INDEX_PATTERNS,
      DEFAULT_INDEX_PATTERNS
    )
  );
  const [indexPatterns, setIndexPatterns] = useState<string>(savedIndexPatterns);

  const continuousExtraction = useContinuousExtractionSettings({
    globalClient: core.settings.globalClient,
    http: core.http,
  });
  const scheduledDiscovery = useScheduledDiscoverySettings({
    client: core.settings.client,
    http: core.http,
  });

  const savedConfigYaml = useMemo(() => {
    try {
      const raw = core.settings.globalClient.get<unknown>(
        OBSERVABILITY_STREAMS_SIGNIFICANT_EVENTS_TUNING_CONFIG,
        DEFAULT_SIGNIFICANT_EVENTS_TUNING_CONFIG
      );
      const parsed =
        typeof raw === 'string'
          ? (JSON.parse(raw) as Partial<SignificantEventsTuningConfig>)
          : (raw as Partial<SignificantEventsTuningConfig>);
      return configToAnnotatedYaml({ ...DEFAULT_SIGNIFICANT_EVENTS_TUNING_CONFIG, ...parsed });
    } catch {
      return configToAnnotatedYaml(DEFAULT_SIGNIFICANT_EVENTS_TUNING_CONFIG);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [draftConfigYaml, setDraftConfigYaml] = useState<string>(savedConfigYaml);
  const [parsedTuningConfig, setParsedTuningConfig] =
    useState<SignificantEventsTuningConfig | null>(null);
  const [savedConfigYamlState, setSavedConfigYamlState] = useState<string>(savedConfigYaml);

  const [isSaving, setIsSaving] = useState(false);

  const hasTuningConfigChanges = draftConfigYaml !== savedConfigYamlState;
  const hasChanges =
    indexPatterns !== savedIndexPatterns ||
    continuousExtraction.hasChanged ||
    scheduledDiscovery.hasChanged ||
    hasTuningConfigChanges;

  const handleCancel = useCallback(() => {
    setIndexPatterns(savedIndexPatterns);
    continuousExtraction.reset();
    scheduledDiscovery.reset();
    setDraftConfigYaml(savedConfigYamlState);
    setParsedTuningConfig(null);
  }, [savedIndexPatterns, savedConfigYamlState, continuousExtraction, scheduledDiscovery]);

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    try {
      if (indexPatterns !== savedIndexPatterns) {
        await core.settings.client.set(
          OBSERVABILITY_STREAMS_SIGNIFICANT_EVENTS_INDEX_PATTERNS,
          indexPatterns
        );
        setSavedIndexPatterns(indexPatterns);
      }

      if (continuousExtraction.hasChanged) {
        await continuousExtraction.save();
      }

      if (scheduledDiscovery.hasChanged) {
        await scheduledDiscovery.save();
      }

      if (hasTuningConfigChanges && parsedTuningConfig) {
        const fullConfig = { ...DEFAULT_SIGNIFICANT_EVENTS_TUNING_CONFIG, ...parsedTuningConfig };
        await core.settings.globalClient.set(
          OBSERVABILITY_STREAMS_SIGNIFICANT_EVENTS_TUNING_CONFIG,
          JSON.stringify(fullConfig)
        );
        const newSavedYaml = configToAnnotatedYaml(fullConfig);
        setSavedConfigYamlState(newSavedYaml);
        setDraftConfigYaml(newSavedYaml);
        setParsedTuningConfig(null);
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
    core.settings.globalClient,
    core.notifications.toasts,
    indexPatterns,
    savedIndexPatterns,
    continuousExtraction,
    scheduledDiscovery,
    hasTuningConfigChanges,
    parsedTuningConfig,
  ]);

  return (
    <>
      {!canEditSettings && (
        <>
          <EuiCallOut
            title={i18n.translate(
              'xpack.streams.significantEventsDiscovery.settings.noPermissionCalloutTitle',
              { defaultMessage: 'You need additional privileges to edit these settings' }
            )}
            color="warning"
            iconType="lock"
            data-test-subj="streams-settings-no-permission-callout"
            announceOnMount={false}
          >
            <p>
              {i18n.translate(
                'xpack.streams.significantEventsDiscovery.settings.noPermissionCalloutDescription',
                {
                  defaultMessage:
                    'Editing these settings requires both the Streams "Manage" privilege and the Advanced Settings "All" privilege. Contact your administrator if you need to make changes.',
                }
              )}
            </p>
          </EuiCallOut>
          <EuiSpacer />
        </>
      )}
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
                'xpack.streams.significantEventsDiscovery.settings.scheduledDiscoveryTitle',
                { defaultMessage: 'Scheduled discovery' }
              )}
            </h3>
          </EuiText>
        </EuiPanel>
        <EuiPanel hasShadow={false} hasBorder={false}>
          {scheduledDiscovery.saved.enabled && (
            <>
              <EuiCallOut
                announceOnMount
                size="s"
                color="success"
                iconType="check"
                title={i18n.translate(
                  'xpack.streams.significantEventsDiscovery.settings.scheduledDiscoveryActiveStatus',
                  {
                    defaultMessage:
                      'Scheduled discovery is active in this space. Detection runs every {detectionIntervalMinutes} minutes and review runs every {reviewIntervalMinutes} minutes.',
                    values: {
                      detectionIntervalMinutes:
                        scheduledDiscovery.saved.detectionIntervalMinutes ??
                        DEFAULT_SIG_EVENTS_SCHEDULED_DETECTION_INTERVAL_MINUTES,
                      reviewIntervalMinutes:
                        scheduledDiscovery.saved.reviewIntervalMinutes ??
                        DEFAULT_SIG_EVENTS_SCHEDULED_REVIEW_INTERVAL_MINUTES,
                    },
                  }
                )}
                data-test-subj="streams-settings-scheduled-discovery-status"
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
                        'xpack.streams.significantEventsDiscovery.settings.scheduledDiscoveryLabel',
                        { defaultMessage: 'Scheduled discovery' }
                      )}
                    </h4>
                  </EuiText>
                </EuiFlexItem>
                <EuiFlexItem>
                  <EuiText color="subdued" size="s">
                    {i18n.translate(
                      'xpack.streams.significantEventsDiscovery.settings.scheduledDiscoveryHelp',
                      {
                        defaultMessage:
                          'When enabled, Significant Events detection, discovery, and triage run automatically in the current Kibana space.',
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
                    data-test-subj="streams-settings-scheduled-discovery-toggle"
                    label={i18n.translate(
                      'xpack.streams.significantEventsDiscovery.settings.enableScheduledDiscovery',
                      { defaultMessage: 'Enable scheduled discovery' }
                    )}
                    checked={scheduledDiscovery.draft.enabled}
                    onChange={(e) =>
                      scheduledDiscovery.setDraft((prev) => ({
                        ...prev,
                        enabled: e.target.checked,
                      }))
                    }
                    disabled={!canEditSettings}
                  />
                </EuiFormRow>
                <EuiFormRow
                  label={i18n.translate(
                    'xpack.streams.significantEventsDiscovery.settings.detectionIntervalLabel',
                    { defaultMessage: 'Detection interval (minutes)' }
                  )}
                  helpText={i18n.translate(
                    'xpack.streams.significantEventsDiscovery.settings.detectionIntervalHelp',
                    { defaultMessage: 'How often scheduled detection runs.' }
                  )}
                >
                  <EuiFieldNumber
                    data-test-subj="streams-settings-scheduled-detection-interval"
                    value={scheduledDiscovery.draft.detectionIntervalMinutes}
                    onChange={(e) =>
                      scheduledDiscovery.setDraft((prev) => ({
                        ...prev,
                        detectionIntervalMinutes: clampNumber(
                          e.target.value,
                          MIN_SIG_EVENTS_SCHEDULED_INTERVAL_MINUTES,
                          Number.MAX_SAFE_INTEGER
                        ),
                      }))
                    }
                    min={MIN_SIG_EVENTS_SCHEDULED_INTERVAL_MINUTES}
                    disabled={!canEditSettings || !scheduledDiscovery.draft.enabled}
                  />
                </EuiFormRow>
                <EuiFormRow
                  label={i18n.translate(
                    'xpack.streams.significantEventsDiscovery.settings.targetCoverageLabel',
                    { defaultMessage: 'Target coverage (minutes)' }
                  )}
                  helpText={i18n.translate(
                    'xpack.streams.significantEventsDiscovery.settings.targetCoverageHelp',
                    {
                      defaultMessage:
                        'Every active rule is scanned at least once within this window. Must exceed the detection interval to spread the fleet across runs.',
                    }
                  )}
                >
                  <EuiFieldNumber
                    data-test-subj="streams-settings-scheduled-target-coverage"
                    value={scheduledDiscovery.draft.targetCoverageMinutes}
                    onChange={(e) =>
                      scheduledDiscovery.setDraft((prev) => ({
                        ...prev,
                        targetCoverageMinutes: clampNumber(
                          e.target.value,
                          MIN_SIG_EVENTS_SCHEDULED_INTERVAL_MINUTES,
                          Number.MAX_SAFE_INTEGER
                        ),
                      }))
                    }
                    min={MIN_SIG_EVENTS_SCHEDULED_INTERVAL_MINUTES}
                    disabled={!canEditSettings || !scheduledDiscovery.draft.enabled}
                  />
                </EuiFormRow>
                <EuiFormRow
                  label={i18n.translate(
                    'xpack.streams.significantEventsDiscovery.settings.reviewIntervalLabel',
                    { defaultMessage: 'Review interval (minutes)' }
                  )}
                  helpText={i18n.translate(
                    'xpack.streams.significantEventsDiscovery.settings.reviewIntervalHelp',
                    { defaultMessage: 'How often scheduled discovery and triage review runs.' }
                  )}
                >
                  <EuiFieldNumber
                    data-test-subj="streams-settings-scheduled-review-interval"
                    value={scheduledDiscovery.draft.reviewIntervalMinutes}
                    onChange={(e) =>
                      scheduledDiscovery.setDraft((prev) => ({
                        ...prev,
                        reviewIntervalMinutes: clampNumber(
                          e.target.value,
                          MIN_SIG_EVENTS_SCHEDULED_INTERVAL_MINUTES,
                          Number.MAX_SAFE_INTEGER
                        ),
                      }))
                    }
                    min={MIN_SIG_EVENTS_SCHEDULED_INTERVAL_MINUTES}
                    disabled={!canEditSettings || !scheduledDiscovery.draft.enabled}
                  />
                </EuiFormRow>
                <EuiFormRow
                  label={i18n.translate(
                    'xpack.streams.significantEventsDiscovery.settings.discoveryBatchSizeLabel',
                    { defaultMessage: 'Discovery batch size' }
                  )}
                  helpText={i18n.translate(
                    'xpack.streams.significantEventsDiscovery.settings.discoveryBatchSizeHelp',
                    { defaultMessage: 'Maximum detections sent to each scheduled discovery pass.' }
                  )}
                >
                  <EuiFieldNumber
                    data-test-subj="streams-settings-scheduled-discovery-batch-size"
                    value={scheduledDiscovery.draft.discoveryBatchSize}
                    onChange={(e) =>
                      scheduledDiscovery.setDraft((prev) => ({
                        ...prev,
                        discoveryBatchSize: clampNumber(
                          e.target.value,
                          MIN_SIG_EVENTS_SCHEDULED_BATCH_SIZE,
                          MAX_SIG_EVENTS_SCHEDULED_BATCH_SIZE
                        ),
                      }))
                    }
                    min={MIN_SIG_EVENTS_SCHEDULED_BATCH_SIZE}
                    max={MAX_SIG_EVENTS_SCHEDULED_BATCH_SIZE}
                    disabled={!canEditSettings || !scheduledDiscovery.draft.enabled}
                  />
                </EuiFormRow>
                <EuiFormRow
                  label={i18n.translate(
                    'xpack.streams.significantEventsDiscovery.settings.triageBatchSizeLabel',
                    { defaultMessage: 'Triage batch size' }
                  )}
                  helpText={i18n.translate(
                    'xpack.streams.significantEventsDiscovery.settings.triageBatchSizeHelp',
                    { defaultMessage: 'Maximum discoveries sent to each scheduled triage pass.' }
                  )}
                >
                  <EuiFieldNumber
                    data-test-subj="streams-settings-scheduled-triage-batch-size"
                    value={scheduledDiscovery.draft.triageBatchSize}
                    onChange={(e) =>
                      scheduledDiscovery.setDraft((prev) => ({
                        ...prev,
                        triageBatchSize: clampNumber(
                          e.target.value,
                          MIN_SIG_EVENTS_SCHEDULED_BATCH_SIZE,
                          MAX_SIG_EVENTS_SCHEDULED_BATCH_SIZE
                        ),
                      }))
                    }
                    min={MIN_SIG_EVENTS_SCHEDULED_BATCH_SIZE}
                    max={MAX_SIG_EVENTS_SCHEDULED_BATCH_SIZE}
                    disabled={!canEditSettings || !scheduledDiscovery.draft.enabled}
                  />
                </EuiFormRow>
                <EuiFormRow
                  label={i18n.translate(
                    'xpack.streams.significantEventsDiscovery.settings.maxReviewPassesLabel',
                    { defaultMessage: 'Review passes' }
                  )}
                  helpText={i18n.translate(
                    'xpack.streams.significantEventsDiscovery.settings.maxReviewPassesHelp',
                    {
                      defaultMessage:
                        'Maximum discovery and triage pass pairs per scheduled review run.',
                    }
                  )}
                >
                  <EuiFieldNumber
                    data-test-subj="streams-settings-scheduled-max-review-passes"
                    value={scheduledDiscovery.draft.maxReviewPasses}
                    onChange={(e) =>
                      scheduledDiscovery.setDraft((prev) => ({
                        ...prev,
                        maxReviewPasses: clampNumber(
                          e.target.value,
                          MIN_SIG_EVENTS_SCHEDULED_REVIEW_PASSES,
                          MAX_SIG_EVENTS_SCHEDULED_REVIEW_PASSES
                        ),
                      }))
                    }
                    min={MIN_SIG_EVENTS_SCHEDULED_REVIEW_PASSES}
                    max={MAX_SIG_EVENTS_SCHEDULED_REVIEW_PASSES}
                    disabled={!canEditSettings || !scheduledDiscovery.draft.enabled}
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
                    disabled={!canEditSettings}
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
                'xpack.streams.significantEventsDiscovery.settings.continuousKiOnboardingTitle',
                { defaultMessage: 'Continuous KI onboarding' }
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
                        'xpack.streams.significantEventsDiscovery.settings.continuousKiOnboardingActiveStatusEveryRun',
                        {
                          defaultMessage:
                            'Continuous onboarding is active. Streams have no cooldown and are re-eligible for onboarding immediately after each run.',
                        }
                      )
                    : i18n.translate(
                        'xpack.streams.significantEventsDiscovery.settings.continuousKiOnboardingActiveStatus',
                        {
                          defaultMessage:
                            'Continuous onboarding is active. Streams are re-onboarded at most every {hours} hours.',
                          values: {
                            hours:
                              continuousExtraction.saved.intervalHours ??
                              DEFAULT_EXTRACTION_INTERVAL_HOURS,
                          },
                        }
                      )
                }
                data-test-subj="streams-settings-continuous-onboarding-status"
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
                        'xpack.streams.significantEventsDiscovery.settings.continuousKiOnboardingLabel',
                        { defaultMessage: 'Automatic onboarding' }
                      )}
                    </h4>
                  </EuiText>
                </EuiFlexItem>
                <EuiFlexItem>
                  <EuiText color="subdued" size="s">
                    {i18n.translate(
                      'xpack.streams.significantEventsDiscovery.settings.continuousKiOnboardingHelp',
                      {
                        defaultMessage:
                          'When enabled, knowledge indicator onboarding runs automatically on managed streams at the configured interval.',
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
                    data-test-subj="streams-settings-continuous-onboarding-toggle"
                    label={i18n.translate(
                      'xpack.streams.significantEventsDiscovery.settings.enableContinuousKiOnboarding',
                      { defaultMessage: 'Enable continuous KI onboarding' }
                    )}
                    checked={continuousExtraction.draft.enabled}
                    onChange={(e) =>
                      continuousExtraction.setDraft((prev) => ({
                        ...prev,
                        enabled: e.target.checked,
                      }))
                    }
                    disabled={!canEditSettings}
                  />
                </EuiFormRow>
                <EuiFormRow
                  label={i18n.translate(
                    'xpack.streams.significantEventsDiscovery.settings.onboardingIntervalLabel',
                    { defaultMessage: 'Onboarding interval (hours)' }
                  )}
                  helpText={i18n.translate(
                    'xpack.streams.significantEventsDiscovery.settings.onboardingIntervalHelp',
                    {
                      defaultMessage:
                        'Minimum period in hours between onboarding runs for a given stream. Set to 0 for no cooldown between runs.',
                    }
                  )}
                >
                  <EuiFieldNumber
                    data-test-subj="streams-settings-onboarding-interval"
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
                    disabled={!canEditSettings || !continuousExtraction.draft.enabled}
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
                        'Comma-separated list of stream names or glob patterns (e.g. logs.debug.*) to skip during continuous onboarding.',
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
                    disabled={!canEditSettings || !continuousExtraction.draft.enabled}
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

      <EuiSpacer />

      <EuiPanel hasBorder={true} hasShadow={false} paddingSize="none" grow={false}>
        <EuiPanel hasShadow={false} color="subdued">
          <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
            <EuiFlexItem grow={false}>
              <EuiText size="s">
                <h3>
                  {i18n.translate('xpack.streams.significantEventsDiscovery.settings.tuningTitle', {
                    defaultMessage: 'Significant Events tuning',
                  })}
                </h3>
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                size="s"
                iconType="refresh"
                isDisabled={!canEditSettings}
                onClick={() => {
                  const defaultYaml = configToAnnotatedYaml(
                    DEFAULT_SIGNIFICANT_EVENTS_TUNING_CONFIG
                  );
                  setDraftConfigYaml(defaultYaml);
                  setParsedTuningConfig(DEFAULT_SIGNIFICANT_EVENTS_TUNING_CONFIG);
                }}
              >
                {i18n.translate(
                  'xpack.streams.significantEventsDiscovery.settings.resetToDefaults',
                  { defaultMessage: 'Reset to defaults' }
                )}
              </EuiButtonEmpty>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiPanel>
        <EuiPanel hasShadow={false} hasBorder={false}>
          <EuiCallOut
            size="s"
            color="warning"
            iconType="warning"
            title={i18n.translate('xpack.streams.significantEventsDiscovery.settings.tuningInfo', {
              defaultMessage:
                'These are advanced settings that control how features are discovered and queries are searched. Incorrect values may degrade onboarding quality or cause unexpected behavior. Changes take effect on the next run.',
            })}
          />
          <EuiSpacer size="m" />
          <SignificantEventsTuningConfigEditor
            value={draftConfigYaml}
            isReadOnly={!canEditSettings}
            onChange={(yaml, parsed) => {
              setDraftConfigYaml(yaml);
              setParsedTuningConfig(parsed);
            }}
          />
        </EuiPanel>
      </EuiPanel>

      {isAppsEnabled && <AppsSection canEdit={canEditSettings} />}

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
                    isDisabled={
                      !canEditSettings || (hasTuningConfigChanges && parsedTuningConfig === null)
                    }
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
