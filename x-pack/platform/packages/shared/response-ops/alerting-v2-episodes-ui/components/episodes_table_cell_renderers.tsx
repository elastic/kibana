/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/react';
import {
  EuiCode,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSkeletonText,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import type { HttpStart } from '@kbn/core-http-browser';
import type { ExpressionsStart } from '@kbn/expressions-plugin/public';
import type { CustomCellRenderer } from '@kbn/unified-data-table';
import type { FindRulesResponse } from '@kbn/alerting-v2-schemas';
import type { AlertEpisodeStatus } from '@kbn/alerting-v2-schemas';
import type { EpisodeActionState } from '../types/action';
import type { AlertEpisodeGroupAction } from '../types/action';
import { AlertEpisodeStatusBadges } from './status/status_badges';
import { AlertEpisodeActions } from './actions/actions';
import { AlertEpisodeTags } from './actions/tags';

type Rule = FindRulesResponse['items'][number];
type CellRendererProps = Parameters<CustomCellRenderer[string]>[0];

export interface EpisodeStatusCellProps extends CellRendererProps {
  episodeActionsMap: Map<string, EpisodeActionState> | undefined;
  groupActionsMap: Map<string, AlertEpisodeGroupAction> | undefined;
}

export const EpisodeStatusCell = ({
  row,
  columnId,
  episodeActionsMap,
  groupActionsMap,
}: EpisodeStatusCellProps) => {
  const status = row.flattened[columnId] as AlertEpisodeStatus;
  const episodeId = row.flattened['episode.id'] as string;
  const groupHash = row.flattened.group_hash as string;

  return (
    <AlertEpisodeStatusBadges
      status={status}
      episodeAction={episodeActionsMap?.get(episodeId)}
      groupAction={groupActionsMap?.get(groupHash)}
    />
  );
};

export interface EpisodeActionsCellProps extends CellRendererProps {
  episodeActionsMap: Map<string, EpisodeActionState> | undefined;
  groupActionsMap: Map<string, AlertEpisodeGroupAction> | undefined;
  discoverHref: string | undefined;
  viewDetailsHref: string | undefined;
  http: HttpStart;
  expressions: ExpressionsStart;
}

export const EpisodeActionsCell = ({
  row,
  episodeActionsMap,
  groupActionsMap,
  discoverHref,
  viewDetailsHref,
  http,
  expressions,
}: EpisodeActionsCellProps) => {
  const episodeId = row.flattened['episode.id'] as string;
  const groupHash = row.flattened.group_hash as string;

  return (
    <AlertEpisodeActions
      episodeId={episodeId}
      groupHash={groupHash}
      episodeAction={episodeActionsMap?.get(episodeId)}
      groupAction={groupActionsMap?.get(groupHash)}
      http={http}
      openInDiscoverHref={discoverHref}
      expressions={expressions}
      viewDetailsHref={viewDetailsHref}
    />
  );
};

export interface EpisodeTagsCellProps extends CellRendererProps {
  groupActionsMap: Map<string, AlertEpisodeGroupAction> | undefined;
}

export const EpisodeTagsCell = ({ row, groupActionsMap }: EpisodeTagsCellProps) => {
  const groupHash = row.flattened.group_hash as string;
  const groupAction = groupActionsMap?.get(groupHash);

  return <AlertEpisodeTags tags={groupAction?.tags ?? []} />;
};

export interface EpisodeRuleCellProps extends CellRendererProps {
  rulesCache: Record<string, Rule>;
  isLoadingRules: boolean;
  rowHeight: number;
}

export const EpisodeRuleCell = ({
  row,
  columnId,
  rulesCache,
  isLoadingRules,
  rowHeight,
}: EpisodeRuleCellProps) => {
  const { euiTheme } = useEuiTheme();

  if (!Object.keys(rulesCache).length && isLoadingRules) {
    return <EuiSkeletonText />;
  }
  const ruleId = row.flattened[columnId] as string;
  const rule = rulesCache[ruleId];
  if (!rule) {
    return <>{ruleId}</>;
  }
  const ruleName = (
    <EuiText
      size="s"
      css={css`
        font-weight: ${euiTheme.font.weight.semiBold};
      `}
    >
      {rule.metadata.name}
    </EuiText>
  );
  if (rowHeight === 1) {
    return ruleName;
  }
  return (
    <EuiFlexGroup direction="column" gutterSize="none">
      <EuiFlexItem>{ruleName}</EuiFlexItem>
      <EuiFlexItem>
        <EuiCode
          color="subdued"
          css={css`
            background: none;
            color: ${euiTheme.colors.mediumShade};
            font-size: ${euiTheme.font.scale.xs};
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            padding: 0;
          `}
        >
          {rule.evaluation.query.base}
        </EuiCode>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
