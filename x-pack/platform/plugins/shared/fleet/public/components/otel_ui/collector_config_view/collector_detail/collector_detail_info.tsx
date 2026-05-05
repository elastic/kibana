/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiDescriptionList, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedDate, FormattedRelative } from '@kbn/i18n-react';

import type { Agent } from '../../../../../common/types';

interface CollectorDetailInfoProps {
  agent: Agent;
}

const FormattedTimestampOrDash: React.FC<{ value?: string }> = ({ value }) => {
  if (!value) return <>-</>;
  const date = new Date(value);
  return (
    <EuiToolTip
      content={
        <FormattedDate
          value={date}
          year="numeric"
          month="short"
          day="2-digit"
          hour="numeric"
          minute="numeric"
          timeZoneName="short"
        />
      }
    >
      <span tabIndex={0}>
        <FormattedRelative value={date} />
      </span>
    </EuiToolTip>
  );
};

export const CollectorDetailInfo: React.FC<CollectorDetailInfoProps> = ({ agent }) => {
  const host = agent.local_metadata?.host;
  const identifying = agent.identifying_attributes;
  const nonIdentifying = agent.non_identifying_attributes;

  const listItems = useMemo(
    () =>
      [
        {
          title: i18n.translate('xpack.fleet.otelUi.collectorDetail.info.displayName', {
            defaultMessage: 'Display name',
          }),
          description: nonIdentifying?.['elastic.display.name'] ?? '-',
        },
        {
          title: i18n.translate('xpack.fleet.otelUi.collectorDetail.info.status', {
            defaultMessage: 'Status',
          }),
          description: agent.status ?? '-',
        },
        {
          title: i18n.translate('xpack.fleet.otelUi.collectorDetail.info.lastActivity', {
            defaultMessage: 'Last activity',
          }),
          description: <FormattedTimestampOrDash value={agent.last_checkin} />,
        },
        {
          title: i18n.translate('xpack.fleet.otelUi.collectorDetail.info.agentId', {
            defaultMessage: 'Agent ID',
          }),
          description: agent.id,
        },
        {
          title: i18n.translate('xpack.fleet.otelUi.collectorDetail.info.serviceName', {
            defaultMessage: 'Service name',
          }),
          description: identifying?.['service.name'] ?? '-',
        },
        {
          title: i18n.translate('xpack.fleet.otelUi.collectorDetail.info.serviceVersion', {
            defaultMessage: 'Service version',
          }),
          description: identifying?.['service.version'] ?? '-',
        },
        {
          title: i18n.translate('xpack.fleet.otelUi.collectorDetail.info.hostName', {
            defaultMessage: 'Host name',
          }),
          description:
            (typeof host === 'object' ? host?.hostname : undefined) ??
            nonIdentifying?.['host.name'] ??
            '-',
        },
        {
          title: i18n.translate('xpack.fleet.otelUi.collectorDetail.info.hostArch', {
            defaultMessage: 'Host architecture',
          }),
          description: nonIdentifying?.['host.arch'] ?? '-',
        },
        {
          title: i18n.translate('xpack.fleet.otelUi.collectorDetail.info.os', {
            defaultMessage: 'OS',
          }),
          description: nonIdentifying?.['os.type'] ?? '-',
        },
        {
          title: i18n.translate('xpack.fleet.otelUi.collectorDetail.info.collectorGroup', {
            defaultMessage: 'Collector group',
          }),
          description: nonIdentifying?.['elastic.collector.group'] ?? '-',
        },
        {
          title: i18n.translate('xpack.fleet.otelUi.collectorDetail.info.enrolled', {
            defaultMessage: 'Enrolled',
          }),
          description: <FormattedTimestampOrDash value={agent.enrolled_at} />,
        },
        {
          title: i18n.translate('xpack.fleet.otelUi.collectorDetail.info.capabilities', {
            defaultMessage: 'Capabilities',
          }),
          description: agent.capabilities?.join(', ') || '-',
        },
      ].map((item) => ({
        ...item,
        description: String(item.description) === '' ? '-' : item.description,
      })),
    [agent, host, identifying, nonIdentifying]
  );

  return (
    <EuiDescriptionList
      compressed
      type="column"
      data-test-subj="collectorDetailInfo"
      listItems={listItems}
    />
  );
};
