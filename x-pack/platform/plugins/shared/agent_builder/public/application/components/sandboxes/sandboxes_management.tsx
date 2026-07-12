/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import {
  EuiBadge,
  EuiBasicTable,
  EuiButton,
  EuiCallOut,
  EuiConfirmModal,
  EuiEmptyPrompt,
  EuiHealth,
  EuiLoadingSpinner,
  EuiText,
  type EuiBasicTableColumn,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import type { SandboxConnection, SandboxProfile } from '@kbn/agent-builder-common';
import { useKibana } from '../../hooks/use_kibana';
import { useSandboxProfiles } from '../../hooks/sandboxes/use_sandbox_profiles';
import { CreateSandboxProfileFlyout } from './create_sandbox_profile_flyout';
import { SandboxProfileDetailFlyout } from './sandbox_profile_detail_flyout';

const strings = {
  title: i18n.translate('xpack.agentBuilder.sandboxes.title', { defaultMessage: 'Sandboxes' }),
  description: i18n.translate('xpack.agentBuilder.sandboxes.description', {
    defaultMessage:
      'Connect an isolated compute backend and a coding runtime. Attach a sandbox to an agent to give it a coding sub-agent that can write, run, and reason about code in isolation.',
  }),
  create: i18n.translate('xpack.agentBuilder.sandboxes.create', {
    defaultMessage: 'Connect a sandbox',
  }),
  emptyTitle: i18n.translate('xpack.agentBuilder.sandboxes.emptyTitle', {
    defaultMessage: 'No sandboxes connected',
  }),
  emptyBody: i18n.translate('xpack.agentBuilder.sandboxes.emptyBody', {
    defaultMessage:
      'Connect a local Kubernetes cluster or a Google Cloud Run bridge to enable coding sub-agents.',
  }),
};

/** Environment label + local-ish health color per provider. */
const environmentOf = (connection: SandboxConnection): { label: string; isLocal: boolean } => {
  if (connection.type === 'local-k8s') {
    return {
      label: `${connection.kubeContext} / ${connection.namespace}`,
      isLocal: /kind|minikube|docker|orbstack/i.test(connection.kubeContext),
    };
  }
  return { label: `${connection.project} / ${connection.region}`, isLocal: false };
};

export const AgentBuilderSandboxes: React.FC = () => {
  const { notifications } = useKibana().services;
  const { profiles, canEncrypt, isLoading, deleteProfile } = useSandboxProfiles();
  const [createOpen, setCreateOpen] = useState(false);
  const [detailProfile, setDetailProfile] = useState<SandboxProfile | undefined>();
  const [editProfile, setEditProfile] = useState<SandboxProfile | undefined>();
  const [deleteTarget, setDeleteTarget] = useState<SandboxProfile | undefined>();

  const onDelete = useCallback(async () => {
    if (!deleteTarget) return;
    try {
      await deleteProfile(deleteTarget.id);
      notifications.toasts.addSuccess(
        i18n.translate('xpack.agentBuilder.sandboxes.deleted', {
          defaultMessage: 'Sandbox "{name}" deleted',
          values: { name: deleteTarget.name },
        })
      );
      setDetailProfile(undefined);
    } catch (e) {
      notifications.toasts.addError(e as Error, {
        title: i18n.translate('xpack.agentBuilder.sandboxes.deleteError', {
          defaultMessage: 'Failed to delete sandbox',
        }),
      });
    } finally {
      setDeleteTarget(undefined);
    }
  }, [deleteTarget, deleteProfile, notifications]);

  const columns: Array<EuiBasicTableColumn<SandboxProfile>> = [
    {
      field: 'name',
      name: i18n.translate('xpack.agentBuilder.sandboxes.col.name', { defaultMessage: 'Name' }),
      render: (name: string, profile: SandboxProfile) => (
        <EuiText size="s">
          <strong>{name}</strong>
          {profile.description ? (
            <>
              <br />
              <EuiText size="xs" color="subdued">
                {profile.description}
              </EuiText>
            </>
          ) : null}
        </EuiText>
      ),
    },
    {
      field: 'provider',
      name: i18n.translate('xpack.agentBuilder.sandboxes.col.provider', {
        defaultMessage: 'Provider',
      }),
      render: (provider: string) => <EuiBadge color="hollow">{provider}</EuiBadge>,
    },
    {
      field: 'runtime',
      name: i18n.translate('xpack.agentBuilder.sandboxes.col.runtime', {
        defaultMessage: 'Runtime',
      }),
      render: (runtime: string) => <EuiBadge color="hollow">{runtime}</EuiBadge>,
    },
    {
      name: i18n.translate('xpack.agentBuilder.sandboxes.col.environment', {
        defaultMessage: 'Environment',
      }),
      render: (profile: SandboxProfile) => {
        const env = environmentOf(profile.connection);
        return (
          <EuiHealth color={env.isLocal ? 'success' : 'subdued'}>
            <EuiText size="s">{env.label}</EuiText>
          </EuiHealth>
        );
      },
    },
  ];

  return (
    <KibanaPageTemplate data-test-subj="agentBuilderSandboxesPage">
      <KibanaPageTemplate.Header
        pageTitle={strings.title}
        description={strings.description}
        css={({ euiTheme }) => ({
          backgroundColor: euiTheme.colors.backgroundBasePlain,
          borderBlockEnd: 'none',
        })}
        rightSideItems={[
          <EuiButton
            key="create"
            fill
            iconType="plusInCircle"
            onClick={() => setCreateOpen(true)}
            disabled={!canEncrypt}
            data-test-subj="agentBuilderConnectSandboxButton"
          >
            {strings.create}
          </EuiButton>,
        ]}
      />
      <KibanaPageTemplate.Section>
        {!canEncrypt && (
          <EuiCallOut
            color="warning"
            title={i18n.translate('xpack.agentBuilder.sandboxes.noEncryption', {
              defaultMessage:
                'Encryption key is not configured. Set xpack.encryptedSavedObjects.encryptionKey to store sandboxes.',
            })}
          />
        )}
        {isLoading ? (
          <EuiLoadingSpinner size="l" />
        ) : profiles.length === 0 ? (
          <EuiEmptyPrompt
            iconType="node"
            title={<h2>{strings.emptyTitle}</h2>}
            body={<p>{strings.emptyBody}</p>}
            actions={
              <EuiButton fill onClick={() => setCreateOpen(true)} disabled={!canEncrypt}>
                {strings.create}
              </EuiButton>
            }
          />
        ) : (
          <EuiBasicTable
            items={profiles}
            columns={columns}
            data-test-subj="agentBuilderSandboxesTable"
            rowProps={(profile: SandboxProfile) => ({
              onClick: () => setDetailProfile(profile),
              style: { cursor: 'pointer' },
              'data-test-subj': `agentBuilderSandboxRow-${profile.id}`,
            })}
          />
        )}
      </KibanaPageTemplate.Section>

      {createOpen && <CreateSandboxProfileFlyout onClose={() => setCreateOpen(false)} />}

      {editProfile && (
        <CreateSandboxProfileFlyout
          profile={editProfile}
          onClose={() => setEditProfile(undefined)}
        />
      )}

      {detailProfile && !editProfile && (
        <SandboxProfileDetailFlyout
          profile={detailProfile}
          onClose={() => setDetailProfile(undefined)}
          onEdit={() => {
            setEditProfile(detailProfile);
          }}
          onDelete={() => setDeleteTarget(detailProfile)}
        />
      )}

      {deleteTarget && (
        <EuiConfirmModal
          title={i18n.translate('xpack.agentBuilder.sandboxes.deleteConfirmTitle', {
            defaultMessage: 'Delete sandbox "{name}"?',
            values: { name: deleteTarget.name },
          })}
          onCancel={() => setDeleteTarget(undefined)}
          onConfirm={onDelete}
          cancelButtonText={i18n.translate('xpack.agentBuilder.sandboxes.cancel', {
            defaultMessage: 'Cancel',
          })}
          confirmButtonText={i18n.translate('xpack.agentBuilder.sandboxes.deleteConfirm', {
            defaultMessage: 'Delete sandbox',
          })}
          buttonColor="danger"
        >
          <EuiText size="s">
            {i18n.translate('xpack.agentBuilder.sandboxes.deleteConfirmBody', {
              defaultMessage: 'Agents attached to this sandbox will lose their coding sub-agent.',
            })}
          </EuiText>
        </EuiConfirmModal>
      )}
    </KibanaPageTemplate>
  );
};
