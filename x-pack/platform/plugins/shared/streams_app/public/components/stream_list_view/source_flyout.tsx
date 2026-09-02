/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import {
  EuiBadge,
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiCopy,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiFormLabel,
  EuiFormRow,
  EuiHorizontalRule,
  EuiIcon,
  EuiLink,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { css } from '@emotion/css';
import { i18n } from '@kbn/i18n';

/** Simple deterministic string hash (djb2 variant, without bitwise ops). */
function hashString(value: string): number {
  let hash = 5381;
  for (let i = 0; i < value.length; i++) {
    hash = (hash * 33 + value.charCodeAt(i)) % 2147483647;
  }
  return Math.abs(hash);
}

// Prototype-only: a stable-looking mock ingest endpoint, derived from the
// source name so the read-only view stays consistent per source.
function mockEndpoint(seed: number): string {
  const subdomain = (seed % 0xffffffff).toString(16).padStart(8, '0');
  return `https://test-simple-k8s-${subdomain}.ingest.us-central1.gcp.elastic.cloud:443`;
}

interface MockApiKeyEntry {
  id: string;
  label: string;
}

function formatKeyDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function apiKeyLabel(timestamp: number): string {
  return i18n.translate('xpack.streams.sourceFlyout.apiKeyGeneratedOn', {
    defaultMessage: 'Key Generated on {date}',
    values: { date: formatKeyDate(timestamp) },
  });
}

// A single deterministic-looking pre-existing key for the configured-source
// view, so the list looks populated without any backend.
function mockApiKeys(seed: number): MockApiKeyEntry[] {
  const base = Date.UTC(2026, 0, 1);
  const dayOffset = seed % 365;
  const timestamp = base + dayOffset * 86400000;
  return [{ id: `${seed}-0`, label: apiKeyLabel(timestamp) }];
}

const DESTINATION_POOL = [
  'traces-apm-prod',
  'metrics-tsdb-prod',
  'logs-otel-prod',
  'logs-archive-cold',
  'metrics-hot-tier',
  'events-siem-prod',
];

// Prototype-only: a stable subset of destinations this source fans out to.
function mockDestinations(seed: number): string[] {
  const count = 2 + (seed % 3);
  const names: string[] = [];
  for (let i = 0; i < count; i++) {
    names.push(DESTINATION_POOL[(seed + i * 7) % DESTINATION_POOL.length]);
  }
  return Array.from(new Set(names));
}

const SOURCE_PROTOCOLS: Array<{ label: string; iconType: string }> = [
  { label: 'Prometheus', iconType: 'logoPrometheus' },
  { label: 'Kafka', iconType: 'logoKafka' },
  { label: 'Elastic Agent', iconType: 'logoElastic' },
];

// Prototype-only: the wire protocol shown in the "Sends data using" badge.
function mockProtocol(seed: number): { label: string; iconType: string } {
  return SOURCE_PROTOCOLS[seed % SOURCE_PROTOCOLS.length];
}

const SOURCE_TYPE_OPTIONS = [
  { value: 'direct-bulk', inputDisplay: 'Direct _bulk' },
  { value: 'managed-bulk', inputDisplay: 'Managed _bulk' },
  { value: 'otlp', inputDisplay: 'OTLP endpoint' },
  { value: 'prometheus-ew', inputDisplay: 'Prometheus EW' },
];

// Prototype-only: pick a stable source-type label for an already-configured
// source from its name hash, so the read-only view looks consistent per source.
function mockSourceTypeLabel(seed: number): string {
  return SOURCE_TYPE_OPTIONS[seed % SOURCE_TYPE_OPTIONS.length].inputDisplay;
}

export interface SourceConfigurationDetails {
  name: string;
  sourceType: string;
  /** The dropdown's human-readable label for `sourceType` (e.g. "Direct _bulk"). */
  sourceTypeLabel: string;
}

// Read-only view shown when opening an already-configured source: performance
// stats, the destinations it feeds, the wire protocol / endpoint, its generated
// API keys, and a danger area to delete the source.
function ConfiguredSourceBody({
  sourceName,
  onDeleteSource,
}: {
  sourceName: string;
  onDeleteSource: () => void;
}) {
  const { euiTheme } = useEuiTheme();
  const seed = useMemo(() => hashString(sourceName), [sourceName]);
  const endpoint = useMemo(() => mockEndpoint(seed), [seed]);
  const destinations = useMemo(() => mockDestinations(seed), [seed]);
  const protocol = useMemo(() => mockProtocol(seed), [seed]);
  const [apiKeys, setApiKeys] = useState<MockApiKeyEntry[]>(() => mockApiKeys(seed));

  const generateKey = () =>
    setApiKeys((keys) => [
      ...keys,
      { id: `${seed}-${Date.now()}`, label: apiKeyLabel(Date.now()) },
    ]);

  const deleteKey = (id: string) => setApiKeys((keys) => keys.filter((key) => key.id !== id));

  return (
    <>
      <EuiCallOut
        color="warning"
        size="s"
        title={i18n.translate('xpack.streams.sourceFlyout.statsCalloutTitle', {
          defaultMessage: 'Placeholder note',
        })}
        data-test-subj="sourceFlyoutStatsCallout"
        className={css`
          color: ${euiTheme.colors.textWarning};
        `}
      >
        <p>
          {i18n.translate('xpack.streams.sourceFlyout.statsCalloutBody', {
            defaultMessage:
              'Source stats and metric data will live here in a future milestone. Users will read the data here, then choose to edit the source if they need to. For V1, everything stays in this one view.',
          })}
        </p>
      </EuiCallOut>

      <EuiSpacer size="l" />

      <EuiFormLabel>
        {i18n.translate('xpack.streams.sourceFlyout.destinationsLabel', {
          defaultMessage: 'Destinations',
        })}
      </EuiFormLabel>
      <EuiSpacer size="xs" />
      <EuiFlexGroup direction="column" gutterSize="xs" responsive={false}>
        {destinations.map((destination) => (
          <EuiFlexItem grow={false} key={destination}>
            <EuiLink
              href="#"
              external
              onClick={(event: React.MouseEvent) => event.preventDefault()}
              data-test-subj={`sourceFlyoutDestinationLink-${destination}`}
            >
              {destination}
            </EuiLink>
          </EuiFlexItem>
        ))}
      </EuiFlexGroup>

      <EuiHorizontalRule margin="l" />

      <EuiTitle size="xxs">
        <h4>
          {i18n.translate('xpack.streams.sourceFlyout.sendsDataUsing', {
            defaultMessage: 'Sends data using',
          })}
        </h4>
      </EuiTitle>
      <EuiSpacer size="m" />
      <div>
        <EuiBadge color="hollow" iconType={protocol.iconType}>
          {protocol.label}
        </EuiBadge>
      </div>
      <EuiSpacer size="l" />

      <EuiFormRow
        label={i18n.translate('xpack.streams.sourceFlyout.endpointLabel', {
          defaultMessage: 'Endpoint',
        })}
        fullWidth
      >
        <EuiFieldText
          fullWidth
          readOnly
          value={endpoint}
          aria-label={i18n.translate('xpack.streams.sourceFlyout.endpointAriaLabel', {
            defaultMessage: 'Endpoint',
          })}
          data-test-subj="sourceFlyoutEndpointValue"
          append={
            <EuiCopy textToCopy={endpoint}>
              {(copy) => (
                <EuiButtonEmpty
                  size="xs"
                  iconType="copy"
                  onClick={copy}
                  aria-label={i18n.translate('xpack.streams.sourceFlyout.copyEndpoint', {
                    defaultMessage: 'Copy endpoint',
                  })}
                  data-test-subj="sourceFlyoutCopyEndpointButton"
                />
              )}
            </EuiCopy>
          }
        />
      </EuiFormRow>

      <EuiSpacer size="l" />

      <EuiFormLabel>
        {i18n.translate('xpack.streams.sourceFlyout.apiKeyLabel', {
          defaultMessage: 'API key',
        })}
      </EuiFormLabel>
      <EuiSpacer size="s" />
      {apiKeys.length > 0 ? (
        <EuiPanel
          hasShadow={false}
          hasBorder
          paddingSize="none"
          data-test-subj="sourceFlyoutApiKeyList"
          className={css`
            padding: ${euiTheme.size.xs} ${euiTheme.size.base};
            border-radius: ${euiTheme.border.radius.small};
          `}
        >
          <EuiFlexGroup direction="column" gutterSize="xs" responsive={false}>
            {apiKeys.map((key, index) => (
              <React.Fragment key={key.id}>
                {index > 0 ? (
                  <EuiFlexItem grow={false}>
                    <EuiHorizontalRule margin="none" />
                  </EuiFlexItem>
                ) : null}
                <EuiFlexItem grow={false}>
                  <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
                    <EuiFlexItem grow={false}>
                      <EuiIcon type="key" color="subdued" aria-hidden={true} />
                    </EuiFlexItem>
                    <EuiFlexItem>
                      <EuiText size="s" color="subdued">
                        {key.label}
                      </EuiText>
                    </EuiFlexItem>
                    <EuiFlexItem grow={false}>
                      <EuiButtonEmpty
                        size="s"
                        color="danger"
                        flush="right"
                        onClick={() => deleteKey(key.id)}
                        data-test-subj="sourceFlyoutDeleteKeyButton"
                      >
                        {i18n.translate('xpack.streams.sourceFlyout.deleteKey', {
                          defaultMessage: 'Delete',
                        })}
                      </EuiButtonEmpty>
                    </EuiFlexItem>
                  </EuiFlexGroup>
                </EuiFlexItem>
              </React.Fragment>
            ))}
          </EuiFlexGroup>
        </EuiPanel>
      ) : null}
      <EuiSpacer size="m" />
      <EuiButton
        size="s"
        color="primary"
        onClick={generateKey}
        data-test-subj="sourceFlyoutGenerateKeyButton"
      >
        {i18n.translate('xpack.streams.sourceFlyout.generateKey', {
          defaultMessage: 'Generate key',
        })}
      </EuiButton>

      <EuiHorizontalRule margin="l" />

      <EuiFormLabel
        className={css`
          color: ${euiTheme.colors.textDanger};
        `}
      >
        {i18n.translate('xpack.streams.sourceFlyout.dangerArea', {
          defaultMessage: 'Danger area',
        })}
      </EuiFormLabel>
      <EuiSpacer size="s" />
      <EuiButton
        color="danger"
        size="s"
        onClick={onDeleteSource}
        data-test-subj="sourceFlyoutDeleteButton"
      >
        {i18n.translate('xpack.streams.sourceFlyout.deleteSource', {
          defaultMessage: 'Delete source',
        })}
      </EuiButton>
    </>
  );
}

export function SourceFlyout({
  sourceName,
  onClose,
  onDelete,
}: {
  sourceName: string;
  onClose: () => void;
  /**
   * Called when "Delete source" is clicked; expected to remove the source's
   * node from the canvas. Falls back to `onClose` when not provided.
   */
  onDelete?: () => void;
}) {
  const titleId = useGeneratedHtmlId({ prefix: 'sourceFlyoutTitle' });
  const sourceTypeLabel = useMemo(() => mockSourceTypeLabel(hashString(sourceName)), [sourceName]);

  return (
    <EuiFlyout
      size="s"
      type="overlay"
      ownFocus={false}
      resizable
      onClose={onClose}
      aria-labelledby={titleId}
      data-test-subj="sourceFlyout"
    >
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="xs">
          <h4 id={titleId}>{sourceName}</h4>
        </EuiTitle>
        <EuiSpacer size="xs" />
        <EuiText size="s" color="subdued">
          {sourceTypeLabel}
        </EuiText>
      </EuiFlyoutHeader>

      <EuiFlyoutBody>
        <ConfiguredSourceBody sourceName={sourceName} onDeleteSource={onDelete ?? onClose} />
      </EuiFlyoutBody>
    </EuiFlyout>
  );
}
