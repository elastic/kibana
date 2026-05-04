/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import type { RuleResponse } from '@kbn/alerting-v2-schemas';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { RELATED_ALERT_EPISODES_PAGE_SIZE } from '@kbn/alerting-v2-episodes-ui/constants';
import { useFetchEpisodeActions } from '@kbn/alerting-v2-episodes-ui/hooks/use_fetch_episode_actions';
import { useFetchGroupActions } from '@kbn/alerting-v2-episodes-ui/hooks/use_fetch_group_actions';
import { useFetchSameRuleEpisodesQuery } from '@kbn/alerting-v2-episodes-ui/hooks/use_fetch_same_rule_episodes_query';
import { css } from '@emotion/react';
import type { AlertEpisodesKibanaServices } from '../../episodes_kibana_services';
import { RelatedAlertEpisodesList } from './related_alert_episodes_list';
import * as i18n from './translations';

export interface RelatedEpisodesRuleSubsectionProps {
  currentEpisodeId: string | undefined;
  currentGroupHash: string | undefined;
  rule: RuleResponse;
  ruleId: string | undefined;
}

/**
 * Related episodes for the same rule: other group_hash values, or all other rule episodes if there is no group.
 */
export function RelatedEpisodesRuleSubsection({
  currentEpisodeId,
  currentGroupHash,
  rule,
  ruleId,
}: RelatedEpisodesRuleSubsectionProps) {
  const { euiTheme } = useEuiTheme();
  const {
    services: { notifications, expressions },
  } = useKibana<AlertEpisodesKibanaServices>();
  const toastDanger = useCallback(
    (message: string) => {
      notifications.toasts.addDanger(message);
    },
    [notifications]
  );

  const { data: otherGroupRows = [], isLoading: isLoadingOtherGroupRows } =
    useFetchSameRuleEpisodesQuery({
      ruleId,
      excludeEpisodeId: currentEpisodeId,
      pageSize: RELATED_ALERT_EPISODES_PAGE_SIZE,
      currentGroupHash,
      expressions,
      toastDanger,
    });

  const otherEpisodeIds = useMemo(
    () => otherGroupRows.map((row) => row['episode.id']).filter(Boolean) as string[],
    [otherGroupRows]
  );

  const otherGroupHashes = useMemo(
    () => [
      ...new Set(
        otherGroupRows.map((row) => row.group_hash).filter((hash): hash is string => Boolean(hash))
      ),
    ],
    [otherGroupRows]
  );

  const { data: otherEpisodeActionsMap } = useFetchEpisodeActions({
    episodeIds: otherEpisodeIds,
    expressions,
  });

  const { data: otherGroupActionsMap } = useFetchGroupActions({
    groupHashes: otherGroupHashes,
    expressions,
  });

  return (
    <div
      data-test-subj="alertingV2RelatedEpisodesRuleSubsection"
      css={css`
        padding-inline: ${euiTheme.size.m};
        padding-bottom: ${euiTheme.size.m};
      `}
    >
      <EuiTitle size="xs">
        <h4>
          {currentGroupHash ? i18n.RELATED_OTHER_GROUPS_TITLE : i18n.RELATED_RULE_ONLY_LIST_TITLE}
        </h4>
      </EuiTitle>
      <EuiText size="s" color="subdued" css={{ marginBlockStart: euiTheme.size.xs }}>
        {currentGroupHash
          ? i18n.RELATED_OTHER_GROUPS_DESCRIPTION
          : i18n.RELATED_RULE_ONLY_LIST_DESCRIPTION}
      </EuiText>
      <EuiSpacer size="s" />
      {isLoadingOtherGroupRows ? (
        <EuiFlexGroup justifyContent="center" data-test-subj="alertingV2RelatedEpisodesRuleLoading">
          <EuiFlexItem grow={false}>
            <EuiLoadingSpinner size="l" />
          </EuiFlexItem>
        </EuiFlexGroup>
      ) : otherGroupRows.length === 0 ? (
        <EuiPanel
          color="subdued"
          hasShadow={false}
          paddingSize="m"
          data-test-subj="alertingV2RelatedEpisodesRuleEmpty"
        >
          <EuiText size="s" color="subdued" textAlign="center">
            {i18n.RELATED_OTHER_GROUPS_EMPTY}
          </EuiText>
        </EuiPanel>
      ) : (
        <RelatedAlertEpisodesList
          rows={otherGroupRows}
          rule={rule}
          getEpisodeAction={(id) => otherEpisodeActionsMap?.get(id)}
          getGroupAction={(gh) => otherGroupActionsMap?.get(gh)}
        />
      )}
    </div>
  );
}
