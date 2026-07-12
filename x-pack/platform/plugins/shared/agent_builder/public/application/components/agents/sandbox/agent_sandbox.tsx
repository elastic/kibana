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
  EuiDescriptionList,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiLink,
  EuiLoadingSpinner,
  EuiPanel,
  EuiSpacer,
  EuiSuperSelect,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useQueryClient } from '@kbn/react-query';
import { useAgentBuilderServices } from '../../../hooks/use_agent_builder_service';
import { useAgentBuilderAgentById } from '../../../hooks/agents/use_agent_by_id';
import { useCanUpdateAgent } from '../../../hooks/agents/use_can_update_agent';
import { useSandboxProfiles } from '../../../hooks/sandboxes/use_sandbox_profiles';
import { useKibana } from '../../../hooks/use_kibana';
import { useNavigation } from '../../../hooks/use_navigation';
import { queryKeys } from '../../../query_keys';
import { appPaths } from '../../../utils/app_paths';
import { PageWrapper } from '../common/page_wrapper';

interface Props {
  agentId: string;
}

const NONE_VALUE = '__none__';

/**
 * Per-agent "Sandbox" page (Customize nav). Attaches a Sandbox Profile to the
 * agent so it gets a coding sub-agent, mirroring how Connectors are managed per
 * agent. Without a profile the agent behaves as a normal Agent Builder agent.
 */
