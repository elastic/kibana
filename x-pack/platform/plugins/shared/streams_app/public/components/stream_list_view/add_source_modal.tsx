/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiBadge,
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiCodeBlock,
  EuiCopy,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiIcon,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiSpacer,
  EuiSuperSelect,
  EuiTab,
  EuiTabs,
  EuiText,
  EuiTitle,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import React, { useMemo, useState } from 'react';

/** Details collected by the modal, used to create / configure the source. */
export interface AddSourceDetails {
  name: string;
  sourceType: string;
  /** Human-readable label for `sourceType` (e.g. "Direct _bulk"). */
  sourceTypeLabel: string;
}

interface SourceTypeOption {
  value: string;
  label: string;
  description: string;
}

const SOURCE_TYPE_OPTIONS: SourceTypeOption[] = [
  {
    value: 'direct-bulk',
    label: i18n.translate('xpack.streams.addSourceModal.typeDirectBulkLabel', {
      defaultMessage: 'Direct _bulk',
    }),
    description: i18n.translate('xpack.streams.addSourceModal.typeDirectBulkDescription', {
      defaultMessage: 'Legacy Elasticsearch _bulk endpoint.',
    }),
  },
  {
    value: 'managed-bulk',
    label: i18n.translate('xpack.streams.addSourceModal.typeManagedBulkLabel', {
      defaultMessage: 'Managed _bulk',
    }),
    description: i18n.translate('xpack.streams.addSourceModal.typeManagedBulkDescription', {
      defaultMessage: 'Same as direct, with native queueing',
    }),
  },
  {
    value: 'otlp',
    label: i18n.translate('xpack.streams.addSourceModal.typeOtlpLabel', {
      defaultMessage: 'OTLP endpoint',
    }),
    description: i18n.translate('xpack.streams.addSourceModal.typeOtlpDescription', {
      defaultMessage: 'Logs, metrics, and traces. Fans out by signal',
    }),
  },
  {
    value: 'prometheus-ew',
    label: i18n.translate('xpack.streams.addSourceModal.typePrometheusLabel', {
      defaultMessage: 'Prometheus EW',
    }),
    description: i18n.translate('xpack.streams.addSourceModal.typePrometheusDescription', {
      defaultMessage: 'Prometheus-compatible remote_write metrics',
    }),
  },
];

const PUSH_BADGE_LABEL = i18n.translate('xpack.streams.addSourceModal.pushBadge', {
  defaultMessage: 'Push',
});

interface SenderTab {
  id: string;
  name: string;
  snippet: string;
}

const SENDER_TABS: SenderTab[] = [
  {
    id: 'prometheus',
    name: 'Prometheus',
    snippet: `exporters:
  otlp/elastic:
    endpoint: "\${MOTLP_ENDPOINT}"
    headers:
      Authorization: "ApiKey <key>"
    sending_queue:
      enabled: true`,
  },
  {
    id: 'grafana-alloy',
    name: 'Grafana Alloy',
    snippet: `otelcol.exporter.otlp "elastic" {
  client {
    endpoint = env("MOTLP_ENDPOINT")
    headers  = {
      Authorization = "ApiKey <key>",
    }
  }
}`,
  },
  {
    id: 'otel-collector',
    name: 'OTel Collector',
    snippet: `exporters:
  otlphttp/elastic:
    endpoint: "\${MOTLP_ENDPOINT}"
    headers:
      Authorization: "ApiKey <key>"
service:
  pipelines:
    logs:
      exporters: [otlphttp/elastic]`,
  },
  {
    id: 'k8s-operator',
    name: 'K8s Operator',
    snippet: `apiVersion: opentelemetry.io/v1beta1
kind: OpenTelemetryCollector
metadata:
  name: elastic
spec:
  config:
    exporters:
      otlphttp/elastic:
        endpoint: "\${MOTLP_ENDPOINT}"
        headers:
          Authorization: "ApiKey <key>"`,
  },
];

/** Simple deterministic string hash (djb2 variant, without bitwise ops). */
function hashString(value: string): number {
  let hash = 5381;
  for (let i = 0; i < value.length; i++) {
    hash = (hash * 33 + value.charCodeAt(i)) % 2147483647;
  }
  return Math.abs(hash);
}

// Prototype-only mock provisioning: the endpoint and key look stable per open
// but are not backed by anything real.
function mockEndpoint(seed: number): string {
  const subdomain = (seed % 0xffffffff).toString(16).padStart(8, '0');
  return `https://test-simple-k8s-${subdomain}.ingest.us-central1.gcp.elastic.cloud:443`;
}

function mockApiKey(seed: number): string {
  const left = (seed % 0xffffffff).toString(16).padStart(8, '0');
  const right = ((seed * 40503) % 0xffffffff).toString(16).padStart(8, '0');
  const tail = ((seed * 2654435761) % 0xffffffff).toString(16).padStart(8, '0');
  return `${left}${right}${tail}`;
}

const labelForSourceType = (value: string): string =>
  SOURCE_TYPE_OPTIONS.find((option) => option.value === value)?.label ??
  SOURCE_TYPE_OPTIONS[0].label;

