/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLink,
  EuiPanel,
  EuiSpacer,
  EuiStat,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { FormattedRelative } from '@kbn/i18n-react';
import { CASE_VIEW_PAGE_TABS } from '../../../../../common/types';
import { useCaseViewParams } from '../../../../common/navigation';
import { buildHighlights } from './build_highlights';
import { useJumpToNewActivity } from './jump_to_new_activity_context';
import { useGetCaseDelta } from './use_get_case_delta';
import { useMarkCaseSeen } from './use_mark_case_seen';
import * as i18n from './translations';

interface WhatsNewPanelProps {
  caseId: string;
}

const WhatsNewPanelComponent: React.FC<WhatsNewPanelProps> = ({ caseId }) => {
  const { data } = useGetCaseDelta(caseId);
  const { mutate: markSeen } = useMarkCaseSeen(caseId);
  const jumpToNewActivity = useJumpToNewActivity();
  const { tabId } = useCaseViewParams();
  const isActivityTab = tabId == null || tabId === CASE_VIEW_PAGE_TABS.ACTIVITY;

  if (data == null || data.since == null) {
    return null;
  }

  const { alerts, comments, changes, evidence } = data.counts;
  const total = alerts + comments + changes + evidence;
  if (total === 0) {
    return null;
  }

  const highlights = buildHighlights(data.items);

  const stats = [
    { title: alerts, description: i18n.ALERTS, testSubj: 'alerts' },
    { title: comments, description: i18n.COMMENTS, testSubj: 'comments' },
    { title: changes, description: i18n.CHANGES, testSubj: 'changes' },
    { title: evidence, description: i18n.EVIDENCE, testSubj: 'evidence' },
  ];

  return (
    <EuiPanel color="primary" hasShadow={false} data-test-subj="case-view-whats-new">
      <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" responsive={false}>
        <EuiFlexItem>
          <EuiTitle size="xs">
            <h3>{i18n.WHATS_NEW_TITLE}</h3>
          </EuiTitle>
          <EuiText size="xs" color="subdued">
            {i18n.NEW_ITEMS(total)}
            {' · '}
            <FormattedRelative value={new Date(data.since)} />
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            size="s"
            onClick={() => markSeen()}
            data-test-subj="case-view-whats-new-dismiss"
          >
            {i18n.MARK_AS_SEEN}
          </EuiButtonEmpty>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="s" />
      <EuiFlexGroup gutterSize="l" responsive={false} wrap>
        {stats.map(({ title, description, testSubj }) => (
          <EuiFlexItem key={testSubj} grow={false}>
            <EuiStat
              titleSize="m"
              title={title}
              description={description}
              data-test-subj={`case-view-whats-new-${testSubj}`}
            />
          </EuiFlexItem>
        ))}
      </EuiFlexGroup>
      {highlights.length > 0 && (
        <>
          <EuiSpacer size="m" />
          <EuiFlexGroup
            direction="column"
            gutterSize="xs"
            data-test-subj="case-view-whats-new-highlights"
          >
            {highlights.map(({ key, icon, text }) => (
              <EuiFlexItem key={key} data-test-subj={`case-view-whats-new-highlight-${key}`}>
                <EuiText size="s">
                  <EuiIcon type={icon} size="s" aria-hidden={true} /> {text}
                </EuiText>
              </EuiFlexItem>
            ))}
          </EuiFlexGroup>
        </>
      )}
      {isActivityTab && (
        <>
          <EuiSpacer size="s" />
          <EuiLink onClick={jumpToNewActivity} data-test-subj="case-view-whats-new-jump">
            {i18n.JUMP_TO_FIRST_CHANGE}
          </EuiLink>
        </>
      )}
    </EuiPanel>
  );
};
WhatsNewPanelComponent.displayName = 'WhatsNewPanel';

export const WhatsNewPanel = React.memo(WhatsNewPanelComponent);