export const AgentSandbox: React.FC<Props> = ({ agentId }) => {
  const { agentService } = useAgentBuilderServices();
  const { notifications } = useKibana().services;
  const { createAgentBuilderUrl } = useNavigation();
  const queryClient = useQueryClient();
  const { agent, isLoading: agentLoading } = useAgentBuilderAgentById(agentId);
  const { profiles, isLoading: profilesLoading } = useSandboxProfiles();
  const canEdit = useCanUpdateAgent({ agent: agent ?? null });

  const [saving, setSaving] = useState(false);
  const [pending, setPending] = useState<string | undefined>(undefined);

  const attachedId = agent?.configuration?.sandbox_profile_id;
  const selected = pending ?? attachedId ?? NONE_VALUE;
  const dirty = selected !== (attachedId ?? NONE_VALUE);
  const attachedProfile = useMemo(
    () => profiles.find((p) => p.id === attachedId),
    [profiles, attachedId]
  );

  const options = [
    {
      value: NONE_VALUE,
      inputDisplay: i18n.translate('xpack.agentBuilder.agentSandbox.none', {
        defaultMessage: 'None (no coding sub-agent)',
      }),
    },
    ...profiles.map((p) => ({
      value: p.id,
      inputDisplay: `${p.name} (${p.provider} / ${p.runtime})`,
    })),
  ];

  const save = async () => {
    if (!agent) return;
    setSaving(true);
    try {
      // Send explicit `null` to detach (JSON drops `undefined`, so the server
      // would otherwise keep the previously attached profile).
      const nextId = selected === NONE_VALUE ? null : selected;
      await agentService.update(agentId, {
        configuration: { ...agent.configuration, sandbox_profile_id: nextId },
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.agentProfiles.byId(agentId) });
      setPending(undefined);
      notifications.toasts.addSuccess(
        i18n.translate('xpack.agentBuilder.agentSandbox.saved', {
          defaultMessage: 'Agent sandbox updated',
        })
      );
    } catch (e) {
      notifications.toasts.addError(e as Error, {
        title: i18n.translate('xpack.agentBuilder.agentSandbox.saveError', {
          defaultMessage: 'Failed to update agent sandbox',
        }),
      });
    } finally {
      setSaving(false);
    }
  };

  if (agentLoading || profilesLoading) {
    return (
      <PageWrapper>
        <EuiSpacer size="xl" />
        <EuiLoadingSpinner size="l" />
      </PageWrapper>
    );
  }

  const manageHref = createAgentBuilderUrl(appPaths.manage.sandboxes);

  return (
    <PageWrapper>
      <EuiSpacer size="l" />
      <EuiTitle size="m">
        <h1>
          {i18n.translate('xpack.agentBuilder.agentSandbox.title', {
            defaultMessage: 'Sandbox',
          })}
        </h1>
      </EuiTitle>
      <EuiSpacer size="s" />
      <EuiText color="subdued" size="s">
        {i18n.translate('xpack.agentBuilder.agentSandbox.description', {
          defaultMessage:
            'Attach a sandbox to give this agent a coding sub-agent that writes, runs, and reasons about code in isolation. This is an experimental capability.',
        })}
      </EuiText>
      <EuiSpacer size="l" />

      {profiles.length === 0 ? (
        <EuiEmptyPrompt
          iconType="node"
          title={
            <h2>
              {i18n.translate('xpack.agentBuilder.agentSandbox.emptyTitle', {
                defaultMessage: 'No sandboxes available',
              })}
            </h2>
          }
          body={
            <p>
              {i18n.translate('xpack.agentBuilder.agentSandbox.emptyBody', {
                defaultMessage:
                  'Connect a sandbox (local Kubernetes or Cloud Run) before you can attach one to this agent.',
              })}
            </p>
          }
          actions={
            <EuiButton href={manageHref} iconType="plusInCircle">
              {i18n.translate('xpack.agentBuilder.agentSandbox.manage', {
                defaultMessage: 'Manage sandboxes',
              })}
            </EuiButton>
          }
        />
      ) : (
        <EuiPanel hasBorder paddingSize="l">
          <EuiFormRow
            fullWidth
            label={i18n.translate('xpack.agentBuilder.agentSandbox.select', {
              defaultMessage: 'Attached sandbox',
            })}
          >
            <EuiSuperSelect
              fullWidth
              disabled={!canEdit}
              options={options}
              valueOfSelected={selected}
              onChange={(v) => setPending(v)}
              data-test-subj="agentBuilderAgentSandboxPageSelect"
            />
          </EuiFormRow>

          {attachedProfile && (
            <>
              <EuiSpacer size="m" />
              <EuiDescriptionList
                type="responsiveColumn"
                columnWidths={[1, 2]}
                listItems={[
                  { title: 'Provider', description: attachedProfile.provider },
                  { title: 'Runtime', description: attachedProfile.runtime },
                  {
                    title: 'Model',
                    description:
                      attachedProfile.runtimeConfig.type === 'pi'
                        ? attachedProfile.runtimeConfig.model
                        : attachedProfile.runtimeConfig.coderModel,
                  },
                ]}
              />
            </>
          )}

          <EuiSpacer size="m" />
          <EuiFlexGroup justifyContent="flexEnd" gutterSize="s">
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty disabled={!dirty || saving} onClick={() => setPending(undefined)}>
                {i18n.translate('xpack.agentBuilder.agentSandbox.reset', {
                  defaultMessage: 'Reset',
                })}
              </EuiButtonEmpty>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButton
                fill
                onClick={save}
                isLoading={saving}
                disabled={!dirty || !canEdit}
                data-test-subj="agentBuilderAgentSandboxSaveButton"
              >
                {i18n.translate('xpack.agentBuilder.agentSandbox.saveButton', {
                  defaultMessage: 'Save',
                })}
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>

          <EuiSpacer size="m" />
          <EuiLink href={manageHref}>
            {i18n.translate('xpack.agentBuilder.agentSandbox.manageLink', {
              defaultMessage: 'Manage all sandboxes',
            })}
          </EuiLink>
        </EuiPanel>
      )}

      {!canEdit && (
        <>
          <EuiSpacer size="m" />
          <EuiCallOut
            size="s"
            color="warning"
            title={i18n.translate('xpack.agentBuilder.agentSandbox.readOnly', {
              defaultMessage: 'You do not have permission to change this agent.',
            })}
          />
        </>
      )}
    </PageWrapper>
  );
};
