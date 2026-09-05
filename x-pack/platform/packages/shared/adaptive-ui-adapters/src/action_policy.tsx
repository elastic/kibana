/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { ViewSpec } from '@kbn/adaptive-ui';
import {
  Badge,
  BadgeGroup,
  DescriptionList,
  DescriptionListItem,
  Text,
  View,
  toViewSpec,
} from '@kbn/adaptive-ui/jsx';

/**
 * Mirror of `ActionPolicyAttachmentData` from
 * `@kbn/response-ops-alerting-v2-schemas` (`action_policy_attachment_schema.ts`).
 */
export interface ActionPolicyData {
  name?: string;
  description?: string;
  destinations?: unknown[];
  matcher?: string;
  group_by?: string[];
  grouping_mode?: string;
  throttle?: string;
  tags?: string[];
  enabled?: boolean;
}

/**
 * Alternate rendering for the `platform.alerting.action_policy` attachment ([action_policy_attachment_definition.tsx](../../../../plugins/shared/alerting_v2/public/agent_builder/attachments/action_policy_attachment_definition.tsx)):
 * status/throttle/grouping badges, a matcher/grouping/destination summary, the
 * description, and a tag badge row.
 */
export const toActionPolicyViewSpec = ({
  name,
  description,
  destinations,
  matcher,
  group_by: groupBy,
  grouping_mode: groupingMode,
  throttle,
  tags,
  enabled,
}: ActionPolicyData): ViewSpec => {
  return toViewSpec(
    <View title={name ?? 'Action policy'} subtitle="Action policy">
      <BadgeGroup>
        <Badge
          label={enabled === false ? 'Disabled' : 'Enabled'}
          tone={enabled === false ? 'neutral' : 'success'}
          variant="fill"
        />
        {throttle && <Badge label={`Throttle ${throttle}`} tone="primary" variant="hollow" />}
        {groupingMode && <Badge label={groupingMode} tone="neutral" variant="hollow" />}
      </BadgeGroup>
      <DescriptionList label="Policy" layout="inline">
        {matcher && <DescriptionListItem title="Matcher" description={matcher} />}
        {groupBy && groupBy.length > 0 && (
          <DescriptionListItem title="Group by" description={groupBy.join(', ')} />
        )}
        <DescriptionListItem title="Destinations" description={String(destinations?.length ?? 0)} />
      </DescriptionList>
      {description && <Text body={description} />}
      {tags && tags.length > 0 && (
        <BadgeGroup label="Tags">
          {tags.map((label) => (
            <Badge key={label} label={label} />
          ))}
        </BadgeGroup>
      )}
    </View>
  );
};

export const sampleActionPolicy: ActionPolicyData = {
  name: 'Page on-call for critical checkout alerts',
  description:
    'Routes critical checkout alerts to PagerDuty and the #checkout-oncall Slack channel.',
  matcher: 'kibana.alert.severity: critical AND service.name: checkout',
  group_by: ['service.name', 'host.name'],
  grouping_mode: 'per group',
  throttle: '10m',
  destinations: [{ type: 'pagerduty' }, { type: 'slack' }],
  tags: ['checkout', 'oncall'],
  enabled: true,
};
