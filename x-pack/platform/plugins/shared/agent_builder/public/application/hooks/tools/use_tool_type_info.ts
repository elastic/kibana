/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { useQuery } from '@kbn/react-query';
import { ToolType } from '@kbn/agent-builder-common';
import { queryKeys } from '../../query_keys';
import { useAgentBuilderServices } from '../use_agent_builder_service';
import { useKibana } from '../use_kibana';

export const useToolTypes = () => {
  const { toolsService } = useAgentBuilderServices();
  const {
    services: { settings },
  } = useKibana();

  const { data: serverToolTypes = [], isLoading } = useQuery({
    queryKey: queryKeys.tools.typeInfo,
    queryFn: () => toolsService.getToolTypes(),
  });

  const workflowsEnabled = useMemo(
    () => settings.client.get('workflows:ui:enabled', false),
    [settings]
  );

  const toolTypes = useMemo(() => {
    return serverToolTypes.filter(
      (toolType) => workflowsEnabled || toolType.type !== ToolType.workflow
    );
  }, [serverToolTypes, workflowsEnabled]);

  return { toolTypes, isLoading };
};
