/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { castArray, isEmpty, pickBy } from 'lodash';
import React, { useContext, useMemo } from 'react';

import type { ECSMapping } from '@kbn/osquery-io-ts-types';
import { replaceParamsQuery } from '../../common/utils/replace_params_query';
import { AlertAttachmentContext } from '../common/contexts';
import { LiveQueryForm } from './form';
import type { AgentSelection } from '../agents/types';
import type { AddToTimelineHandler } from '../types';

interface LiveQueryProps {
  agentId?: string;
  agentIds?: string[];
  alertIds?: string[];
  agentPolicyIds?: string[];
  onSuccess?: () => void;
  query?: string;
  timeout?: number;
  savedQueryId?: string;
  ecs_mapping?: ECSMapping;
  agentsField?: boolean;
  queryField?: boolean;
  ecsMappingField?: boolean;
  enabled?: boolean;
  formType?: 'steps' | 'simple';
  hideAgentsField?: boolean;
  packId?: string;
  agentSelection?: AgentSelection;
  addToTimeline?: AddToTimelineHandler;
}

const LiveQueryComponent: React.FC<LiveQueryProps> = ({
  agentId,
  agentIds,
  alertIds,
  agentPolicyIds,
  onSuccess,
  query,
  savedQueryId,
  ecs_mapping,
  queryField,
  ecsMappingField,
  formType,
  enabled,
  hideAgentsField,
  packId,
  agentSelection,
  timeout,
  addToTimeline,
}) => {
  const initialAgentSelection = useMemo(() => {
    if (agentSelection) {
      return agentSelection;
    }

    if (agentId || agentPolicyIds?.length) {
      return {
        allAgentsSelected: false,
        agents: castArray(agentId ?? agentIds ?? []),
        platformsSelected: [],
        policiesSelected: agentPolicyIds ?? [],
      };
    }

    return null;
  }, [agentId, agentIds, agentPolicyIds, agentSelection]);
  const ecsData = useContext(AlertAttachmentContext);

  const initialQuery = useMemo(() => {
    if (ecsData && query) {
      const { result } = replaceParamsQuery(query, ecsData);

      return result;
    }

    return query;
  }, [ecsData, query]);

  const defaultValue = useMemo(() => {
    const initialValue = {
      ...(initialAgentSelection ? { agentSelection: initialAgentSelection } : {}),
      alertIds,
      query: initialQuery,
      savedQueryId,
      ecs_mapping,
      timeout,
      packId,
    };

    return !isEmpty(pickBy(initialValue, (value) => !isEmpty(value))) ? initialValue : undefined;
  }, [alertIds, ecs_mapping, initialAgentSelection, initialQuery, packId, savedQueryId, timeout]);

  return (
    <LiveQueryForm
      queryField={queryField}
      ecsMappingField={ecsMappingField}
      defaultValue={defaultValue}
      onSuccess={onSuccess}
      formType={formType}
      enabled={enabled}
      hideAgentsField={hideAgentsField}
      addToTimeline={addToTimeline}
    />
  );
};

export const LiveQuery = React.memo(LiveQueryComponent);
