/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiFlyout,
  EuiFlyoutHeader,
  EuiFlyoutBody,
  EuiTitle,
  EuiSwitch,
  EuiLoadingSpinner,
  EuiModal,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiModalBody,
  EuiModalFooter,
  EuiCheckbox,
  EuiButton,
  EuiButtonEmpty,
  EuiSpacer,
  EuiBetaBadge,
  EuiDescribedFormGroup,
  EuiFormRow,
  EuiFlexGroup,
  EuiButtonGroup,
  EuiCodeBlock,
  useGeneratedHtmlId,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useAbortController } from '@kbn/react-hooks';
import { useKibana } from '../../hooks/use_kibana';
import { useStreamsPrivileges } from '../../hooks/use_streams_privileges';

export function StreamsSettingsFlyout({
  onClose,
  refreshStreams,
}: {
  onClose: () => void;
  refreshStreams: () => void;
}) {
  const { signal } = useAbortController();
  const context = useKibana();
  const {
    dependencies: {
      start: {
        streams: { wiredStatus$, enableWiredMode, disableWiredMode },
      },
    },
    core,
    services: { telemetryClient },
  } = context;

  const {
    ui: { manage: canManageWiredKibana },
  } = useStreamsPrivileges();

  const [canManageWiredElasticsearch, setCanManageWiredElasticsearch] =
    React.useState<boolean>(true);

  const [wiredChecked, setWiredChecked] = React.useState<boolean | undefined>(undefined);
  const [loading, setLoading] = React.useState(true);
  const [showDisableModal, setShowDisableModal] = React.useState(false);
  const [disableConfirmChecked, setDisableConfirmChecked] = React.useState(false);
  const [isDisabling, setIsDisabling] = React.useState(false);

  React.useEffect(() => {
    const sub = wiredStatus$.subscribe((status) => {
      setWiredChecked(status.enabled === true);
      setCanManageWiredElasticsearch(Boolean(status.can_manage));
      setLoading(false);
    });
    return () => sub.unsubscribe();
  }, [wiredStatus$]);

  const handleSwitchChange = async () => {
    if (wiredChecked) {
      setShowDisableModal(true);
    } else {
      try {
        setLoading(true);
        await enableWiredMode(signal);
        telemetryClient.trackWiredStreamsStatusChanged({ is_enabled: true });
        refreshStreams();
      } catch (error) {
        core.notifications.toasts.addError(error, {
          title: i18n.translate('xpack.streams.streamsListView.enableWiredStreamsErrorToastTitle', {
            defaultMessage: 'Error updating wired streams setting',
          }),
          toastMessage:
            error?.body?.message || (error instanceof Error ? error.message : String(error)),
          toastLifeTimeMs: 5000,
        });
      } finally {
        setLoading(false);
      }
    }
  };

  const handleDisableConfirm = async () => {
    setIsDisabling(true);
    try {
      await disableWiredMode(signal);
      telemetryClient.trackWiredStreamsStatusChanged({ is_enabled: false });
      refreshStreams();
      setShowDisableModal(false);
      setDisableConfirmChecked(false);
    } catch (error) {
      core.notifications.toasts.addError(error, {
        title: i18n.translate('xpack.streams.streamsListView.enableWiredStreamsErrorToastTitle', {
          defaultMessage: 'Error updating wired streams setting',
        }),
        toastMessage:
          error?.body?.message || (error instanceof Error ? error.message : String(error)),
        toastLifeTimeMs: 5000,
      });
    } finally {
      setIsDisabling(false);
      setLoading(false);
    }
  };

  // Shipper button group state
  const shipperButtonGroupPrefix = useGeneratedHtmlId({ prefix: 'shipperButtonGroup' });
  const shipperOptions = [
    {
      id: `${shipperButtonGroupPrefix}__otel`,
      label: 'OTel',
    },
    {
      id: `${shipperButtonGroupPrefix}__filebeat`,
      label: 'Filebeat',
    },
    {
      id: `${shipperButtonGroupPrefix}__logstash`,
      label: 'Logstash',
    },
  ];
  const [selectedShipperId, setSelectedShipperId] = React.useState(
    `${shipperButtonGroupPrefix}__otel`
  );

  const shipperConfigExamples: Record<string, string> = {
    [`${shipperButtonGroupPrefix}__otel`]: `processors:
  transform/logs-streams:
    log_statements:
      - context: resource
        statements:
          - set(attributes["elasticsearch.index"], "logs")

service:
  pipelines:
    logs:
      receivers: [myreceiver] # works with any logs receiver
      processors: [transform/logs-streams]
      exporters: [elasticsearch, otlp] # works with either`,
    [`${shipperButtonGroupPrefix}__filebeat`]: `filebeat.inputs:
  - type: filestream
    id: my-filestream-id
    index: logs
    enabled: true  
    paths:
      - /var/log/*.log

# No need to install templates for wired streams
setup:
  template:
    enabled: false

output.elasticsearch:
  hosts: ["<elasticsearch-host>"]
  api_key: "<your-api-key>"`,
    [`${shipperButtonGroupPrefix}__logstash`]: `output {
  elasticsearch {
    hosts => ["<elasticsearch-host>"]
    api_key => "<your-api-key>"
    index => "logs"
    action => "create"
  }
}`,
  };

  return (
    <>
      <EuiFlyout
        onClose={onClose}
        size="m"
        maxWidth={700}
        aria-labelledby="streamsSettingsFlyoutTitle"
      >
        <EuiFlyoutHeader hasBorder>
          <EuiTitle size="m">
            <h2 id="streamsSettingsFlyoutTitle">
              {i18n.translate('xpack.streams.streamsListView.settingsFlyoutTitle', {
                defaultMessage: 'Streams Settings',
              })}
            </h2>
          </EuiTitle>
        </EuiFlyoutHeader>
        <EuiFlyoutBody>
          <EuiDescribedFormGroup
            fullWidth
            descriptionFlexItemProps={{ grow: 2 }}
            title={
              <h3>
                <EuiFlexGroup gutterSize="s">
                  {i18n.translate('xpack.streams.streamsListView.wiredStreamsTitle', {
                    defaultMessage: 'Wired Streams',
                  })}
                  <EuiBetaBadge
                    label={i18n.translate('xpack.streams.streamsListView.betaBadgeLabel', {
                      defaultMessage: 'Technical Preview',
                    })}
                    tooltipContent={i18n.translate(
                      'xpack.streams.streamsListView.betaBadgeDescription',
                      {
                        defaultMessage:
                          'This functionality is experimental and not supported. It may change or be removed at any time.',
                      }
                    )}
                    alignment="middle"
                    size="s"
                  />
                </EuiFlexGroup>
              </h3>
            }
            description={
              <p>
                {i18n.translate('xpack.streams.streamsListView.wiredStreamsDescription', {
                  defaultMessage:
                    'Send data to Elasticsearch and process it with a clear hierarchy, with inherited settings and managed components. If disabled, some features won’t work as expected.',
                })}
              </p>
            }
          >
            <EuiFormRow fullWidth>
              {loading ? (
                <EuiLoadingSpinner size="l" />
              ) : (
                <EuiSwitch
                  label={i18n.translate(
                    'xpack.streams.streamsListView.enableWiredStreamsSwitchLabel',
                    {
                      defaultMessage: 'Enable wired streams',
                    }
                  )}
                  checked={Boolean(wiredChecked)}
                  onChange={handleSwitchChange}
                  data-test-subj="streamsWiredSwitch"
                  disabled={!(canManageWiredKibana && canManageWiredElasticsearch)}
                />
              )}
            </EuiFormRow>
          </EuiDescribedFormGroup>
          <EuiFlexGroup direction="column" gutterSize="s">
            <EuiText size="xs">
              <h3>
                {i18n.translate('xpack.streams.streamsListView.shipperConfigTitle', {
                  defaultMessage: 'Configure your shippers',
                })}
              </h3>
            </EuiText>
            <EuiText color="subdued" size="s">
              <p>
                {i18n.translate('xpack.streams.streamsListView.shipperConfigDescription', {
                  defaultMessage:
                    'Send logs data to wired streams. Check the documentation for more info.',
                })}
              </p>
            </EuiText>
            <EuiButtonGroup
              legend={i18n.translate('xpack.streams.streamsListView.shipperButtonGroupLegend', {
                defaultMessage: 'Select shipper type',
              })}
              options={shipperOptions}
              idSelected={selectedShipperId}
              onChange={setSelectedShipperId}
              buttonSize="m"
              isFullWidth={false}
              data-test-subj="streamsShipperButtonGroup"
            />
            <EuiCodeBlock
              language="yaml"
              isCopyable
              paddingSize="m"
              data-test-subj="streamsShipperConfigExample"
            >
              {shipperConfigExamples[selectedShipperId]}
            </EuiCodeBlock>
          </EuiFlexGroup>
        </EuiFlyoutBody>
      </EuiFlyout>
      {showDisableModal && (
        <EuiModal
          onClose={() => {
            setShowDisableModal(false);
            setDisableConfirmChecked(false);
          }}
          aria-labelledby="streamsWiredDisableModalTitle"
        >
          <EuiModalHeader>
            <EuiModalHeaderTitle id="streamsWiredDisableModalTitle">
              {i18n.translate('xpack.streams.streamsSettingsFlyout.disableModalTitle', {
                defaultMessage: 'Disable Wired Streams?',
              })}
            </EuiModalHeaderTitle>
          </EuiModalHeader>
          <EuiModalBody>
            {i18n.translate('xpack.streams.streamsSettingsFlyout.disableModalDescription', {
              defaultMessage:
                'Disabling Wired Streams will permanently delete all stored data and configuration. This action cannot be undone.',
            })}
            <EuiSpacer size="m" />
            <EuiCheckbox
              id="wiredDisableConfirm"
              checked={disableConfirmChecked}
              onChange={(e) => setDisableConfirmChecked(e.target.checked)}
              label={i18n.translate('xpack.streams.streamsSettingsFlyout.disableModalCheckbox', {
                defaultMessage: 'I understand this will delete all data and configuration.',
              })}
            />
          </EuiModalBody>
          <EuiModalFooter>
            <EuiButtonEmpty
              onClick={() => {
                setShowDisableModal(false);
                setDisableConfirmChecked(false);
              }}
              disabled={isDisabling}
            >
              {i18n.translate('xpack.streams.streamsSettingsFlyout.disableModalCancel', {
                defaultMessage: 'Cancel',
              })}
            </EuiButtonEmpty>
            <EuiButton
              color="danger"
              fill
              isLoading={isDisabling}
              disabled={!disableConfirmChecked}
              onClick={handleDisableConfirm}
              data-test-subj="streamsWiredDisableConfirmButton"
            >
              {i18n.translate('xpack.streams.streamsSettingsFlyout.disableModalDisableButton', {
                defaultMessage: 'Disable Wired Streams',
              })}
            </EuiButton>
          </EuiModalFooter>
        </EuiModal>
      )}
    </>
  );
}
