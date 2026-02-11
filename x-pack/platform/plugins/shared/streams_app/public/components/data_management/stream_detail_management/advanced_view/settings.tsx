/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { omit } from 'lodash';
import type { IngestStreamSettings } from '@kbn/streams-schema';
import { convertGetResponseIntoUpsertRequest, Streams } from '@kbn/streams-schema';
import {
  EuiBottomBar,
  EuiButton,
  EuiButtonEmpty,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiHorizontalRule,
  EuiLink,
  EuiText,
} from '@elastic/eui';
import { useAbortController } from '@kbn/react-hooks';
import { useUnsavedChangesPrompt } from '@kbn/unsaved-changes-prompt';
import useAsyncFn from 'react-use/lib/useAsyncFn';
import { isHttpFetchError } from '@kbn/server-route-repository-client';
import { useKibana } from '../../../../hooks/use_kibana';
import { getFormattedError } from '../../../../util/errors';
import { useStreamsAppRouter } from '../../../../hooks/use_streams_app_router';
import { useStreamDetail } from '../../../../hooks/use_stream_detail';
import { useUpdateStreams } from '../../../../hooks/use_update_streams';
import { Row, RowMetadata } from './row';
import { parseDuration } from '../../stream_detail_lifecycle/helpers/helpers';
import { StreamMetadataForm } from './stream_metadata_form';
import type { AIFeatures } from '../../../../hooks/use_ai_features';
import { getLast24HoursTimeRange } from '../../../../util/time_range';

interface Setting {
  invalid: boolean;
  value: string;
  override: boolean;
  from?: string;
}

interface MetadataState {
  tags: string[];
  description: string;
}

function toStringValues(settings: IngestStreamSettings, effectiveSettings: IngestStreamSettings) {
  return Object.entries(effectiveSettings).reduce<Record<string, Setting>>(
    (acc, [key, setting]) => {
      acc[key] = {
        ...setting,
        value: String(setting.value),
        invalid: false,
        override: !!settings[key as keyof IngestStreamSettings],
      };
      return acc;
    },
    {}
  );
}

export interface SettingsProps {
  definition: Streams.ingest.all.GetResponse;
  refreshDefinition: () => void;
  children?: React.ReactNode;
  showDescription?: boolean;
  aiFeatures?: AIFeatures | null;
}

