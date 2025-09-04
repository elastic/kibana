/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useState } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { Streams } from '@kbn/streams-schema';
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
} from '@elastic/eui';
import { useKibana } from '../../../hooks/use_kibana';

export function WiredAdvancedView({
  definition,
  refreshDefinition,
}: {
  definition: Streams.WiredStream.GetResponse;
  refreshDefinition: () => void;
}) {
  const { isServerless } = useKibana();

  const [settings, setSettings] = useState({
    'index.number_of_shards': definition.effective_settings['index.number_of_shards']?.value,
    'index.number_of_replicas': definition.effective_settings['index.number_of_replicas']?.value,
    'index.refresh_interval': definition.effective_settings['index.refresh_interval']?.value,
  });

  return (
    <>
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
          <SettingRow
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
            value={settings['index.number_of_shards']}
            onChange={(value) =>
              setSettings((prev) => ({
                ...prev,
                'index.number_of_shards': Number(value),
              }))
            }
          />

          <EuiHorizontalRule margin="m" />

          <SettingRow
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
            value={settings['index.number_of_replicas']}
            onChange={(value) =>
              setSettings((prev) => ({
                ...prev,
                'index.number_of_replicas': Number(value),
              }))
            }
          />

          <EuiHorizontalRule />

          <SettingRow
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
            value={settings['index.refresh_interval']}
            onChange={(value) =>
              setSettings((prev) => ({
                ...prev,
                'index.refresh_interval': String(value),
              }))
            }
          />
        </EuiPanel>
      </EuiPanel>

      <EuiSpacer />

      <DeleteStreamPanel definition={definition} />
    </>
  );
}

function SettingRow({
  label,
  inputLabel,
  description,
  value,
  onChange,
}: {
  label: string;
  inputLabel: string;
  description: string;
  value?: number | string;
  onChange: (value: number | string) => void;
}) {
  return (
    <EuiFlexGroup alignItems="center">
      <EuiFlexItem grow={2}>
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
      </EuiFlexItem>

      <EuiFlexItem grow={5}>
        <EuiFlexGroup>
          <EuiFlexItem>
            <EuiFormRow label={inputLabel}>
              <EuiFieldText name={label} />
            </EuiFormRow>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}

function DeleteStreamPanel({ definition }: { definition: Streams.ingest.all.GetResponse }) {
  const [showModal, setShowModal] = useState(false);
  const [streamName, setStreamName] = useState('');

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

            <EuiSpacer size="s" />

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
              color="danger"
              onClick={() => setShowModal(false)}
              fill
            >
              {i18n.translate('xpack.streams.streamDetailView.deleteStreamModal.deleteButton', {
                defaultMessage: 'Delete',
              })}
            </EuiButton>
          </EuiModalFooter>
        </EuiModal>
      ) : null}

      <EuiPanel hasBorder={true} hasShadow={false} paddingSize="none" grow={false}>
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
          <EuiFlexGroup alignItems="center">
            <EuiFlexItem grow={2}>
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
            </EuiFlexItem>

            <EuiFlexItem grow={5}>
              <EuiFlexGroup>
                <EuiFlexItem grow={false}>
                  <EuiButton color="danger" fill onClick={() => setShowModal((prev) => !prev)}>
                    {i18n.translate('xpack.streams.streamDetailView.deleteStreamButton', {
                      defaultMessage: 'Delete stream',
                    })}
                  </EuiButton>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiPanel>
      </EuiPanel>
    </>
  );
}
