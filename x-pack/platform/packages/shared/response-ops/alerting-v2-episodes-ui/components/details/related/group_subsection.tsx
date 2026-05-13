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
import type { CoreStart } from '@kbn/core/public';
import type { ExpressionsStart } from '@kbn/expressions-plugin/public';
import type { RuleResponse } from '@kbn/alerting-v2-schemas';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { css } from '@emotion/react';
import { RELATED_ALERT_EPISODES_PAGE_SIZE } from '../../../constants';
import { useFetchEpisodeActions } from '../../../hooks/use_fetch_episode_actions';
import { useFetchGroupActions } from '../../../hooks/use_fetch_group_actions';
import { useFetchSameGroupEpisodesQuery } from '../../../hooks/use_fetch_same_group_episodes_query';
import { RelatedAlertEpisodesList } from './related_list';
import * as i18n from './translations';

interface RelatedEpisodesGroupSubsectionServices {
  notifications: CoreStart['notifications'];
  expressions: ExpressionsStart;
}

export interface RelatedEpisodesGroupSubsectionProps {
  currentEpisodeId: string | undefined;
  groupHash: string | undefined;
  rule: RuleResponse;
  ruleId: string | undefined;
  getEpisodeDetailsHref: (episodeId: string) => string;
  /**
   * When `true`, drop the inner horizontal padding so the subsection sits
   * flush with its consumer's edges. Useful when rendering inside a container
   * that already provides outer padding (e.g. a narrow flyout body).
   */
  flush?: boolean;
}

/**
 * Related episodes that share the same rule id and group_hash
 */
export function RelatedEpisodesGroupSubsection({
  currentEpisodeId,
  groupHash,
  rule,
  ruleId,
  getEpisodeDetailsHref,
  flush = false,
}: RelatedEpisodesGroupSubsectionProps) {
  const { euiTheme } = useEuiTheme();
  const {
    services: { notifications, expressions },
  } = useKibana<RelatedEpisodesGroupSubsectionServices>();
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
      css={
        flush
          ? undefined
          : css`
              padding-inline: ${euiTheme.size.m};
            `
      }
    >
      <EuiTitle size={flush ? 'xxs' : 'xs'}>
        <h4>{i18n.RELATED_SAME_GROUP_TITLE}</h4>
      </EuiTitle>
      <EuiText
        size={flush ? 'xs' : 's'}
        color="subdued"
        css={{ marginBlockStart: euiTheme.size.xs }}
      >
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
          getEpisodeDetailsHref={getEpisodeDetailsHref}
          compact={flush}
        />
      )}
    </div>
  );
}
