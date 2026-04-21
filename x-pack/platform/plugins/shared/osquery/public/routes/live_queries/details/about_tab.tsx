/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiCodeBlock,
  EuiHorizontalRule,
  EuiSpacer,
  EuiPanel,
  EuiTitle,
  EuiBadge,
  EuiBadgeGroup,
  EuiButtonIcon,
  EuiText,
  formatDate,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import moment from 'moment-timezone';

import type { LiveQueryDetailsItem } from '../../../actions/use_live_query_details';
import { AboutCard } from './about_card';
import type { AboutCardItem } from './about_card';
import type { AgentsColumnResultsProps } from '../../../live_queries/form/pack_queries_status_table';
import { RunByColumn } from '../../../actions/components/run_by_column';
import { useGenericBulkGetUserProfiles } from '../../../common/use_bulk_get_user_profiles';

const QUERY_CARD_TITLE = i18n.translate('xpack.osquery.aboutTab.queryCardTitle', {
  defaultMessage: 'Query',
});

const ABOUT_CARD_TITLE = i18n.translate('xpack.osquery.aboutTab.aboutCardTitle', {
  defaultMessage: 'About',
});

const SCHEDULE_CARD_TITLE = i18n.translate('xpack.osquery.aboutTab.scheduleCardTitle', {
  defaultMessage: 'Schedule',
});

const TAGS_CARD_TITLE = i18n.translate('xpack.osquery.aboutTab.tagsCardTitle', {
  defaultMessage: 'Tags',
});

const ROWS_LABEL = i18n.translate('xpack.osquery.aboutTab.rowsLabel', {
  defaultMessage: 'Rows',
});

const AGENTS_LABEL = i18n.translate('xpack.osquery.aboutTab.agentsLabel', {
  defaultMessage: 'Agents',
});

const CREATED_AT_LABEL = i18n.translate('xpack.osquery.aboutTab.createdAtLabel', {
  defaultMessage: 'Created at',
});

const RUN_AT_LABEL = i18n.translate('xpack.osquery.aboutTab.runAtLabel', {
  defaultMessage: 'Run at',
});

const RUN_BY_LABEL = i18n.translate('xpack.osquery.aboutTab.runByLabel', {
  defaultMessage: 'Run by',
});

const REOCCURRENCE_LABEL = i18n.translate('xpack.osquery.aboutTab.reoccurrenceLabel', {
  defaultMessage: 'Reoccurrence',
});

const INTERVAL_LABEL = i18n.translate('xpack.osquery.aboutTab.intervalLabel', {
  defaultMessage: 'Interval',
});

const INTERVALS_LABEL = i18n.translate('xpack.osquery.aboutTab.intervalsLabel', {
  defaultMessage: 'Intervals',
});

const DASH = '\u2014';

const aboutTabContentCss = { padding: 16 };
const agentBadgeCss = { padding: '0 8px' };
const tagsHeaderCss = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
};

const AgentsBadges: React.FC<AgentsColumnResultsProps> = ({ successful, pending, failed }) => (
  <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false} wrap={false}>
    <EuiFlexItem grow={false}>
      <EuiBadge color="success" css={agentBadgeCss}>
        {successful}
      </EuiBadge>
    </EuiFlexItem>
    <EuiFlexItem grow={false}>
      <EuiBadge color="default" css={agentBadgeCss}>
        {pending}
      </EuiBadge>
    </EuiFlexItem>
    <EuiFlexItem grow={false}>
      <EuiBadge color="danger" css={agentBadgeCss}>
        {failed}
      </EuiBadge>
    </EuiFlexItem>
  </EuiFlexGroup>
);

export interface QueryItemAgents {
  successful?: number;
  pending?: number;
  failed?: number;
  docs?: number;
  interval?: number | string;
  id?: string;
  query?: string;
}

interface AboutTabProps {
  data: LiveQueryDetailsItem;
  queryItemAgents?: QueryItemAgents;
  isScheduled?: boolean;
  executionCount?: number;
  onEditTags?: () => void;
}

