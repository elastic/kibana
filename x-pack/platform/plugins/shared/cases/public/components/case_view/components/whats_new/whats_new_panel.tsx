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
  EuiPanel,
  EuiSpacer,
  EuiStat,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { FormattedRelative } from '@kbn/i18n-react';
import { useCaseViewedMarker } from './use_case_viewed_marker';
import { useGetCaseDelta } from './use_get_case_delta';
import * as i18n from './translations';

interface WhatsNewPanelProps {
  caseId: string;
}

const WhatsNewPanelComponent: React.FC<WhatsNewPanelProps> = ({ caseId }) => {
  const { since, isDismissed, markSeen } = useCaseViewedMarker(caseId);
  const { data } = useGetCaseDelta(caseId, since);

  if (since == null || isDismissed || data == null) {
    return null;
  }

  const { alerts, comments, changes, evidence } = data.counts;
  if (alerts + comments + changes + evidence === 0) {
    return null;
  }

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
            <FormattedRelative value={new Date(since)} />
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty size="s" onClick={markSeen} data-test-subj="case-view-whats-new-dismiss">
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
    </EuiPanel>
  );
};
WhatsNewPanelComponent.displayName = 'WhatsNewPanel';

export const WhatsNewPanel = React.memo(WhatsNewPanelComponent);