export function Settings({
  definition,
  refreshDefinition,
  children,
  showDescription = false,
  aiFeatures,
}: SettingsProps) {
  const { loading: isLoadingDefinition } = useStreamDetail();
  const {
    isServerless,
    core: { notifications, overlays, http, application },
    appParams: { history },
    dependencies: {
      start: {
        streams: { streamsRepositoryClient },
      },
    },
  } = useKibana();
  const { navigateToUrl } = application;
  const abortController = useAbortController();
  const updateStream = useUpdateStreams(definition.stream.name);
  const canManage = definition.privileges.manage === true;

  // Index settings state
  const originalSettings = useMemo(
    () => toStringValues(definition.stream.ingest.settings, definition.effective_settings),
    [definition]
  );
  const isClassicStream = useMemo(
    () => Streams.ClassicStream.GetResponse.is(definition),
    [definition]
  );
  const [settings, setSettings] = useState<Record<string, Setting>>(() =>
    toStringValues(definition.stream.ingest.settings, definition.effective_settings)
  );

  // Metadata state (tags, description)
  const originalMetadata = useMemo<MetadataState>(
    () => ({
      tags: definition.stream.tags ?? [],
      description: definition.stream.description ?? '',
    }),
    [definition.stream.tags, definition.stream.description]
  );
  const [metadata, setMetadata] = useState<MetadataState>(() => ({
    tags: definition.stream.tags ?? [],
    description: definition.stream.description ?? '',
  }));

  // Description generation task state
  const getDescriptionGenerationStatus = useCallback(async () => {
    return await streamsRepositoryClient.fetch(
      'GET /internal/streams/{name}/_description_generation/_status',
      {
        signal: abortController.signal,
        params: {
          path: { name: definition.stream.name },
        },
      }
    );
  }, [definition.stream.name, abortController.signal, streamsRepositoryClient]);

  const scheduleDescriptionGenerationTask = useCallback(
    async (connectorId: string) => {
      const { from, to } = getLast24HoursTimeRange();
      await streamsRepositoryClient.fetch(
        'POST /internal/streams/{name}/_description_generation/_task',
        {
          signal: abortController.signal,
          params: {
            path: { name: definition.stream.name },
            body: {
              action: 'schedule',
              to,
              from,
              connectorId,
            },
          },
        }
      );
    },
    [definition.stream.name, abortController.signal, streamsRepositoryClient]
  );

  const [{ loading: isSchedulingGenerationTask }, doScheduleGenerationTask] = useAsyncFn(
    scheduleDescriptionGenerationTask
  );

  const cancelDescriptionGenerationTask = useCallback(async () => {
    await streamsRepositoryClient.fetch(
      'POST /internal/streams/{name}/_description_generation/_task',
      {
        signal: abortController.signal,
        params: {
          path: { name: definition.stream.name },
          body: {
            action: 'cancel',
          },
        },
      }
    );
  }, [definition.stream.name, abortController.signal, streamsRepositoryClient]);

  const acknowledgeDescriptionGenerationTask = useCallback(async () => {
    try {
      await streamsRepositoryClient.fetch(
        'POST /internal/streams/{name}/_description_generation/_task',
        {
          signal: abortController.signal,
          params: {
            path: { name: definition.stream.name },
            body: {
              action: 'acknowledge',
            },
          },
        }
      );
    } catch (error) {
      if (!(isHttpFetchError(error) && error.response?.status === 409)) {
        throw error;
      }
    }
  }, [definition.stream.name, abortController.signal, streamsRepositoryClient]);

  const [{ loading: isTaskLoading, value: task, error: taskError }, refreshTask] = useAsyncFn(
    getDescriptionGenerationStatus
  );

  // Update description when task completes
  useEffect(() => {
    if (task?.status === 'completed' && task.description) {
      setMetadata((prev) => ({ ...prev, description: task.description! }));
    }
  }, [task]);

  // Check for changes
  const hasSettingsChanges = useMemo(() => {
    const keys = [...new Set([...Object.keys(originalSettings), ...Object.keys(settings)])];
    return keys.some((key) => originalSettings[key]?.value !== settings[key]?.value);
  }, [originalSettings, settings]);

  const hasMetadataChanges = useMemo(() => {
    const tagsChanged =
      metadata.tags.length !== originalMetadata.tags.length ||
      metadata.tags.some((tag, index) => tag !== originalMetadata.tags[index]);
    const descriptionChanged =
      showDescription && metadata.description !== originalMetadata.description;
    return tagsChanged || descriptionChanged;
  }, [metadata, originalMetadata, showDescription]);

  const hasChanges = hasSettingsChanges || hasMetadataChanges;

  const updateSetting = useCallback(
    (name: string, value: string, invalid: boolean) => {
      if (value.length === 0) {
        setSettings((prev) => omit(prev, name));
      } else {
        const setting: Setting = { value, invalid, override: true };
        if (!isClassicStream) {
          setting.from = definition.stream.name;
        }
        setSettings((prev) => ({ ...prev, [name]: setting }));
      }
    },
    [isClassicStream, definition.stream.name, setSettings]
  );

  const [isUpdating, setIsUpdating] = useState(false);
  const onReset = useCallback(
    (name: string) => {
      if (isClassicStream) {
        setSettings((prev) => omit(prev, name));
        return;
      }

      const original = originalSettings[name];
      if (!original || original.from === definition.stream.name) {
        setSettings((prev) => omit(prev, name));
      } else {
        setSettings((prev) => ({ ...prev, [name]: original }));
      }
    },
    [originalSettings, isClassicStream, definition.stream.name]
  );

  const updateAllSettings = useCallback(async () => {
    setIsUpdating(true);
    try {
      // Acknowledge any pending description generation task
      if (showDescription) {
        await acknowledgeDescriptionGenerationTask();
      }

      // Save metadata (tags, description) via stream upsert API if changed
      if (hasMetadataChanges) {
        const request = convertGetResponseIntoUpsertRequest(definition);
        request.stream.tags = metadata.tags.length > 0 ? metadata.tags : undefined;
        if (showDescription) {
          request.stream.description = metadata.description;
        }
        await updateStream(request);
      }

      // Save index settings via ingest API if changed
      if (hasSettingsChanges) {
        await streamsRepositoryClient.fetch('PUT /api/streams/{name}/_ingest 2023-10-31', {
          params: {
            path: { name: definition.stream.name },
            body: {
              ingest: {
                ...definition.stream.ingest,
                processing: omit(definition.stream.ingest.processing, 'updated_at'),
                settings: prepareSettings(settings),
              },
            },
          },
          signal: abortController.signal,
        });
      }

      notifications.toasts.addSuccess({
        title: i18n.translate('xpack.streams.settings.successfullyUpdatedSettings', {
          defaultMessage: 'Settings updated',
        }),
      });

      refreshDefinition();
    } catch (error) {
      notifications.toasts.addError(getFormattedError(error), {
        title: i18n.translate('xpack.streams.settings.failedToUpdateSettings', {
          defaultMessage: 'Failed to update settings',
        }),
      });
    } finally {
      setIsUpdating(false);
    }
  }, [
    definition,
    settings,
    metadata,
    hasSettingsChanges,
    hasMetadataChanges,
    showDescription,
    abortController.signal,
    streamsRepositoryClient,
    updateStream,
    acknowledgeDescriptionGenerationTask,
    notifications.toasts,
    refreshDefinition,
  ]);

  const resetAllChanges = useCallback(() => {
    setSettings(toStringValues(definition.stream.ingest.settings, definition.effective_settings));
    setMetadata({
      tags: definition.stream.tags ?? [],
      description: definition.stream.description ?? '',
    });
  }, [definition]);

  useEffect(() => {
    if (!definition) return;
    setSettings(toStringValues(definition.stream.ingest.settings, definition.effective_settings));
    setMetadata({
      tags: definition.stream.tags ?? [],
      description: definition.stream.description ?? '',
    });
  }, [definition, setSettings]);

  useUnsavedChangesPrompt({
    hasUnsavedChanges: hasChanges,
    openConfirm: overlays.openConfirm,
    history,
    http,
    navigateToUrl,
  });

  const areButtonsDisabled =
    isSchedulingGenerationTask ||
    task?.status === 'in_progress' ||
    task?.status === 'being_canceled' ||
    isTaskLoading ||
    isUpdating;

  return (
    <>
      <StreamMetadataForm
        tags={metadata.tags}
        onTagsChange={(tags) => setMetadata((prev) => ({ ...prev, tags }))}
        description={metadata.description}
        onDescriptionChange={(value) => setMetadata((prev) => ({ ...prev, description: value }))}
        showDescription={showDescription}
        disabled={areButtonsDisabled}
        canManage={canManage}
        aiFeatures={aiFeatures}
        isTaskLoading={isTaskLoading}
        task={task}
        taskError={taskError}
        refreshTask={refreshTask}
        getDescriptionGenerationStatus={getDescriptionGenerationStatus}
        scheduleDescriptionGenerationTask={doScheduleGenerationTask}
        cancelDescriptionGenerationTask={cancelDescriptionGenerationTask}
      />

      <EuiHorizontalRule margin="m" />

      {children}

      {isServerless ? null : (
        <>
          <SettingRow
            label={i18n.translate('xpack.streams.settings.indexConfiguration.shardsLabel', {
              defaultMessage: 'Shards',
            })}
            inputLabel={i18n.translate(
              'xpack.streams.settings.indexConfiguration.shardsInputLabel',
              {
                defaultMessage: 'Number of shards',
              }
            )}
            description={i18n.translate(
              'xpack.streams.settings.indexConfiguration.shardsDescription',
              {
                defaultMessage:
                  'Control how the index is split across nodes. More shards can improve parallelism but may increase overhead.',
              }
            )}
            setting={settings['index.number_of_shards']}
            isInvalid={settings['index.number_of_shards']?.invalid}
            onChange={(value) =>
              updateSetting(
                'index.number_of_shards',
                value,
                !!value && (isInvalidInteger(value) || Number(value) === 0)
              )
            }
            onReset={() => onReset('index.number_of_shards')}
          />

          <EuiHorizontalRule margin="m" />

          <SettingRow
            label={i18n.translate('xpack.streams.settings.indexConfiguration.replicasLabel', {
              defaultMessage: 'Replicas',
            })}
            inputLabel={i18n.translate(
              'xpack.streams.settings.indexConfiguration.replicasInputLabel',
              {
                defaultMessage: 'Number of replicas',
              }
            )}
            description={i18n.translate(
              'xpack.streams.settings.indexConfiguration.replicasDescription',
              {
                defaultMessage:
                  'Define how many copies of the data exist. More replicas improve resilience and read performance but increase storage usage.',
              }
            )}
            setting={settings['index.number_of_replicas']}
            isInvalid={settings['index.number_of_replicas']?.invalid}
            onChange={(value) =>
              updateSetting('index.number_of_replicas', value, !!value && isInvalidInteger(value))
            }
            onReset={() => onReset('index.number_of_replicas')}
          />

          <EuiHorizontalRule />
        </>
      )}

      <SettingRow
        label={i18n.translate('xpack.streams.settings.indexConfiguration.refreshIntervalLabel', {
          defaultMessage: 'Refresh Interval',
        })}
        inputLabel={i18n.translate(
          'xpack.streams.settings.indexConfiguration.refreshIntervalInputLabel',
          {
            defaultMessage: 'Refresh interval',
          }
        )}
        description={i18n.translate(
          'xpack.streams.settings.indexConfiguration.refreshIntervalDescription',
          {
            defaultMessage:
              'Control how frequently new data becomes visible for search. A longer interval reduces resource usage; a short one makes data searchable sooner.',
          }
        )}
        setting={settings['index.refresh_interval']}
        isInvalid={settings['index.refresh_interval']?.invalid}
        valueDescription="Accepts time values like 5s, 30s, 1m. Set to -1 to disable."
        onChange={(value) =>
          updateSetting(
            'index.refresh_interval',
            value,
            !!value && !parseDuration(value) && Number(value) !== -1
          )
        }
        onReset={() => onReset('index.refresh_interval')}
      />

      {hasChanges && (
        <SaveChangesBottomBar
          resetAllChanges={resetAllChanges}
          updateSettings={updateAllSettings}
          isUpdating={isUpdating}
          isLoadingDefinition={isLoadingDefinition}
          hasChanges={hasChanges}
          settings={settings}
        />
      )}
    </>
  );
}

