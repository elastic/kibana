/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { isEqual, omit } from 'lodash';
import { FormattedMessage } from '@kbn/i18n-react';
import { isRoot, type Streams } from '@kbn/streams-schema';
import {
  copyToClipboard,
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiHorizontalRule,
  EuiIcon,
  EuiLink,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
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

export function WiredAdvancedView({
  definition,
  refreshDefinition,
}: {
  definition: Streams.WiredStream.GetResponse;
  refreshDefinition: () => void;
}) {
  const { isServerless } = useKibana();

  return (
    <>
      <IndexConfiguration definition={definition} refreshDefinition={refreshDefinition} />

      <EuiSpacer />

      {!isRoot(definition.stream.name) && <DeleteStreamPanel definition={definition} />}
    </>
  );
}

function toStringValues(settings: IngestStreamSettings) {
  return Object.entries(settings).reduce<Record<string, { value: string; from?: string }>>(
    (acc, [key, setting]) => {
      acc[key] = { ...setting, value: String(setting.value) };
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
  const {
    core: { notifications },
    dependencies: {
      start: {
        streams: { streamsRepositoryClient },
      },
    },
  } = useKibana();
  const [settings, setSettings] = useState<Record<string, { value: string; from?: string }>>(
    toStringValues(definition.effective_settings)
  );
  const hasChanges = useMemo(() => {
    return !isEqual(toStringValues(definition.effective_settings), settings);
  }, [settings]);
  const abortController = useAbortController();
  const [isUpdating, setIsUpdating] = useState(false);

  const updateSettings = useCallback(async () => {
    setIsUpdating(true);
    try {
      await streamsRepositoryClient.fetch('PUT /api/streams/{name}/_ingest 2023-10-31', {
        params: {
          path: { name: definition.stream.name },
          body: {
            ingest: {
              ...definition.stream.ingest,
              settings: prepareSettings(settings),
            },
          },
        },
        signal: abortController.signal,
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

  return (
    <>
      {children}

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
        isInvalid={
          settings['index.number_of_shards'] &&
          isInvalidInteger(settings['index.number_of_shards'].value)
        }
        onChange={(value) => {
          if (value.length === 0) {
            setSettings((prev) => omit(prev, 'index.number_of_shards'));
          } else {
            setSettings((prev) => ({
              ...prev,
              'index.number_of_shards': { value, from: definition.stream.name },
            }));
          }
        }}
      />

      <EuiHorizontalRule margin="m" />

      <SettingRow
        definition={definition}
        label={i18n.translate('xpack.streams.streamDetailView.indexConfiguration.replicasLabel', {
          defaultMessage: 'Replicas',
        })}
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
        isInvalid={
          settings['index.number_of_replicas'] &&
          isInvalidInteger(settings['index.number_of_replicas'].value)
        }
        onChange={(value) => {
          if (value.length === 0) {
            setSettings((prev) => omit(prev, 'index.number_of_replicas'));
          } else {
            setSettings((prev) => ({
              ...prev,
              'index.number_of_replicas': { value, from: definition.stream.name },
            }));
          }
        }}
      />

      <EuiHorizontalRule />

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
        isInvalid={false}
        valueDescription="Accepts time values like 5s, 30s, 1m. Set to -1 to disable."
        onChange={(value) => {
          if (value.length === 0) {
            setSettings((prev) => omit(prev, 'index.refresh_interval'));
          } else {
            setSettings((prev) => ({
              ...prev,
              'index.refresh_interval': { value, from: definition.stream.name },
            }));
          }
        }}
      />

      <EuiHorizontalRule />

      <EuiFlexGroup>
        <EuiFlexItem grow={false}>
          <EuiButton
            isLoading={isUpdating}
            isDisabled={!hasChanges}
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

const prepareSettings = (input: Record<string, { value: string }>): IngestStreamSettings => {
  const settings: IngestStreamSettings = {};
  if (input['index.number_of_shards']) {
    settings['index.number_of_shards'] = { value: Number(input['index.number_of_shards'].value) };
  }

  if (input['index.number_of_replicas']) {
    settings['index.number_of_replicas'] = {
      value: Number(input['index.number_of_replicas'].value),
    };
  }

  if (input['index.refresh_interval']) {
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
}: {
  definition: Streams.ingest.all.GetResponse;
  label: string;
  inputLabel: string;
  description: string;
  setting?: { value: string; from?: string };
  valueDescription?: string;
  isInvalid: boolean;
  onChange: (value: string) => void;
}) {
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
                value={setting?.value ?? ''}
                onChange={(e) => onChange(e.target.value)}
              />
            </EuiFormRow>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiText color="subdued" size="xs">
              {!setting?.from ? null : setting.from === definition.stream.name ? (
                <>
                  Local override. <EuiLink onClick={() => onChange('')}>Reset to default</EuiLink>
                </>
              ) : (
                <>
                  Inherited from <LinkToStream name={setting.from} />
                </>
              )}
              {valueDescription}
            </EuiText>
          </EuiFlexItem>
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
  const [streamName, setStreamName] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const abortController = useAbortController();
  const deleteStream = useCallback(async () => {
    setIsDeleting(true);
    await streamsRepositoryClient.fetch('DELETE /api/streams/{name} 2023-10-31', {
      params: { path: { name: definition.stream.name } },
      signal: abortController.signal,
    });
    navigateToApp('/streams');
  }, [definition]);

  return (
    <>
      {showModal ? (
        <EuiModal onClose={() => setShowModal(false)}>
          <EuiModalHeader>
            <EuiModalHeaderTitle>
              {i18n.translate('xpack.streams.streamDetailView.deleteStreamModal.title', {
                defaultMessage: 'Delete {stream} ?',
                values: { stream: definition.stream.name },
              })}
            </EuiModalHeaderTitle>
          </EuiModalHeader>

          <EuiModalBody>
            <EuiCallOut
              color="warning"
              iconType="warning"
              title={
                <FormattedMessage
                  id="xpack.streams.streamDetailView.deleteStreamModal.warningText"
                  defaultMessage="This action cannot be undone and permanently deletes the {stream} stream and all its contents."
                  values={{
                    stream: (
                      <EuiLink
                        onClick={(e: React.MouseEvent<HTMLAnchorElement>) => {
                          e.currentTarget.blur();
                          copyToClipboard(definition.stream.name);
                        }}
                      >
                        {definition.stream.name} <EuiIcon type="copy" />
                      </EuiLink>
                    ),
                  }}
                />
              }
            />

            <EuiSpacer size="m" />

            <EuiFormRow
              fullWidth
              label={i18n.translate(
                'xpack.streams.streamDetailView.deleteStreamModal.confirmationInputLabel',
                {
                  defaultMessage: 'Type the stream name to confirm',
                }
              )}
            >
              <EuiFieldText
                onChange={(e) => setStreamName(e.target.value)}
                fullWidth
                name={'stream-name-deletion'}
              />
            </EuiFormRow>
          </EuiModalBody>

          <EuiModalFooter>
            <EuiButtonEmpty onClick={() => setShowModal(false)}>
              {i18n.translate('xpack.streams.streamDetailView.deleteStreamModal.cancelButton', {
                defaultMessage: 'Cancel',
              })}
            </EuiButtonEmpty>

            <EuiButton
              isDisabled={streamName !== definition.stream.name}
              isLoading={isDeleting}
              color="danger"
              onClick={() => deleteStream()}
              fill
            >
              {i18n.translate('xpack.streams.streamDetailView.deleteStreamModal.deleteButton', {
                defaultMessage: 'Delete',
              })}
            </EuiButton>
          </EuiModalFooter>
        </EuiModal>
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
