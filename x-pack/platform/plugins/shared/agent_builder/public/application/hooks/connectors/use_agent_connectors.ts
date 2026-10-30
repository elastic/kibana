/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation, useQueryClient } from '@kbn/react-query';
import type { AgentDefinition } from '@kbn/agent-builder-common';
import { i18n } from '@kbn/i18n';
import { useCallback, useMemo } from 'react';
import type { IHttpFetchError } from '@kbn/core-http-browser';
import { getConnectorSpec } from '@kbn/connector-specs';
import type { ConnectorItem } from '../../../../common/http_api/tools';
import { queryKeys } from '../../query_keys';
import { useAgentBuilderAgentById } from '../agents/use_agent_by_id';
import { useAgentBuilderServices } from '../use_agent_builder_service';
import { useListConnectors } from '../tools/use_mcp_connectors';
import { useToasts } from '../use_toasts';
import { agentHasConnector, getEffectiveConnectorIds } from './connector_ids_utils';

interface AgentConnectorsUpdate {
  connectorIds?: string[];
  skillIds?: string[];
}

const isAlreadyExistsError = (reason: unknown): boolean =>
  (reason as IHttpFetchError)?.response?.status === 409;

export const useAgentConnectors = ({ agentId }: { agentId: string }) => {
  const { agent } = useAgentBuilderAgentById(agentId);
  const { connectors: allConnectors, isLoading } = useListConnectors({});
  const { agentService, skillsService } = useAgentBuilderServices();
  const queryClient = useQueryClient();
  const { addSuccessToast, addErrorToast } = useToasts();

  const agentQueryKey = queryKeys.agentProfiles.byId(agentId);

  const assignedConnectors = useMemo(
    () => (agent ? allConnectors.filter((c) => agentHasConnector(agent, c.id)) : []),
    [agent, allConnectors]
  );

  const activeConnectorIdSet = useMemo(
    () => new Set(agent ? getEffectiveConnectorIds(agent) : []),
    [agent]
  );

  const getCurrentConnectorIds = useCallback((): string[] => {
    const currentAgent = queryClient.getQueryData<AgentDefinition>(agentQueryKey);
    return currentAgent ? getEffectiveConnectorIds(currentAgent) : [];
  }, [queryClient, agentQueryKey]);

  const getCurrentSkillIds = useCallback((): string[] => {
    const currentAgent = queryClient.getQueryData<AgentDefinition>(agentQueryKey);
    return currentAgent?.configuration?.skill_ids ?? [];
  }, [queryClient, agentQueryKey]);

  // Connector and skill ids are saved in one request: separate requests each replace the stored
  // agent document and can overwrite each other.
  const updateAgentMutation = useMutation({
    mutationFn: ({ connectorIds, skillIds }: AgentConnectorsUpdate) =>
      agentService.update(agentId, {
        configuration: {
          ...(connectorIds ? { connector_ids: connectorIds } : {}),
          ...(skillIds ? { skill_ids: skillIds } : {}),
        },
      }),
    onMutate: async ({ connectorIds, skillIds }: AgentConnectorsUpdate) => {
      await queryClient.cancelQueries({ queryKey: agentQueryKey });
      const previousAgent = queryClient.getQueryData<AgentDefinition>(agentQueryKey);
      if (previousAgent) {
        queryClient.setQueryData<AgentDefinition>(agentQueryKey, {
          ...previousAgent,
          configuration: {
            ...previousAgent.configuration,
            ...(connectorIds ? { connector_ids: connectorIds } : {}),
            ...(skillIds ? { skill_ids: skillIds } : {}),
          },
        });
      }
      return { previousAgent };
    },
    onError: (_err, _update, context) => {
      if (context?.previousAgent) {
        queryClient.setQueryData<AgentDefinition>(agentQueryKey, context.previousAgent);
      }
      addErrorToast({
        title: i18n.translate('xpack.agentBuilder.agentConnectors.updateErrorToast', {
          defaultMessage: 'Failed to update connectors',
        }),
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: agentQueryKey });
    },
  });

  const assign = useCallback(
    (connector: Pick<ConnectorItem, 'id' | 'name' | 'actionTypeId'>) => {
      const skillFiles = getConnectorSpec(connector.actionTypeId)?.skillFiles ?? [];

      const save = (installedSkillIds: string[]) => {
        const currentConnectorIds = getCurrentConnectorIds();
        const currentSkillIds = getCurrentSkillIds();
        const connectorIds = currentConnectorIds.includes(connector.id)
          ? undefined
          : [...currentConnectorIds, connector.id];
        const missingSkillIds = installedSkillIds.filter((id) => !currentSkillIds.includes(id));
        const skillIds =
          missingSkillIds.length > 0 ? [...currentSkillIds, ...missingSkillIds] : undefined;
        if (!connectorIds && !skillIds) return;

        updateAgentMutation.mutate(
          { connectorIds, skillIds },
          {
            onSuccess: () => {
              if (!connectorIds) return;
              addSuccessToast({
                title: i18n.translate('xpack.agentBuilder.agentConnectors.assignSuccessToast', {
                  defaultMessage: '{name} added',
                  values: { name: connector.name },
                }),
              });
            },
          }
        );
      };

      if (skillFiles.length === 0) {
        save([]);
        return;
      }

      // Create the connector type's skills; a 409 means a skill with that id already exists.
      Promise.allSettled(
        skillFiles.map((skill) =>
          skillsService.create({
            id: skill.name,
            name: skill.name,
            description: skill.description,
            content: skill.content,
            referenced_content: skill.resources?.map((r) => ({
              name: r.name,
              relativePath: r.relativePath,
              content: r.content,
            })),
            tool_ids: [],
          })
        )
      ).then((results) => {
        // Only link skills that exist, so the agent never points at a skill that failed to create.
        const installedSkillIds = skillFiles
          .filter((_, index) => {
            const result = results[index];
            return result.status === 'fulfilled' || isAlreadyExistsError(result.reason);
          })
          .map((skill) => skill.name);

        if (installedSkillIds.length < skillFiles.length) {
          addErrorToast({
            title: i18n.translate('xpack.agentBuilder.agentConnectors.skillCreateErrorToast', {
              defaultMessage: 'Connector added, but its skill could not be created.',
            }),
          });
        }

        save(installedSkillIds);
      });
    },
    [
      getCurrentConnectorIds,
      getCurrentSkillIds,
      updateAgentMutation,
      addSuccessToast,
      addErrorToast,
      skillsService,
    ]
  );

  const unassign = useCallback(
    (connector: ConnectorItem) => {
      const currentIds = getCurrentConnectorIds();
      updateAgentMutation.mutate(
        { connectorIds: currentIds.filter((id) => id !== connector.id) },
        {
          onSuccess: () =>
            addSuccessToast({
              title: i18n.translate('xpack.agentBuilder.agentConnectors.unassignSuccessToast', {
                defaultMessage: '{name} removed',
                values: { name: connector.name },
              }),
            }),
        }
      );
    },
    [getCurrentConnectorIds, updateAgentMutation, addSuccessToast]
  );

  return {
    assignedConnectors,
    allConnectors,
    activeConnectorIdSet,
    isLoading,
    isAssigning: updateAgentMutation.isLoading,
    assign,
    unassign,
  };
};