const prepareSettings = (input: Record<string, Setting>): IngestStreamSettings => {
  const settings: IngestStreamSettings = {};
  if (input['index.number_of_shards']?.override === true) {
    settings['index.number_of_shards'] = { value: Number(input['index.number_of_shards'].value) };
  }

  if (input['index.number_of_replicas']?.override === true) {
    settings['index.number_of_replicas'] = {
      value: Number(input['index.number_of_replicas'].value),
    };
  }

  if (input['index.refresh_interval']?.override === true) {
    const value = input['index.refresh_interval'].value;
    if (Number(value) === -1) {
      settings['index.refresh_interval'] = { value: -1 };
    } else {
      settings['index.refresh_interval'] = { value: input['index.refresh_interval'].value };
    }
  }

  return settings;
};

function SettingRow({
  label,
  inputLabel,
  description,
  setting,
  valueDescription,
  isInvalid,
  onChange,
  onReset,
}: {
  label: string;
  inputLabel: string;
  description: string;
  setting?: Setting;
  valueDescription?: string;
  isInvalid: boolean;
  onChange: (value: string) => void;
  onReset: () => void;
}) {
  return (
    <Row
      left={<RowMetadata label={label} description={description} />}
      right={
        <EuiFlexGroup direction="column" gutterSize="none">
          <EuiFlexItem>
            <EuiFormRow label={inputLabel}>
              <EuiFieldText
                data-test-subj={`streamsAppSettingsInput-${label}`}
                name={label}
                isInvalid={isInvalid}
                value={setting?.value ?? ''}
                onChange={(e) => onChange(e.target.value)}
              />
            </EuiFormRow>
          </EuiFlexItem>

          <EuiFlexGroup gutterSize="none" direction="column">
            <EuiFlexItem>
              <EuiText color="subdued" size="xs">
                {valueDescription}
              </EuiText>
            </EuiFlexItem>

            <EuiFlexItem>
              <EuiText color="subdued" size="xs">
                {setting?.override ? (
                  <p>
                    {i18n.translate('xpack.streams.streamDetailView.override', {
                      defaultMessage: 'Override.',
                    })}{' '}
                    <EuiLink onClick={() => onReset()}>
                      {i18n.translate('xpack.streams.streamDetailView.resetToDefault', {
                        defaultMessage: 'Reset to default',
                      })}
                    </EuiLink>
                  </p>
                ) : setting?.from ? (
                  <p>
                    {i18n.translate('xpack.streams.streamDetailView.inheritedFrom', {
                      defaultMessage: 'Inherited from',
                    })}{' '}
                    <LinkToStream name={setting.from} />
                  </p>
                ) : null}
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexGroup>
      }
    />
  );
}

