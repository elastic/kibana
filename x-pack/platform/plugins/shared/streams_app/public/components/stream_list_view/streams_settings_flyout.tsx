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
  EuiLink,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useAbortController } from '@kbn/react-hooks';
import { FormattedMessage } from '@kbn/i18n-react';
import { OBSERVABILITY_STREAMS_ENABLE_SIGNIFICANT_EVENTS } from '@kbn/management-settings-ids';
import useAsyncFn from 'react-use/lib/useAsyncFn';
import { useKibana } from '../../hooks/use_kibana';
import { useStreamsPrivileges } from '../../hooks/use_streams_privileges';
import { getFormattedError } from '../../util/errors';

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
        streams: { getWiredStatus, enableWiredMode, disableWiredMode },
      },
    },
    core,
    services: { telemetryClient },
  } = context;

  const {
    ui: { manage: canManageWiredKibana },
    features: { significantEvents },
  } = useStreamsPrivileges();

  const [canManageWiredElasticsearch, setCanManageWiredElasticsearch] =
    React.useState<boolean>(true);

  const [wiredChecked, setWiredChecked] = React.useState<boolean | undefined>(undefined);
  const [loading, setLoading] = React.useState(true);
  const [showDisableModal, setShowDisableModal] = React.useState(false);
  const [disableConfirmChecked, setDisableConfirmChecked] = React.useState(false);
  const [isDisabling, setIsDisabling] = React.useState(false);

  React.useEffect(() => {
    const fetchWiredStatus = async () => {
      try {
        const status = await getWiredStatus();
        setWiredChecked(status.enabled === true);
        setCanManageWiredElasticsearch(Boolean(status.can_manage));
      } catch (error) {
        core.notifications.toasts.addError(getFormattedError(error), {
          title: i18n.translate('xpack.streams.streamsListView.fetchWiredStatusErrorToastTitle', {
            defaultMessage: 'Error fetching wired streams status',
          }),
        });
      } finally {
        setLoading(false);
      }
    };

    fetchWiredStatus();
  }, [getWiredStatus, core.notifications.toasts]);

  const handleSwitchChange = async () => {
    if (wiredChecked) {
      setShowDisableModal(true);
    } else {
      try {
        setLoading(true);
        await enableWiredMode(signal);
        telemetryClient.trackWiredStreamsStatusChanged({ is_enabled: true });
        setWiredChecked(true);
        refreshStreams();
      } catch (error) {
        core.notifications.toasts.addError(getFormattedError(error), {
          title: i18n.translate('xpack.streams.streamsListView.enableWiredStreamsErrorToastTitle', {
            defaultMessage: 'Error updating wired streams setting',
          }),
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
      setWiredChecked(false);
      refreshStreams();
      setShowDisableModal(false);
      setDisableConfirmChecked(false);
    } catch (error) {
      core.notifications.toasts.addError(getFormattedError(error), {
        title: i18n.translate('xpack.streams.streamsListView.enableWiredStreamsErrorToastTitle', {
          defaultMessage: 'Error updating wired streams setting',
        }),
        toastLifeTimeMs: 5000,
      });
    } finally {
      setIsDisabling(false);
      setLoading(false);
    }
  };

  const [{ loading: isChangingSignificantEvents }, toggleSignificantEvents] = useAsyncFn(
    async (event) => {
      const isEnabled = event.target.checked;
      try {
        await core.uiSettings.set(OBSERVABILITY_STREAMS_ENABLE_SIGNIFICANT_EVENTS, isEnabled);

        core.notifications.toasts.addInfo(
          isEnabled
            ? i18n.translate('xpack.streams.streamsListView.significantEventsEnabledToast', {
                defaultMessage: 'Significant events enabled',
              })
            : i18n.translate('xpack.streams.streamsListView.significantEventsDisabledToast', {
                defaultMessage: 'Significant events disabled',
              })
        );
      } catch (error) {
        core.notifications.toasts.addError(getFormattedError(error), {
          title: i18n.translate(
            'xpack.streams.streamsListView.significantEventsToggleErrorToastTitle',
            {
              defaultMessage: 'Error updating Significant events setting',
            }
          ),
          toastLifeTimeMs: 5000,
        });
      }
    },
    [core]
  );

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
    {
      id: `${shipperButtonGroupPrefix}__fleet`,
      label: 'Fleet',
    },
    {
      id: `${shipperButtonGroupPrefix}__curl`,
      label: 'curl/HTTP',
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
    [`${shipperButtonGroupPrefix}__curl`]: `POST /logs/_bulk
{ "create": {} }
{ "@timestamp": "2025-05-05T12:12:12", "body": { "text": "Hello world!" }, "resource": { "attributes": { "host.name": "my-host-name" } } }
{ "create": {} }
{ "@timestamp": "2025-05-05T12:12:12", "message": "Hello world!", "host.name": "my-host-name" }`,
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

          {significantEvents?.available && (
            <EuiDescribedFormGroup
              fullWidth
              descriptionFlexItemProps={{ grow: 2 }}
              title={
                <h3>
                  <EuiFlexGroup gutterSize="s">
                    {i18n.translate('xpack.streams.streamsListView.significantEventsTitle', {
                      defaultMessage: 'Significant events',
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
                  {i18n.translate('xpack.streams.streamsListView.significantEventsDescription', {
                    defaultMessage:
                      "A Significant event is a single, 'interesting' log event identified by an automated rule as being important for understanding a system's behavior.",
                  })}
                </p>
              }
            >
              <EuiFormRow fullWidth>
                <EuiSwitch
                  label={i18n.translate(
                    'xpack.streams.streamsListView.enableSignificantEventsSwitchLabel',
                    {
                      defaultMessage: 'Enable Significant events',
                    }
                  )}
                  checked={Boolean(significantEvents?.enabled)}
                  onChange={toggleSignificantEvents}
                  data-test-subj="streamsSignificantEventsSwitch"
                  disabled={
                    core.uiSettings.isOverridden(OBSERVABILITY_STREAMS_ENABLE_SIGNIFICANT_EVENTS) ||
                    isChangingSignificantEvents
                  }
                />
              </EuiFormRow>
            </EuiDescribedFormGroup>
          )}

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
                <FormattedMessage
                  id="xpack.streams.streamsListView.shipperConfigDescription"
                  defaultMessage="Send logs data to wired streams. <docLink>Check the documentation</docLink> for more info."
                  values={{
                    docLink: (...chunks: React.ReactNode[]) => (
                      <EuiLink
                        href={core.docLinks.links.observability.wiredStreams}
                        target="_blank"
                        rel="noopener noreferrer"
                        external
                      >
                        {chunks}
                      </EuiLink>
                    ),
                  }}
                />
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
            {selectedShipperId.endsWith('__fleet') ? (
              <EuiText size="s">
                <p>
                  <FormattedMessage
                    id="xpack.streams.streamsListView.shipperConfigFleetDescription"
                    defaultMessage="Use the <b>Custom Logs (Filestream)</b> integration to send data to Wired Streams:"
                    values={{
                      b: (chunks) => <b>{chunks}</b>,
                    }}
                  />
                </p>
                <ul>
                  <li>
                    {i18n.translate(
                      'xpack.streams.streamsListView.shipperConfigFleetDescriptionStep1',
                      {
                        defaultMessage:
                          'Enable "Write to logs streams" for the output you want to use in the Fleet Settings tab.',
                      }
                    )}
                  </li>
                  <li>
                    {i18n.translate(
                      'xpack.streams.streamsListView.shipperConfigFleetDescriptionStep2',
                      {
                        defaultMessage:
                          'Add the Custom Logs (Filestream) integration to an agent policy.',
                      }
                    )}
                  </li>
                  <li>
                    {i18n.translate(
                      'xpack.streams.streamsListView.shipperConfigFleetDescriptionStep3',
                      {
                        defaultMessage:
                          'Enable the \'Use the "logs" data stream\' setting in the integration configuration.',
                      }
                    )}
                  </li>
                  <li>
                    {i18n.translate(
                      'xpack.streams.streamsListView.shipperConfigFleetDescriptionStep4',
                      {
                        defaultMessage:
                          'Make sure the agent policy is using the output you configured in step 1.',
                      }
                    )}
                  </li>
                </ul>
              </EuiText>
            ) : (
              <>
                {selectedShipperId.endsWith('__curl') && (
                  <EuiText size="s">
                    <p>
                      <FormattedMessage
                        id="xpack.streams.streamsListView.shipperConfigCurlDescription"
                        defaultMessage="Send data to the {logsEndpoint} endpoint using the {bulkApiLink}. Refer to the following example for more information:"
                        values={{
                          // eslint-disable-next-line @kbn/i18n/strings_should_be_translated_with_i18n
                          logsEndpoint: <code>/logs/</code>,
                          bulkApiLink: (
                            <EuiLink
                              href="https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-bulk"
                              target="_blank"
                              rel="noopener noreferrer"
                              external
                              // eslint-disable-next-line @kbn/i18n/strings_should_be_translated_with_i18n
                            >
                              Bulk API
                            </EuiLink>
                          ),
                        }}
                      />
                    </p>
                  </EuiText>
                )}
                <EuiCodeBlock
                  language={selectedShipperId.endsWith('__curl') ? 'json' : 'yaml'}
                  isCopyable
                  paddingSize="m"
                  data-test-subj="streamsShipperConfigExample"
                >
                  {shipperConfigExamples[selectedShipperId]}
                </EuiCodeBlock>
              </>
            )}
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
          data-test-subj="streamsWiredDisableModal"
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
              data-test-subj="streamsWiredDisableConfirmCheckbox"
            />
          </EuiModalBody>
          <EuiModalFooter>
            <EuiButtonEmpty
              onClick={() => {
                setShowDisableModal(false);
                setDisableConfirmChecked(false);
              }}
              disabled={isDisabling}
              data-test-subj="streamsWiredDisableCancelButton"
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
