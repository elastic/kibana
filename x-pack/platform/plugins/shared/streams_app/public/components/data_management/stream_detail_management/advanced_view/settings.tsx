/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { isEqual, omit } from 'lodash';
import { Streams } from '@kbn/streams-schema';
import {
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
import { IngestStreamSettings } from '@kbn/streams-schema/src/models/ingest/settings';
import { useAbortController } from '@kbn/react-hooks';
import { useKibana } from '../../../../hooks/use_kibana';
import { getFormattedError } from '../../../../util/errors';
import { useStreamDetail } from '../../../../hooks/use_stream_detail';
import { Row, RowMetadata } from './row';
import { parseDuration } from '../../stream_detail_lifecycle/helpers/helpers';
import { LinkToStream } from '../../stream_detail_lifecycle/general_data/modal';

interface Setting {
  default: boolean;
  invalid: boolean;
  value: string;
  from?: string;
}

function toStringValues(settings: IngestStreamSettings, effectiveSettings: IngestStreamSettings) {
  return Object.entries(effectiveSettings).reduce<Record<string, Setting>>(
    (acc, [key, setting]) => {
      acc[key] = {
        ...setting,
        value: String(setting.value),
        invalid: false,
        default: !settings[key as keyof IngestStreamSettings] && !('from' in setting),
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
    core: { notifications },
    dependencies: {
      start: {
        streams: { streamsRepositoryClient },
      },
    },
  } = useKibana();
  const originalSettings = useMemo(
    () => toStringValues(definition.stream.ingest.settings, definition.effective_settings),
    [definition]
  );
  const isClassicStream = useMemo(
    () => Streams.ClassicStream.GetResponse.is(definition),
    [definition]
  );
  const [settings, setSettings] = useState<Record<string, Setting>>({});
  const hasChanges = useMemo(
    () => !isEqual(originalSettings, settings),
    [originalSettings, settings]
  );
  const updateSetting = useCallback(
    (name: string, value: string, invalid: boolean) => {
      if (value.length === 0) {
        setSettings((prev) => omit(prev, name));
      } else {
        const setting: Setting = { value, invalid, default: false };
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
    [originalSettings, isClassicStream]
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
              settings: prepareSettings(definition, settings),
            },
          },
        },
        signal: abortController.signal,
      });

      notifications.toasts.addSuccess({
        title: i18n.translate('xpack.streams.successfullyUpdatedSettings', {
          defaultMessage: 'Settings updated',
        }),
      });

      refreshDefinition();
    } catch (error) {
      notifications.toasts.addError(error, {
        title: i18n.translate('xpack.streams.failedToUpdateSettings', {
          defaultMessage: 'Failed to update settings',
        }),
        toastMessage: getFormattedError(error).message,
      });
    } finally {
      setIsUpdating(false);
    }
  }, [definition, settings]);

  useEffect(() => {
    if (!definition) return;
    setSettings(toStringValues(definition.stream.ingest.settings, definition.effective_settings));
  }, [definition, setSettings]);

  return (
    <>
      {children}

      {isServerless ? null : (
        <>
          <SettingRow
            definition={definition}
            label={i18n.translate('xpack.streams.streamDetailView.indexConfiguration.shardsLabel', {
              defaultMessage: 'Shards',
            })}
            inputLabel={i18n.translate(
              'xpack.streams.streamDetailView.indexConfiguration.shardsInputLabel',
              {
                defaultMessage: 'Number of shards',
              }
            )}
            description={i18n.translate(
              'xpack.streams.streamDetailView.indexConfiguration.shardsDescription',
              {
                defaultMessage:
                  'Control how the index is split across nodes. More shards can improve parallelism but may increase overhead.',
              }
            )}
            setting={settings['index.number_of_shards']}
            isInvalid={settings['index.number_of_shards']?.invalid}
            onChange={(value) =>
              updateSetting('index.number_of_shards', value, !!value && isInvalidInteger(value))
            }
            onReset={() => onReset('index.number_of_shards')}
          />

          <EuiHorizontalRule margin="m" />

          <SettingRow
            definition={definition}
            label={i18n.translate(
              'xpack.streams.streamDetailView.indexConfiguration.replicasLabel',
              {
                defaultMessage: 'Replicas',
              }
            )}
            inputLabel={i18n.translate(
              'xpack.streams.streamDetailView.indexConfiguration.replicasInputLabel',
              {
                defaultMessage: 'Number of replicas',
              }
            )}
            description={i18n.translate(
              'xpack.streams.streamDetailView.indexConfiguration.replicasDescription',
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
        definition={definition}
        label={i18n.translate(
          'xpack.streams.streamDetailView.indexConfiguration.refreshIntervalLabel',
          {
            defaultMessage: 'Refresh Interval',
          }
        )}
        inputLabel={i18n.translate(
          'xpack.streams.streamDetailView.indexConfiguration.refreshIntervalInputLabel',
          {
            defaultMessage: 'Refresh interval',
          }
        )}
        description={i18n.translate(
          'xpack.streams.streamDetailView.indexConfiguration.refreshIntervalDescription',
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

      <EuiHorizontalRule />

      <EuiFlexGroup>
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            isDisabled={!hasChanges || isUpdating}
            onClick={() =>
              setSettings(
                toStringValues(definition.stream.ingest.settings, definition.effective_settings)
              )
            }
          >
            {i18n.translate('xpack.streams.streamDetailView.cancelChangesButton', {
              defaultMessage: 'Cancel',
            })}
          </EuiButtonEmpty>
        </EuiFlexItem>

        <EuiFlexItem grow={false}>
          <EuiButton
            isLoading={isUpdating || isLoadingDefinition}
            isDisabled={
              !hasChanges ||
              isLoadingDefinition ||
              Object.values(settings).some(({ invalid }) => invalid)
            }
            color="primary"
            fill
            onClick={updateSettings}
          >
            {i18n.translate('xpack.streams.streamDetailView.saveChangesButton', {
              defaultMessage: 'Save changes',
            })}
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
}

const prepareSettings = (
  definition: Streams.ingest.all.GetResponse,
  input: Record<string, { value: string; from?: string }>
): IngestStreamSettings => {
  const isInherited = (name: string) => {
    const val = input[name];
    return val && val.from && val.from !== definition.stream.name;
  };

  const settings: IngestStreamSettings = {};
  if (input['index.number_of_shards'] && !isInherited('index.number_of_shards')) {
    settings['index.number_of_shards'] = { value: Number(input['index.number_of_shards'].value) };
  }

  if (input['index.number_of_replicas'] && !isInherited('index.number_of_replicas')) {
    settings['index.number_of_replicas'] = {
      value: Number(input['index.number_of_replicas'].value),
    };
  }

  if (input['index.refresh_interval'] && !isInherited('index.refresh_interval')) {
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
  definition,
  label,
  inputLabel,
  description,
  setting,
  valueDescription,
  isInvalid,
  onChange,
  onReset,
}: {
  definition: Streams.ingest.all.GetResponse;
  label: string;
  inputLabel: string;
  description: string;
  setting?: { value: string; default: boolean; from?: string };
  valueDescription?: string;
  isInvalid: boolean;
  onChange: (value: string) => void;
  onReset: () => void;
}) {
  const isOverride =
    (!!setting?.value && Streams.ClassicStream.GetResponse.is(definition)) ||
    setting?.from === definition.stream.name;
  return (
    <Row
      left={<RowMetadata label={label} description={description} />}
      right={
        <EuiFlexGroup direction="column" gutterSize="none">
          <EuiFlexItem>
            <EuiFormRow label={inputLabel}>
              <EuiFieldText
                name={label}
                isInvalid={isInvalid}
                placeholder={setting?.default ? `${setting.value} (default)` : ''}
                value={!setting?.default ? setting?.value ?? '' : ''}
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
                {isOverride ? (
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
  return isNaN(num) || num < 1 || num % 1 > 0;
};