const isInvalidInteger = (value: string) => {
  const num = Number(value);
  return isNaN(num) || num < 0 || num % 1 > 0;
};

function LinkToStream({ name }: { name: string }) {
  const router = useStreamsAppRouter();

  return (
    <EuiLink
      data-test-subj="streamsAppLinkToStreamLink"
      target="_blank"
      href={router.link('/{key}/{tab}', {
        path: {
          key: name,
          tab: 'overview',
        },
      })}
    >
      [{name}]
    </EuiLink>
  );
}

const SaveChangesBottomBar = ({
  resetAllChanges,
  updateSettings,
  isUpdating,
  isLoadingDefinition,
  hasChanges,
  settings,
}: {
  resetAllChanges: () => void;
  updateSettings: () => void;
  isUpdating: boolean;
  isLoadingDefinition: boolean;
  hasChanges: boolean;
  settings: Record<string, Setting>;
}) => {
  return (
    <EuiBottomBar data-test-subj="streamsAppSettingsBottomBar">
      <EuiFlexGroup justifyContent="flexEnd">
        <EuiFlexItem grow={false}>
          <EuiFlexGroup gutterSize="s">
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                data-test-subj="streamsAppSettingsCancelButton"
                color="text"
                size="s"
                onClick={resetAllChanges}
              >
                {i18n.translate('xpack.streams.settings.cancelChangesButton', {
                  defaultMessage: 'Cancel',
                })}
              </EuiButtonEmpty>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButton
                data-test-subj="streamsAppSettingsSaveButton"
                color="primary"
                fill
                size="s"
                isLoading={isUpdating || isLoadingDefinition}
                onClick={updateSettings}
                isDisabled={
                  !hasChanges ||
                  isLoadingDefinition ||
                  Object.values(settings).some(({ invalid }) => invalid)
                }
              >
                {i18n.translate('xpack.streams.settings.saveChangesButton', {
                  defaultMessage: 'Save changes',
                })}
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiBottomBar>
  );
};
