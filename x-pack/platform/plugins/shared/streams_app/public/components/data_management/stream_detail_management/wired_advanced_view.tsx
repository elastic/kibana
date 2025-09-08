/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { isEqual, omit } from 'lodash';
import { Streams, isRoot } from '@kbn/streams-schema';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiHorizontalRule,
  EuiLink,
  EuiPanel,
  EuiSpacer,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import { IngestStreamSettings } from '@kbn/streams-schema/src/models/ingest/settings';
import { useAbortController } from '@kbn/react-hooks';
import { useKibana } from '../../../hooks/use_kibana';
import { LinkToStream } from '../stream_detail_lifecycle/modal';
import { getFormattedError } from '../../../util/errors';
import { StreamDeleteModal } from '../../stream_delete_modal';
import { parseDuration } from '../stream_detail_lifecycle/helpers';
import { useStreamDetail } from '../../../hooks/use_stream_detail';

export function WiredAdvancedView({
  definition,
  refreshDefinition,
}: {
  definition: Streams.WiredStream.GetResponse;
  refreshDefinition: () => void;
}) {
  return (
    <>
      <IndexConfiguration definition={definition} refreshDefinition={refreshDefinition}>
        <EuiCallOut
          iconType="warning"
          color="primary"
          title={i18n.translate(
            'xpack.streams.streamDetailView.indexConfiguration.inheritSettingsTitle',
            {
              defaultMessage:
                'Changes will be inherited by child streams unless they override them explicitly.',
            }
          )}
        />
        <EuiSpacer size="l" />
      </IndexConfiguration>

      {!isRoot(definition.stream.name) && (
        <>
          <EuiSpacer />
          <DeleteStreamPanel definition={definition} />
        </>
      )}

      <EuiSpacer />
    </>
  );
}

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
    [isClassicStream, definition, setSettings]
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
                    {i18n.translate('xpack.streams.streamDetailView.localOverride', {
                      defaultMessage: 'Local override. ',
                    })}
                    <EuiLink onClick={() => onReset()}>
                      {i18n.translate('xpack.streams.streamDetailView.resetToDefault', {
                        defaultMessage: 'Reset to default',
                      })}
                    </EuiLink>
                  </p>
                ) : setting?.from ? (
                  <p>
                    {i18n.translate('xpack.streams.streamDetailView.inheritedFrom', {
                      defaultMessage: 'Inherited from ',
                    })}
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

export function RowMetadata({ label, description }: { label: string; description: string }) {
  return (
    <EuiFlexGroup direction="column" gutterSize="xs">
      <EuiFlexItem>
        <EuiText size="m">
          <h4>{label}</h4>
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiText color="subdued" size="s">
          {description}
        </EuiText>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}

export function DeleteStreamPanel({ definition }: { definition: Streams.ingest.all.GetResponse }) {
  const {
    core: {
      application: { navigateToApp },
    },
    dependencies: {
      start: {
        streams: { streamsRepositoryClient },
      },
    },
  } = useKibana();
  const { euiTheme } = useEuiTheme();
  const [showModal, setShowModal] = useState(false);

  const abortController = useAbortController();
  const deleteStream = useCallback(async () => {
    await streamsRepositoryClient.fetch('DELETE /api/streams/{name} 2023-10-31', {
      params: { path: { name: definition.stream.name } },
      signal: abortController.signal,
    });
    navigateToApp('/streams');
  }, [definition]);

  return (
    <>
      {showModal ? (
        <StreamDeleteModal
          name={definition.stream.name}
          onClose={() => setShowModal(false)}
          onCancel={() => setShowModal(false)}
          onDelete={deleteStream}
        />
      ) : null}

      <EuiPanel
        style={{ border: `1px solid ${euiTheme.colors.danger}` }}
        hasBorder={true}
        hasShadow={false}
        paddingSize="none"
        grow={false}
      >
        <EuiPanel hasShadow={false} color="subdued">
          <EuiText size="s" color="danger">
            <h3>
              {i18n.translate('xpack.streams.streamDetailView.indexConfiguration', {
                defaultMessage: 'Delete stream',
              })}
            </h3>
          </EuiText>
        </EuiPanel>

        <EuiPanel hasShadow={false} hasBorder={false}>
          <Row
            left={
              <EuiFlexGroup direction="column" gutterSize="xs">
                <EuiFlexItem>
                  <EuiText size="s">
                    {i18n.translate('xpack.streams.streamDetailView.deleteStreamText', {
                      defaultMessage:
                        'Permanently delete your stream and all its contents from Elastic. This action is not reversible, so please proceed with caution.',
                    })}
                  </EuiText>
                </EuiFlexItem>
              </EuiFlexGroup>
            }
            right={
              <EuiFlexGroup>
                <EuiFlexItem grow={false}>
                  <EuiButton color="danger" fill onClick={() => setShowModal((prev) => !prev)}>
                    {i18n.translate('xpack.streams.streamDetailView.deleteStreamButton', {
                      defaultMessage: 'Delete stream',
                    })}
                  </EuiButton>
                </EuiFlexItem>
              </EuiFlexGroup>
            }
          />
        </EuiPanel>
      </EuiPanel>
    </>
  );
}

export function Row({ left, right }: { left: React.ReactNode; right: React.ReactNode }) {
  return (
    <EuiFlexGroup alignItems="center">
      <EuiFlexItem grow={2}>{left}</EuiFlexItem>
      <EuiFlexItem grow={5}>{right}</EuiFlexItem>
    </EuiFlexGroup>
  );
}

const isInvalidInteger = (value: string) => {
  const num = Number(value);
  return isNaN(num) || num < 1 || num % 1 > 0;
};

export function IndexConfiguration({
  definition,
  refreshDefinition,
  children,
}: {
  definition: Streams.ingest.all.GetResponse;
  refreshDefinition: () => void;
  children?: React.ReactNode;
}) {
  return (
    <EuiPanel hasBorder={true} hasShadow={false} paddingSize="none" grow={false}>
      <EuiPanel hasShadow={false} color="subdued">
        <EuiText size="s">
          <h3>
            {i18n.translate('xpack.streams.streamDetailView.indexConfiguration', {
              defaultMessage: 'Index Configuration',
            })}
          </h3>
        </EuiText>
      </EuiPanel>

      <EuiPanel hasShadow={false} hasBorder={false}>
        <Settings definition={definition} refreshDefinition={refreshDefinition}>
          {children}
        </Settings>
      </EuiPanel>
    </EuiPanel>
  );
}
