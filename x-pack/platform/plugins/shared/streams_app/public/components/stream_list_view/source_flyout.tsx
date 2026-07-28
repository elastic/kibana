/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiCopy,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiFormLabel,
  EuiFormRow,
  EuiHorizontalRule,
  EuiIcon,
  EuiPanel,
  EuiSpacer,
  EuiSuperSelect,
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

// Prototype-only: a stable-looking mock ingest endpoint, generated once per
// flyout open rather than tied to the (still-empty) source name — mirrors how
// a real backend would provision the endpoint before the user names anything.
function mockEndpoint(seed: number): string {
  const subdomain = (seed % 0xffffffff).toString(16).padStart(8, '0');
  return `https://${subdomain}.ingest.us-central1.gcp.elastic.cloud:443`;
}

function mockApiKey(seed: number): string {
  const left = (seed % 0xffffffff).toString(16).padStart(8, '0');
  const right = ((seed * 40503) % 0xffffffff).toString(16).padStart(8, '0');
  return `${left}-${right}`;
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

// Two deterministic-looking pre-existing keys for the configured-source view,
// so the list looks populated without any backend.
function mockApiKeys(seed: number): MockApiKeyEntry[] {
  const base = Date.UTC(2026, 0, 1);
  return [0, 1].map((index) => {
    const dayOffset = (seed + index * 9973) % 365;
    const timestamp = base + dayOffset * 86400000;
    return {
      id: `${seed}-${index}`,
      label: apiKeyLabel(timestamp),
    };
  });
}

const SOURCE_TYPE_OPTIONS = [
  {
    value: 'direct-bulk',
    inputDisplay: 'Direct _bulk',
  },
  {
    value: 'otlp',
    inputDisplay: 'OTLP endpoint',
  },
  {
    value: 'fleet-agent',
    inputDisplay: 'Fleet-managed agent',
  },
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

// The form filled in while finishing setup for a freshly-placed, unconfigured
// source card. Name/type are controlled by the parent (Save needs them);
// the generated endpoint/API key are local since nothing outside this form
// needs them.
function SourceConfigurationBody({
  name,
  onNameChange,
  sourceType,
  onSourceTypeChange,
}: {
  name: string;
  onNameChange: (name: string) => void;
  sourceType: string;
  onSourceTypeChange: (sourceType: string) => void;
}) {
  const { euiTheme } = useEuiTheme();
  const [apiKey, setApiKey] = useState<string | null>(null);
  // Generated once per mount (not tied to the name) — mirrors a backend
  // provisioning the endpoint before the user has named anything.
  const seed = useMemo(() => hashString(`${Date.now()}`), []);
  const endpoint = useMemo(() => mockEndpoint(seed), [seed]);

  return (
    <>
      <EuiFormRow
        label={i18n.translate('xpack.streams.sourceFlyout.sourceTypeLabel', {
          defaultMessage: 'Source type',
        })}
        fullWidth
      >
        <EuiSuperSelect
          data-test-subj="sourceFlyoutSourceTypeSelect"
          options={SOURCE_TYPE_OPTIONS}
          valueOfSelected={sourceType}
          onChange={onSourceTypeChange}
          fullWidth
        />
      </EuiFormRow>
      <EuiSpacer size="l" />
      <EuiFormRow
        label={i18n.translate('xpack.streams.sourceFlyout.sourceNameLabel', {
          defaultMessage: 'Source name',
        })}
        helpText={i18n.translate('xpack.streams.sourceFlyout.sourceNameHelpText', {
          defaultMessage: 'Name your source. This cannot be changed later.',
        })}
        fullWidth
      >
        <EuiFieldText
          fullWidth
          value={name}
          onChange={(event) => onNameChange(event.target.value)}
          placeholder={i18n.translate('xpack.streams.sourceFlyout.sourceNamePlaceholder', {
            defaultMessage: 'Name123',
          })}
          aria-label={i18n.translate('xpack.streams.sourceFlyout.sourceNameAriaLabel', {
            defaultMessage: 'Source name',
          })}
          data-test-subj="sourceFlyoutNameInput"
        />
      </EuiFormRow>
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
          data-test-subj="sourceFlyoutEndpointInput"
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
      <EuiFormRow
        label={i18n.translate('xpack.streams.sourceFlyout.apiKeyLabel', {
          defaultMessage: 'API key',
        })}
        fullWidth
      >
        {apiKey ? (
          <EuiCallOut
            announceOnMount
            color="warning"
            iconType="warning"
            title={i18n.translate('xpack.streams.sourceFlyout.apiKeyCalloutTitle', {
              defaultMessage:
                'Make sure to copy your API key now as you will not be able to see this again',
            })}
            className={css`
              .euiCallOutHeader__title {
                font-size: 12px;
                line-height: 20px;
              }
            `}
            data-test-subj="sourceFlyoutApiKeyCallout"
          >
            <EuiFieldText
              fullWidth
              readOnly
              value={apiKey}
              aria-label={i18n.translate('xpack.streams.sourceFlyout.apiKeyAriaLabel', {
                defaultMessage: 'API key',
              })}
              data-test-subj="sourceFlyoutApiKeyInput"
              append={
                <EuiCopy textToCopy={apiKey}>
                  {(copy) => (
                    <EuiButtonEmpty
                      size="xs"
                      iconType="copy"
                      onClick={copy}
                      aria-label={i18n.translate('xpack.streams.sourceFlyout.copyApiKey', {
                        defaultMessage: 'Copy API key',
                      })}
                      data-test-subj="sourceFlyoutCopyApiKeyButton"
                    />
                  )}
                </EuiCopy>
              }
            />
          </EuiCallOut>
        ) : (
          <EuiButton
            size="s"
            className={css`
              background-color: ${euiTheme.colors.backgroundLightPrimary};
              color: ${euiTheme.colors.textPrimary};
              border: none;
            `}
            onClick={() => setApiKey(mockApiKey(seed + 1))}
            data-test-subj="sourceFlyoutGenerateKeyButton"
          >
            {i18n.translate('xpack.streams.sourceFlyout.generateKey', {
              defaultMessage: 'Generate key',
            })}
          </EuiButton>
        )}
      </EuiFormRow>
    </>
  );
}

// Read-only view shown when opening an already-configured source: its type,
// name and endpoint, the list of generated API keys, and a danger area.
function ConfiguredSourceBody({
  sourceName,
  sourceTypeLabel,
  onDeleteSource,
}: {
  sourceName: string;
  sourceTypeLabel: string;
  onDeleteSource: () => void;
}) {
  const { euiTheme } = useEuiTheme();
  const seed = useMemo(() => hashString(sourceName), [sourceName]);
  const endpoint = useMemo(() => mockEndpoint(seed), [seed]);
  const [apiKeys, setApiKeys] = useState<MockApiKeyEntry[]>(() => mockApiKeys(seed));

  const generateKey = () =>
    setApiKeys((keys) => [
      ...keys,
      { id: `${seed}-${Date.now()}`, label: apiKeyLabel(Date.now()) },
    ]);

  const deleteKey = (id: string) => setApiKeys((keys) => keys.filter((key) => key.id !== id));

  return (
    <>
      <EuiFormRow
        label={i18n.translate('xpack.streams.sourceFlyout.sourceTypeLabel', {
          defaultMessage: 'Source type',
        })}
        fullWidth
      >
        <EuiFieldText
          fullWidth
          readOnly
          value={sourceTypeLabel}
          aria-label={i18n.translate('xpack.streams.sourceFlyout.sourceTypeLabel', {
            defaultMessage: 'Source type',
          })}
          data-test-subj="sourceFlyoutSourceTypeValue"
        />
      </EuiFormRow>
      <EuiSpacer size="l" />
      <EuiFormRow
        label={i18n.translate('xpack.streams.sourceFlyout.sourceNameLabel', {
          defaultMessage: 'Source name',
        })}
        fullWidth
      >
        <EuiFieldText
          fullWidth
          readOnly
          value={sourceName}
          aria-label={i18n.translate('xpack.streams.sourceFlyout.sourceNameLabel', {
            defaultMessage: 'Source name',
          })}
          data-test-subj="sourceFlyoutSourceNameValue"
        />
      </EuiFormRow>
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
                      <EuiIcon type="key" />
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

      <EuiFormLabel>
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
  isConfiguring = false,
  onSave,
  onDelete,
}: {
  sourceName: string;
  onClose: () => void;
  /**
   * True while this flyout is finishing setup for a freshly-placed,
   * unconfigured source card (opened by clicking its "Click to configure"
   * card) rather than viewing an already-configured one. Swaps the read-only
   * configured-source view for a setup form, and adds a Save action in the
   * footer.
   */
  isConfiguring?: boolean;
  /** Called with the entered details when Save is clicked while `isConfiguring`. */
  onSave?: (details: SourceConfigurationDetails) => void;
  /**
   * Called when "Delete source" is clicked in the configured-source view;
   * expected to remove the source's node from the canvas. Falls back to
   * `onClose` when not provided.
   */
  onDelete?: () => void;
}) {
  const titleId = useGeneratedHtmlId({ prefix: 'sourceFlyoutTitle' });
  // Lifted so Save can read the final values; SourceConfigurationBody owns the
  // rest of the form's (purely cosmetic) state.
  const [configuredName, setConfiguredName] = useState('');
  const [configuredSourceType, setConfiguredSourceType] = useState(SOURCE_TYPE_OPTIONS[0].value);

  return (
    <EuiFlyout
      size="s"
      type="push"
      pushMinBreakpoint="m"
      onClose={onClose}
      aria-labelledby={titleId}
      data-test-subj="sourceFlyout"
    >
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="xs">
          <h4 id={titleId}>
            {isConfiguring
              ? i18n.translate('xpack.streams.sourceFlyout.configureTitle', {
                  defaultMessage: 'Configure new source',
                })
              : sourceName}
          </h4>
        </EuiTitle>
        <EuiSpacer size="xs" />
        <EuiText size="s" color="subdued">
          {isConfiguring
            ? i18n.translate('xpack.streams.sourceFlyout.configuringDescription', {
                defaultMessage: 'Use an endpoint to connect your incoming data.',
              })
            : i18n.translate('xpack.streams.sourceFlyout.configuredSubtitle', {
                defaultMessage: 'Managed / OTel',
              })}
        </EuiText>
      </EuiFlyoutHeader>

      <EuiFlyoutBody>
        {isConfiguring ? (
          <SourceConfigurationBody
            name={configuredName}
            onNameChange={setConfiguredName}
            sourceType={configuredSourceType}
            onSourceTypeChange={setConfiguredSourceType}
          />
        ) : (
          <ConfiguredSourceBody
            sourceName={sourceName}
            sourceTypeLabel={mockSourceTypeLabel(hashString(sourceName))}
            onDeleteSource={onDelete ?? onClose}
          />
        )}
      </EuiFlyoutBody>

      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween" alignItems="center" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty onClick={onClose} flush="left" data-test-subj="sourceFlyoutCloseButton">
              {i18n.translate('xpack.streams.sourceFlyout.close', { defaultMessage: 'Close' })}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            {isConfiguring ? (
              <EuiButton
                fill
                size="s"
                onClick={() =>
                  onSave?.({
                    name: configuredName,
                    sourceType: configuredSourceType,
                    sourceTypeLabel:
                      SOURCE_TYPE_OPTIONS.find((option) => option.value === configuredSourceType)
                        ?.inputDisplay ?? SOURCE_TYPE_OPTIONS[0].inputDisplay,
                  })
                }
                data-test-subj="sourceFlyoutSaveButton"
              >
                {i18n.translate('xpack.streams.sourceFlyout.save', { defaultMessage: 'Save' })}
              </EuiButton>
            ) : null}
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
}