const AboutTabComponent: React.FC<AboutTabProps> = ({
  data,
  queryItemAgents,
  isScheduled,
  executionCount,
  onEditTags,
}) => {
  const queryText = queryItemAgents?.query ?? data.queries?.[0]?.query ?? '';
  const queryId = queryItemAgents?.id ?? data.queries?.[0]?.id;
  const interval = queryItemAgents?.interval ?? data.queries?.[0]?.interval;

  const showScheduleCard = !!isScheduled;

  const userProfileUids = useMemo(
    () => (data.user_profile_uid ? [data.user_profile_uid] : []),
    [data.user_profile_uid]
  );
  const { profilesMap, isLoading: isLoadingProfiles } =
    useGenericBulkGetUserProfiles(userProfileUids);

  const aboutItems = useMemo(() => {
    const items: AboutCardItem[] = [];

    if (queryItemAgents) {
      items.push({
        title: ROWS_LABEL,
        description: <EuiText size="s">{queryItemAgents.docs ?? 0}</EuiText>,
      });

      items.push({
        title: AGENTS_LABEL,
        description: (
          <AgentsBadges
            successful={queryItemAgents.successful ?? 0}
            pending={queryItemAgents.pending ?? 0}
            failed={queryItemAgents.failed ?? 0}
          />
        ),
      });
    }

    if (showScheduleCard && executionCount != null) {
      items.push({
        title: i18n.translate('xpack.osquery.aboutTab.executionCountLabel', {
          defaultMessage: 'Execution count',
        }),
        description: <EuiText size="s">{executionCount}</EuiText>,
      });
    }

    items.push({
      title: CREATED_AT_LABEL,
      description: (
        <EuiText size="s">{data['@timestamp'] ? formatDate(data['@timestamp']) : DASH}</EuiText>
      ),
    });

    items.push({
      title: RUN_AT_LABEL,
      description: (
        <EuiText size="s">{data['@timestamp'] ? formatDate(data['@timestamp']) : DASH}</EuiText>
      ),
    });

    items.push({
      title: RUN_BY_LABEL,
      description: (
        <RunByColumn
          userId={data.user_id}
          userProfileUid={data.user_profile_uid}
          profilesMap={profilesMap}
          isLoadingProfiles={isLoadingProfiles}
        />
      ),
    });

    return items;
  }, [data, queryItemAgents, profilesMap, isLoadingProfiles, showScheduleCard, executionCount]);

  const formattedInterval = useMemo(() => {
    if (!interval) return DASH;
    const dur = moment.duration(Number(interval), 'seconds');
    const d = Math.floor(dur.asDays());
    const h = dur.hours();
    const m = dur.minutes();
    const s = dur.seconds();
    const parts = [d ? `${d}d` : '', h ? `${h}h` : '', m ? `${m}m` : '', s ? `${s}s` : ''].filter(
      Boolean
    );

    return parts.length ? parts.join(' ') : '0s';
  }, [interval]);

  const scheduleItems = useMemo(() => {
    const items: AboutCardItem[] = [
      {
        title: REOCCURRENCE_LABEL,
        description: <EuiText size="s">{INTERVAL_LABEL}</EuiText>,
      },
      {
        title: INTERVALS_LABEL,
        description: <EuiText size="s">{formattedInterval}</EuiText>,
      },
    ];

    return items;
  }, [formattedInterval]);

  const tagsEditButton = useMemo(
    () =>
      onEditTags ? (
        <EuiButtonIcon
          iconType="pencil"
          onClick={onEditTags}
          aria-label={i18n.translate('xpack.osquery.aboutTab.editTagsAriaLabel', {
            defaultMessage: 'Edit tags',
          })}
          size="xs"
          color="primary"
          data-test-subj="osquery-about-tab-edit-tags"
        />
      ) : null,
    [onEditTags]
  );

  return (
    <EuiFlexGroup
      gutterSize="l"
      data-test-subj="osquery-about-tab-content"
      css={aboutTabContentCss}
    >
      <EuiFlexItem>
        <EuiPanel hasBorder data-test-subj="osquery-about-tab-query-card">
          <EuiTitle size="xs">
            <h3>{QUERY_CARD_TITLE}</h3>
          </EuiTitle>
          <EuiHorizontalRule margin="s" />
          {queryId && (
            <>
              <EuiTitle size="xxxs">
                <h4>{'ID'}</h4>
              </EuiTitle>
              <EuiSpacer size="s" />
              <EuiCodeBlock isCopyable paddingSize="m" data-test-subj="osquery-about-tab-query-id">
                {queryId}
              </EuiCodeBlock>
            </>
          )}
          <EuiSpacer size="m" />
          <EuiTitle size="xxxs">
            <h4>{QUERY_CARD_TITLE}</h4>
          </EuiTitle>
          <EuiSpacer size="s" />
          <EuiCodeBlock
            language="sql"
            isCopyable
            overflowHeight={400}
            lineNumbers
            data-test-subj="osquery-about-tab-query-code"
          >
            {queryText}
          </EuiCodeBlock>
        </EuiPanel>
      </EuiFlexItem>

      <EuiFlexItem>
        <EuiFlexGroup direction="column" gutterSize="l">
          <EuiFlexItem grow={false}>
            <AboutCard
              title={ABOUT_CARD_TITLE}
              items={aboutItems}
              data-test-subj="osquery-about-tab-about-card"
            />
          </EuiFlexItem>

          {showScheduleCard && (
            <EuiFlexItem grow={false}>
              <AboutCard
                title={SCHEDULE_CARD_TITLE}
                items={scheduleItems}
                data-test-subj="osquery-about-tab-schedule-card"
              />
            </EuiFlexItem>
          )}

          {!isScheduled && (
            <EuiFlexItem grow={false}>
              <EuiPanel hasBorder data-test-subj="osquery-about-tab-tags-card">
                <div css={tagsHeaderCss}>
                  <EuiTitle size="xs">
                    <h3>{TAGS_CARD_TITLE}</h3>
                  </EuiTitle>
                  {tagsEditButton}
                </div>
                <EuiHorizontalRule margin="s" />
                {data.tags && data.tags.length > 0 ? (
                  <EuiBadgeGroup>
                    {data.tags.map((tag) => (
                      <EuiBadge key={tag} color="hollow">
                        {tag}
                      </EuiBadge>
                    ))}
                  </EuiBadgeGroup>
                ) : (
                  <EuiText size="s" color="subdued">
                    {i18n.translate('xpack.osquery.aboutTab.noTagsLabel', {
                      defaultMessage: 'No tags added',
                    })}
                  </EuiText>
                )}
              </EuiPanel>
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

export const AboutTab = React.memo(AboutTabComponent);
