/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiBadge,
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiDescriptionList,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiHealth,
  EuiHorizontalRule,
  EuiIcon,
  EuiIconTip,
  EuiLoadingSpinner,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { SandboxProfile } from '@kbn/agent-builder-common';
import { resolveSandboxCapabilities } from '@kbn/agent-builder-common';
import { FIELD_HELP, LabelWithHelp, TIER_HELP, VALUE_HELP } from './capability_help';
import { internalApiPath } from '../../../../common/constants';
import { useKibana } from '../../hooks/use_kibana';
import {
  useSandboxProfiles,
  type SandboxProviderMetadata,
  type SandboxTestResult,
} from '../../hooks/sandboxes/use_sandbox_profiles';

interface Props {
  profile: SandboxProfile;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

const connectionItems = (
  profile: SandboxProfile
): Array<{ title: string; description: NonNullable<React.ReactNode> }> => {
  if (profile.connection.type === 'local-k8s') {
    return [
      { title: 'Kube context', description: profile.connection.kubeContext },
      { title: 'Namespace', description: profile.connection.namespace },
      { title: 'Image', description: profile.connection.image },
    ];
  }
  return [
    { title: 'GCP project', description: profile.connection.project },
    { title: 'Region', description: profile.connection.region },
    { title: 'Bridge URL', description: profile.connection.bridgeUrl },
    { title: 'Audience', description: profile.connection.audience || '(unauthenticated)' },
  ];
};

/**
 * Read-only detail of a sandbox profile (opened by clicking a row), with live
 * provider metadata, an inline connection test, and Edit / Delete actions —
 * mirroring how connectors open a detail flyout.
 */
export const SandboxProfileDetailFlyout: React.FC<Props> = ({
  profile,
  onClose,
  onEdit,
  onDelete,
}) => {
  const { http, notifications } = useKibana().services;
  const { testProfile } = useSandboxProfiles();

  const [metadata, setMetadata] = useState<SandboxProviderMetadata | undefined>();
  const [metadataLoading, setMetadataLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<SandboxTestResult | undefined>();

  const loadMetadata = async () => {
    setMetadataLoading(true);
    try {
      const res = await http.get<{ enabled: boolean; metadata?: SandboxProviderMetadata }>(
        `${internalApiPath}/sandbox_profiles/${encodeURIComponent(profile.id)}/metadata`
      );
      setMetadata(res.metadata);
    } catch (e) {
      notifications.toasts.addError(e as Error, {
        title: i18n.translate('xpack.agentBuilder.sandboxes.metadataError', {
          defaultMessage: 'Failed to fetch sandbox metadata',
        }),
      });
    } finally {
      setMetadataLoading(false);
    }
  };

  const runTest = async () => {
    setTesting(true);
    setTestResult(undefined);
    try {
      const r = await testProfile(profile.id);
      setTestResult(r);
      setMetadata(r.metadata ?? metadata);
    } catch (e) {
      notifications.toasts.addError(e as Error, {
        title: i18n.translate('xpack.agentBuilder.sandboxes.testFailed', {
          defaultMessage: 'Sandbox test failed',
        }),
      });
    } finally {
      setTesting(false);
    }
  };

  // Fetch metadata once when the flyout opens.
  React.useEffect(() => {
    void loadMetadata();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile.id]);

  return (
    <EuiFlyout onClose={onClose} size="m" data-test-subj="agentBuilderSandboxDetailFlyout">
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2>{profile.name}</h2>
        </EuiTitle>
        {profile.description ? (
          <EuiText size="s" color="subdued">
            {profile.description}
          </EuiText>
        ) : null}
        <EuiSpacer size="s" />
        <EuiFlexGroup gutterSize="s" responsive={false} alignItems="center">
          <EuiFlexItem grow={false}>
            <EuiBadge color="hollow">{profile.provider}</EuiBadge>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiBadge color="hollow">{profile.runtime}</EuiBadge>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutHeader>

      <EuiFlyoutBody>
        {/* Compute provider connection */}
        <EuiTitle size="xxs">
          <h3>
            {i18n.translate('xpack.agentBuilder.sandboxes.detail.compute', {
              defaultMessage: 'Compute provider',
            })}
          </h3>
        </EuiTitle>
        <EuiSpacer size="s" />
        <EuiDescriptionList
          type="responsiveColumn"
          columnWidths={[1, 2]}
          listItems={connectionItems(profile)}
        />

        <EuiHorizontalRule margin="m" />
        <EuiTitle size="xxs">
          <h3>
            {i18n.translate('xpack.agentBuilder.sandboxes.detail.runtime', {
              defaultMessage: 'Coding runtime',
            })}
          </h3>
        </EuiTitle>
        <EuiSpacer size="s" />
        <EuiDescriptionList
          type="responsiveColumn"
          columnWidths={[1, 2]}
          listItems={[
            {
              title: <LabelWithHelp label="Runtime" help={FIELD_HELP.runtime} />,
              description: profile.runtime,
            },
            { title: 'Model gateway', description: profile.runtimeConfig.baseUrl },
            ...(profile.runtimeConfig.type === 'pi'
              ? [
                  {
                    title: <LabelWithHelp label="Model" help={FIELD_HELP.model} />,
                    description: profile.runtimeConfig.model,
                  },
                ]
              : [
                  { title: 'Orchestrator', description: profile.runtimeConfig.orchestratorModel },
                  { title: 'Coder', description: profile.runtimeConfig.coderModel },
                ]),
          ]}
        />

        <EuiHorizontalRule margin="m" />
        <EuiFlexGroup alignItems="center" gutterSize="s">
          <EuiFlexItem grow={false}>
            <EuiTitle size="xxs">
              <h3>
                {i18n.translate('xpack.agentBuilder.sandboxes.detail.capabilities', {
                  defaultMessage: 'Capabilities',
                })}
              </h3>
            </EuiTitle>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiIconTip
              content={TIER_HELP[profile.policy.tier ?? 'investigate']}
              position="top"
              type="question"
              color="subdued"
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiBadge color={profile.policy.tier === 'trusted' ? 'warning' : 'hollow'}>
              {profile.policy.tier ?? 'investigate'}
            </EuiBadge>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer size="s" />
        {(() => {
          const caps = resolveSandboxCapabilities(profile.policy);
          const egressValue =
            caps.egress === 'allowlist' && caps.egressAllowlist?.length
              ? `allowlist (${caps.egressAllowlist.join(', ')})`
              : caps.egress;
          // One `?` per row, on the label. Its tooltip explains the field and
          // the meaning of the current value, so the value column stays clean.
          const help = (field: string, value: string) => (
            <>
              {field}
              <EuiSpacer size="xs" />
              <em>This profile: {value}</em>
            </>
          );
          return (
            <EuiDescriptionList
              type="responsiveColumn"
              columnWidths={[1, 2]}
              listItems={[
                {
                  title: (
                    <LabelWithHelp
                      label="Filesystem"
                      help={help(FIELD_HELP.filesystem, VALUE_HELP.filesystem[caps.filesystem])}
                    />
                  ),
                  description: caps.filesystem,
                },
                {
                  title: (
                    <LabelWithHelp
                      label="Egress"
                      help={help(FIELD_HELP.egress, VALUE_HELP.egress[caps.egress])}
                    />
                  ),
                  description: egressValue,
                },
                {
                  title: (
                    <LabelWithHelp
                      label="Connectors"
                      help={help(
                        FIELD_HELP.connectors,
                        VALUE_HELP.connectors[caps.connectorAccess]
                      )}
                    />
                  ),
                  description: caps.connectorAccess,
                },
                {
                  title: (
                    <LabelWithHelp
                      label="Git"
                      help={help(FIELD_HELP.git, VALUE_HELP.git[caps.git.mode])}
                    />
                  ),
                  description: caps.git.mode,
                },
              ]}
            />
          );
        })()}

        <EuiHorizontalRule margin="m" />
        <EuiFlexGroup alignItems="center" gutterSize="s">
          <EuiFlexItem>
            <EuiTitle size="xxs">
              <h3>
                {i18n.translate('xpack.agentBuilder.sandboxes.detail.metadata', {
                  defaultMessage: 'Live environment',
                })}
              </h3>
            </EuiTitle>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            {metadataLoading ? <EuiLoadingSpinner size="s" /> : null}
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer size="s" />
        {metadata ? (
          <>
            <EuiDescriptionList
              type="responsiveColumn"
              columnWidths={[1, 2]}
              listItems={[
                {
                  title: 'Environment',
                  description: (
                    <span>
                      {metadata.environment}{' '}
                      {metadata.isLocal ? <EuiIcon type="desktop" size="s" /> : null}
                    </span>
                  ),
                },
                { title: 'Server version', description: metadata.serverVersion ?? '—' },
                { title: 'Client version', description: metadata.clientVersion ?? '—' },
                { title: 'Server URL', description: metadata.serverUrl ?? '—' },
                ...(metadata.nodes?.length
                  ? [{ title: 'Nodes', description: metadata.nodes.join(', ') }]
                  : []),
              ]}
            />
            {metadata.error ? (
              <>
                <EuiSpacer size="s" />
                <EuiCallOut size="s" color="warning" title={metadata.error} />
              </>
            ) : null}
          </>
        ) : (
          <EuiText size="s" color="subdued">
            {i18n.translate('xpack.agentBuilder.sandboxes.detail.noMetadata', {
              defaultMessage: 'Environment metadata unavailable.',
            })}
          </EuiText>
        )}

        <EuiHorizontalRule margin="m" />
        <EuiFlexGroup alignItems="center" gutterSize="s">
          <EuiFlexItem grow={false}>
            <EuiButton
              size="s"
              iconType="play"
              onClick={runTest}
              isLoading={testing}
              data-test-subj="agentBuilderSandboxTestButton"
            >
              {i18n.translate('xpack.agentBuilder.sandboxes.testConnection', {
                defaultMessage: 'Test connection',
              })}
            </EuiButton>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiText size="xs" color="subdued">
              {i18n.translate('xpack.agentBuilder.sandboxes.testConnectionHint', {
                defaultMessage: 'Provisions a throwaway sandbox, runs a command, tears it down.',
              })}
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>

        {testResult ? (
          <>
            <EuiSpacer size="s" />
            <EuiCallOut
              size="s"
              color={testResult.ok ? 'success' : 'danger'}
              iconType={testResult.ok ? 'check' : 'alert'}
              title={
                testResult.ok
                  ? i18n.translate('xpack.agentBuilder.sandboxes.testOk', {
                      defaultMessage: 'Sandbox is ready to run coding sub-agents',
                    })
                  : i18n.translate('xpack.agentBuilder.sandboxes.testKo', {
                      defaultMessage: 'Sandbox test did not pass',
                    })
              }
              data-test-subj="agentBuilderSandboxTestResult"
            />
            <EuiSpacer size="s" />
            {testResult.steps.map((step) => (
              <EuiText size="s" key={step.name}>
                <EuiHealth color={step.ok ? 'success' : 'danger'}>
                  {step.name} — {step.durationMs}ms{step.detail ? ` (${step.detail})` : ''}
                </EuiHealth>
              </EuiText>
            ))}
          </>
        ) : null}
      </EuiFlyoutBody>

      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              color="danger"
              iconType="trash"
              onClick={onDelete}
              data-test-subj="agentBuilderSandboxDeleteButton"
            >
              {i18n.translate('xpack.agentBuilder.sandboxes.delete', { defaultMessage: 'Delete' })}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              iconType="pencil"
              onClick={onEdit}
              data-test-subj="agentBuilderSandboxEditButton"
            >
              {i18n.translate('xpack.agentBuilder.sandboxes.edit', { defaultMessage: 'Edit' })}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};