export function AddSourceModal({
  onClose,
  onDone,
}: {
  onClose: () => void;
  onDone: (details: AddSourceDetails) => void;
}) {
  const titleId = useGeneratedHtmlId({ prefix: 'addSourceModalTitle' });

  const [step, setStep] = useState<1 | 2>(1);
  const [sourceType, setSourceType] = useState(SOURCE_TYPE_OPTIONS[0].value);
  const [name, setName] = useState('');
  const [selectedTab, setSelectedTab] = useState(SENDER_TABS[0].id);

  const trimmedName = name.trim();
  const seed = useMemo(() => hashString(`${Date.now()}`), []);
  const endpoint = useMemo(() => mockEndpoint(seed), [seed]);
  const apiKey = useMemo(() => mockApiKey(seed + 1), [seed]);

  const activeSnippet =
    SENDER_TABS.find((tab) => tab.id === selectedTab)?.snippet ?? SENDER_TABS[0].snippet;

  const handleDone = () =>
    onDone({ name: trimmedName, sourceType, sourceTypeLabel: labelForSourceType(sourceType) });

  const title = i18n.translate('xpack.streams.addSourceModal.title', {
    defaultMessage: 'Create source',
  });
  const subtitle = i18n.translate('xpack.streams.addSourceModal.subtitle', {
    defaultMessage: 'Choose how data will enter this stream',
  });

  return (
    <EuiModal
      onClose={onClose}
      aria-labelledby={titleId}
      style={{ width: 576 }}
      data-test-subj="streamsAddSourceModal"
    >
      <EuiModalHeader>
        <EuiFlexGroup direction="column" gutterSize="xs">
          <EuiModalHeaderTitle id={titleId}>{title}</EuiModalHeaderTitle>
          <EuiText size="s" color="subdued">
            {subtitle}
          </EuiText>
        </EuiFlexGroup>
      </EuiModalHeader>

      <EuiModalBody>
        {step === 1 ? (
          <>
            <EuiFormRow
              label={i18n.translate('xpack.streams.addSourceModal.sourceTypeLabel', {
                defaultMessage: 'Source type',
              })}
              fullWidth
            >
              <EuiSuperSelect
                fullWidth
                valueOfSelected={sourceType}
                onChange={setSourceType}
                data-test-subj="streamsAddSourceModalType"
                options={SOURCE_TYPE_OPTIONS.map((option) => ({
                  value: option.value,
                  inputDisplay: option.label,
                  dropdownDisplay: (
                    <EuiFlexGroup
                      gutterSize="s"
                      alignItems="center"
                      responsive={false}
                      css={css`
                        min-width: 0;
                      `}
                    >
                      <EuiFlexItem>
                        <EuiText size="s">
                          <strong>{option.label}</strong>
                        </EuiText>
                        <EuiText size="xs" color="subdued">
                          {option.description}
                        </EuiText>
                      </EuiFlexItem>
                      <EuiFlexItem grow={false}>
                        <EuiBadge color="hollow">{PUSH_BADGE_LABEL}</EuiBadge>
                      </EuiFlexItem>
                    </EuiFlexGroup>
                  ),
                }))}
              />
            </EuiFormRow>
            <EuiSpacer size="l" />
            <EuiFormRow
              label={i18n.translate('xpack.streams.addSourceModal.sourceNameLabel', {
                defaultMessage: 'Source name',
              })}
              fullWidth
            >
              <EuiFieldText
                fullWidth
                autoFocus
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Name123"
                aria-label={i18n.translate('xpack.streams.addSourceModal.sourceNameLabel', {
                  defaultMessage: 'Source name',
                })}
                data-test-subj="streamsAddSourceModalName"
              />
            </EuiFormRow>
            <EuiSpacer size="m" />
            <EuiText size="s" color="subdued">
              {i18n.translate('xpack.streams.addSourceModal.immutableHelp', {
                defaultMessage: 'Source type and name cannot be changed later',
              })}
            </EuiText>
          </>
        ) : (
          <>
            <EuiFlexGroup direction="column" gutterSize="xs" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
                  <EuiFlexItem grow={false}>
                    <EuiIcon type="check" color="subdued" size="s" aria-hidden={true} />
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiText size="s" color="subdued">
                      {i18n.translate('xpack.streams.addSourceModal.summaryType', {
                        defaultMessage: 'Type: {type}',
                        values: { type: labelForSourceType(sourceType) },
                      })}
                    </EuiText>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
                  <EuiFlexItem grow={false}>
                    <EuiIcon type="check" color="subdued" size="s" aria-hidden={true} />
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiText size="s" color="subdued">
                      {i18n.translate('xpack.streams.addSourceModal.summaryName', {
                        defaultMessage: 'Name: {name}',
                        values: { name: trimmedName },
                      })}
                    </EuiText>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiFlexItem>
            </EuiFlexGroup>
            <EuiSpacer size="l" />
            <EuiTitle size="xxs">
              <h4>
                {i18n.translate('xpack.streams.addSourceModal.sentDataUsing', {
                  defaultMessage: 'Sent data using',
                })}
              </h4>
            </EuiTitle>
            <EuiSpacer size="s" />
            <EuiTabs size="s">
              {SENDER_TABS.map((tab) => (
                <EuiTab
                  key={tab.id}
                  isSelected={tab.id === selectedTab}
                  onClick={() => setSelectedTab(tab.id)}
                  data-test-subj={`streamsAddSourceModalTab-${tab.id}`}
                >
                  {tab.name}
                </EuiTab>
              ))}
            </EuiTabs>
            <EuiSpacer size="s" />
            <EuiCodeBlock
              language="yaml"
              fontSize="s"
              paddingSize="m"
              isCopyable
              overflowHeight={148}
              data-test-subj="streamsAddSourceModalSnippet"
            >
              {activeSnippet}
            </EuiCodeBlock>
            <EuiSpacer size="l" />
            <EuiFormRow
              label={i18n.translate('xpack.streams.addSourceModal.endpointLabel', {
                defaultMessage: 'Endpoint',
              })}
              helpText={i18n.translate('xpack.streams.addSourceModal.endpointHelp', {
                defaultMessage: 'Configure your sender to push data to this address.',
              })}
              fullWidth
            >
              <EuiFieldText
                fullWidth
                readOnly
                value={endpoint}
                aria-label={i18n.translate('xpack.streams.addSourceModal.endpointLabel', {
                  defaultMessage: 'Endpoint',
                })}
                data-test-subj="streamsAddSourceModalEndpoint"
                append={
                  <EuiCopy textToCopy={endpoint}>
                    {(copy) => (
                      <EuiButtonEmpty
                        size="xs"
                        iconType="copy"
                        onClick={copy}
                        aria-label={i18n.translate('xpack.streams.addSourceModal.copyEndpoint', {
                          defaultMessage: 'Copy endpoint',
                        })}
                        data-test-subj="streamsAddSourceModalCopyEndpoint"
                      />
                    )}
                  </EuiCopy>
                }
              />
            </EuiFormRow>
            <EuiSpacer size="l" />
            <EuiFormRow
              label={i18n.translate('xpack.streams.addSourceModal.apiKeyLabel', {
                defaultMessage: 'API key',
              })}
              fullWidth
            >
              <EuiCallOut
                announceOnMount
                color="warning"
                iconType="warning"
                size="s"
                title={i18n.translate('xpack.streams.addSourceModal.apiKeyCalloutTitle', {
                  defaultMessage:
                    'Make sure to copy your API key now as you will not be able to see this again',
                })}
                data-test-subj="streamsAddSourceModalApiKeyCallout"
              >
                <EuiFieldText
                  fullWidth
                  readOnly
                  value={apiKey}
                  aria-label={i18n.translate('xpack.streams.addSourceModal.apiKeyLabel', {
                    defaultMessage: 'API key',
                  })}
                  data-test-subj="streamsAddSourceModalApiKey"
                  append={
                    <EuiCopy textToCopy={apiKey}>
                      {(copy) => (
                        <EuiButtonEmpty
                          size="xs"
                          iconType="copy"
                          onClick={copy}
                          aria-label={i18n.translate('xpack.streams.addSourceModal.copyApiKey', {
                            defaultMessage: 'Copy API key',
                          })}
                          data-test-subj="streamsAddSourceModalCopyApiKey"
                        />
                      )}
                    </EuiCopy>
                  }
                />
              </EuiCallOut>
            </EuiFormRow>
          </>
        )}
      </EuiModalBody>

      <EuiModalFooter>
        <EuiFlexGroup justifyContent="flexEnd" gutterSize="m" responsive={false}>
          {step === 1 ? (
            <>
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty onClick={onClose} data-test-subj="streamsAddSourceModalCancel">
                  {i18n.translate('xpack.streams.addSourceModal.cancel', {
                    defaultMessage: 'Cancel',
                  })}
                </EuiButtonEmpty>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButton
                  fill
                  disabled={trimmedName.length === 0}
                  onClick={() => setStep(2)}
                  data-test-subj="streamsAddSourceModalContinue"
                >
                  {i18n.translate('xpack.streams.addSourceModal.continue', {
                    defaultMessage: 'Continue',
                  })}
                </EuiButton>
              </EuiFlexItem>
            </>
          ) : (
            <>
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty
                  onClick={() => setStep(1)}
                  data-test-subj="streamsAddSourceModalBack"
                >
                  {i18n.translate('xpack.streams.addSourceModal.back', {
                    defaultMessage: 'Back',
                  })}
                </EuiButtonEmpty>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButton fill onClick={handleDone} data-test-subj="streamsAddSourceModalDone">
                  {i18n.translate('xpack.streams.addSourceModal.done', {
                    defaultMessage: 'Done',
                  })}
                </EuiButton>
              </EuiFlexItem>
            </>
          )}
        </EuiFlexGroup>
      </EuiModalFooter>
    </EuiModal>
  );
}
