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
import { useFetchSameGroupEpisodesQuery } from '@kbn/alerting-v2-episodes-ui/hooks/use_fetch_same_group_episodes_query';
import { css } from '@emotion/react';
import type { AlertEpisodesKibanaServices } from '../../episodes_kibana_services';
import { RelatedAlertEpisodesList } from './related_alert_episodes_list';
import * as i18n from './translations';

export interface RelatedEpisodesGroupSubsectionProps {
  currentEpisodeId: string | undefined;
  groupHash: string | undefined;
  rule: RuleResponse;
  ruleId: string | undefined;
}

/**
 * Related episodes that share the same rule id and group_hash
 */
export function RelatedEpisodesGroupSubsection({
  currentEpisodeId,
  groupHash,
  rule,
  ruleId,
}: RelatedEpisodesGroupSubsectionProps) {
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

  const { data: sameGroupRows = [], isLoading: isLoadingSameGroupRows } =
    useFetchSameGroupEpisodesQuery({
      ruleId,
      excludeEpisodeId: currentEpisodeId,
      pageSize: RELATED_ALERT_EPISODES_PAGE_SIZE,
      groupHash,
      expressions,
      toastDanger,
    });

  const sameGroupEpisodeIds = useMemo(
    () => sameGroupRows.map((row) => row['episode.id']).filter(Boolean) as string[],
    [sameGroupRows]
  );

  const sameGroupGroupHashes = useMemo(
    () => [
      ...new Set(
        sameGroupRows.map((row) => row.group_hash).filter((hash): hash is string => Boolean(hash))
      ),
    ],
    [sameGroupRows]
  );

  /** We need the actions to display the correct status badges. */
  const { data: sameGroupEpisodeActionsMap } = useFetchEpisodeActions({
    episodeIds: sameGroupEpisodeIds,
    expressions,
  });

  const { data: sameGroupGroupActionsMap } = useFetchGroupActions({
    groupHashes: sameGroupGroupHashes,
    expressions,
  });

  return (
    <div
      data-test-subj="alertingV2RelatedEpisodesGroupSubsection"
      css={css`
        padding-inline: ${euiTheme.size.m};
      `}
    >
      <EuiTitle size="xs">
        <h4>{i18n.RELATED_SAME_GROUP_TITLE}</h4>
      </EuiTitle>
      <EuiText size="s" color="subdued" css={{ marginBlockStart: euiTheme.size.xs }}>
        {i18n.RELATED_SAME_GROUP_DESCRIPTION}
      </EuiText>
      <EuiSpacer size="s" />
      {isLoadingSameGroupRows ? (
        <EuiFlexGroup
          justifyContent="center"
          data-test-subj="alertingV2RelatedEpisodesGroupLoading"
        >
          <EuiFlexItem grow={false}>
            <EuiLoadingSpinner size="l" />
          </EuiFlexItem>
        </EuiFlexGroup>
      ) : sameGroupRows.length === 0 ? (
        <EuiPanel
          color="subdued"
          hasShadow={false}
          paddingSize="m"
          data-test-subj="alertingV2RelatedEpisodesGroupEmpty"
        >
          <EuiText size="s" color="subdued" textAlign="center">
            {i18n.RELATED_SAME_GROUP_EMPTY}
          </EuiText>
        </EuiPanel>
      ) : (
        <RelatedAlertEpisodesList
          rows={sameGroupRows}
          rule={rule}
          getEpisodeAction={(id) => sameGroupEpisodeActionsMap?.get(id)}
          getGroupAction={(gh) => sameGroupGroupActionsMap?.get(gh)}
        />
      )}
    </div>
  );
}
