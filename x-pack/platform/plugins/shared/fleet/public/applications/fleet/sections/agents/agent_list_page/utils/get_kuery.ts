/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';

import { AgentStatusKueryHelper } from '../../../../services';
import { AGENTS_PREFIX } from '../../../../constants';

const NO_TAGS_VALUE = i18n.translate('xpack.fleet.noTagsValue', {
  defaultMessage: 'No Tags',
});
export const getKuery = ({
  search,
  selectedAgentPolicies,
  selectedTags,
  selectedStatus,
  selectedAgentIds,
}: {
  search?: string;
  selectedAgentPolicies?: string[];
  selectedTags?: string[];
  selectedStatus?: string[];
  selectedAgentIds?: string[];
}) => {
  let kueryBuilder = '';
  if (search) {
    kueryBuilder = search.trim();
  }

  if (selectedAgentPolicies?.length) {
    if (kueryBuilder) {
      kueryBuilder = `(${kueryBuilder}) and`;
    }
    kueryBuilder = `${kueryBuilder} ${AGENTS_PREFIX}.policy_id : (${selectedAgentPolicies
      .map((agentPolicy) => `"${agentPolicy}"`)
      .join(' or ')})`;
  }

  if (selectedTags?.length) {
    if (kueryBuilder) {
      kueryBuilder = `(${kueryBuilder}) and`;
    }
    //  if the user selects no tags as one of the items, we should remove it from the initial array and have its own condition
    if (selectedTags.includes(NO_TAGS_VALUE)) {
      const filteredTags = selectedTags.filter((tag) => tag !== NO_TAGS_VALUE);
      // add the no tags condition, and if there are remaining tags, also add them, otherwise add nothing else but the closing parentheses
      kueryBuilder = `${kueryBuilder} ((NOT ${AGENTS_PREFIX}.tags : (*))${
        filteredTags.length > 0
          ? ` or ${AGENTS_PREFIX}.tags : (${filteredTags.map((tag) => `"${tag}"`).join(' or ')}))`
          : ')'
      }`;
    } else {
      kueryBuilder = `${kueryBuilder} ${AGENTS_PREFIX}.tags : (${selectedTags
        .map((tag) => `"${tag}"`)
        .join(' or ')})`;
    }
  }

  if (selectedAgentIds?.length) {
    if (kueryBuilder) {
      kueryBuilder = `(${kueryBuilder}) and`;
    }
    kueryBuilder = `${kueryBuilder} ${AGENTS_PREFIX}.agent.id : (${selectedAgentIds
      .map((id) => `"${id}"`)
      .join(' or ')})`;
  }

  if (selectedStatus?.length) {
    const kueryStatus = selectedStatus
      .map((status) => {
        switch (status) {
          case 'healthy':
            return AgentStatusKueryHelper.buildKueryForOnlineAgents();
          case 'unhealthy':
            return AgentStatusKueryHelper.buildKueryForErrorAgents();
          case 'offline':
            return AgentStatusKueryHelper.buildKueryForOfflineAgents();
          case 'updating':
            return AgentStatusKueryHelper.buildKueryForUpdatingAgents();
          case 'inactive':
            return AgentStatusKueryHelper.buildKueryForInactiveAgents();
          case 'unenrolled':
            return AgentStatusKueryHelper.buildKueryForUnenrolledAgents();
          case 'orphaned':
            return AgentStatusKueryHelper.buildKueryForOrphanedAgents();
          case 'uninstalled':
            return AgentStatusKueryHelper.buildKueryForUninstalledAgents();
        }

        return undefined;
      })

      .filter((statusKuery) => statusKuery !== undefined)
      .join(' or ');
    if (kueryBuilder) {
      kueryBuilder = `(${kueryBuilder}) and (${kueryStatus})`;
    } else {
      kueryBuilder = kueryStatus;
    }
  }
  return kueryBuilder.trim();
};
