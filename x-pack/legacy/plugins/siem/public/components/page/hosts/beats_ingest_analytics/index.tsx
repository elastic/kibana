/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useState } from 'react';

import { EuiButtonEmpty, EuiFlexItem, EuiFlexGroup, EuiPopover, EuiText } from '@elastic/eui';
import { has } from 'lodash/fp';
import numeral from '@elastic/numeral';
import styled from 'styled-components';
import { BeatsIngestAnalyticsData } from '../../../../graphql/types';
import { getEmptyTagValue } from '../../../empty_value';
import * as i18n from './translations';

interface BeatsIngestAnalyticsProps {
  data: BeatsIngestAnalyticsData;
  loading: boolean;
}

const TooltipContent = styled.div`
  padding: 8px 0;
  border-bottom: 1px solid #d3dae6;
  &:last-child {
    border-bottom: 0;
  }
`;

export const BeatsIngestAnalytics = React.memo<BeatsIngestAnalyticsProps>(({ data, loading }) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const columns = [
    {
      description:
        has('auditbeat', data) && data.auditbeat !== null
          ? numeral(data.auditbeat).format('0,0')
          : getEmptyTagValue(),
      title: i18n.AUDITBEAT_EVENTS,
      id: 'auditbeat',
    },
    {
      description:
        has('filebeat', data) && data.filebeat !== null
          ? numeral(data.filebeat).format('0,0')
          : getEmptyTagValue(),
      title: i18n.FILEBEAT_EVENTS,
      id: 'filebeat',
    },
    {
      description:
        has('winlogbeat', data) && data.winlogbeat !== null
          ? numeral(data.winlogbeat).format('0,0')
          : getEmptyTagValue(),
      title: i18n.WINLOGBEAT_EVENTS,
      id: 'winlogbeat',
    },
  ];
  return loading ? null : (
    <EuiPopover
      id="beats-ingest-analytics"
      ownFocus
      button={
        <EuiButtonEmpty
          iconSide="right"
          iconType="arrowDown"
          onClick={() => setIsPopoverOpen(!isPopoverOpen)}
        >
          <EuiText size="s">{i18n.BEATS_INGEST_ANALYTICS}</EuiText>
        </EuiButtonEmpty>
      }
      isOpen={isPopoverOpen}
      closePopover={() => setIsPopoverOpen(false)}
      anchorPosition="upCenter"
      panelPaddingSize="m"
    >
      {data &&
        columns.map(column => (
          <TooltipContent key={`beats-ingest-analytics-${column.id}`}>
            <EuiText size="s">
              <EuiFlexGroup gutterSize="s" justifyContent="spaceBetween">
                <EuiFlexItem grow={1}>{column.title}</EuiFlexItem>
                <EuiFlexItem grow={false}>{column.description}</EuiFlexItem>
              </EuiFlexGroup>
            </EuiText>
          </TooltipContent>
        ))}
    </EuiPopover>
  );
});
