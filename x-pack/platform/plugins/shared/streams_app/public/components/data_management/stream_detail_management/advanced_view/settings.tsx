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
import { Streams } from '@kbn/streams-schema';
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
import { useKibana } from '../../../../hooks/use_kibana';
import { getFormattedError } from '../../../../util/errors';
import { useStreamsAppRouter } from '../../../../hooks/use_streams_app_router';
import { useStreamDetail } from '../../../../hooks/use_stream_detail';
import { Row, RowMetadata } from './row';
import { parseDuration } from '../../stream_detail_lifecycle/helpers/helpers';

interface Setting {
  invalid: boolean;
  value: string;
  override: boolean;
  from?: string;
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

export function Settings({
  definition,
  refreshDefinition,
  children,
}: {
  definition: Streams.ingest.all.GetResponse;
  refreshDefinition: () => void;
  children?: React.ReactNode;
}) {
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

  const hasChanges = useMemo(() => {
    const keys = [...new Set([...Object.keys(originalSettings), ...Object.keys(settings)])];
    return keys.some((key) => originalSettings[key]?.value !== settings[key]?.value);
  }, [originalSettings, settings]);

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
  const abortController = useAbortController();
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

  const updateSettings = useCallback(async () => {
    setIsUpdating(true);
    try {
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
    abortController.signal,
    streamsRepositoryClient,
    notifications.toasts,
    refreshDefinition,
  ]);

  useEffect(() => {
    if (!definition) return;
    setSettings(toStringValues(definition.stream.ingest.settings, definition.effective_settings));
  }, [definition, setSettings]);

  useUnsavedChangesPrompt({
    hasUnsavedChanges: hasChanges,
    openConfirm: overlays.openConfirm,
    history,
    http,
    navigateToUrl,
  });

  return (
    <>
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
          setSettings={setSettings}
          updateSettings={updateSettings}
          isUpdating={isUpdating}
          isLoadingDefinition={isLoadingDefinition}
          definition={definition}
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
  setSettings,
  updateSettings,
  isUpdating,
  isLoadingDefinition,
  definition,
  hasChanges,
  settings,
}: {
  setSettings: (settings: Record<string, Setting>) => void;
  updateSettings: () => void;
  isUpdating: boolean;
  isLoadingDefinition: boolean;
  definition: Streams.ingest.all.GetResponse;
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
                onClick={() =>
                  setSettings(
                    toStringValues(definition.stream.ingest.settings, definition.effective_settings)
                  )
                }
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
