/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC } from 'react';
import moment from 'moment-timezone';

import { EuiTabbedContent } from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { formatHumanReadableDateTimeSeconds } from '../../../../../util/date_utils';

import { DataFrameAnalyticsListRow } from './common';
import { ExpandedRowDetailsPane, SectionConfig } from './expanded_row_details_pane';
import { ExpandedRowJsonPane } from './expanded_row_json_pane';
// import { ExpandedRowMessagesPane } from './expanded_row_messages_pane';

function getItemDescription(value: any) {
  if (typeof value === 'object') {
    return JSON.stringify(value);
  }

  return value.toString();
}

interface Props {
  item: DataFrameAnalyticsListRow;
}

export const ExpandedRow: FC<Props> = ({ item }) => {
  const stateValues = { ...item.stats };

  const state: SectionConfig = {
    title: 'State',
    items: Object.entries(stateValues).map(s => {
      return { title: s[0].toString(), description: getItemDescription(s[1]) };
    }),
    position: 'left',
  };

  const checkpointing: SectionConfig = {
    title: 'Checkpointing',
    items: Object.entries(item.checkpointing).map(s => {
      return { title: s[0].toString(), description: getItemDescription(s[1]) };
    }),
    position: 'left',
  };

  const stats: SectionConfig = {
    title: 'Stats',
    items: [
      {
        title: 'create_time',
        description: formatHumanReadableDateTimeSeconds(
          moment(item.config.create_time).unix() * 1000
        ),
      },
      { title: 'model_memory_limit', description: item.config.model_memory_limit },
      { title: 'version', description: item.config.version },
    ],
    position: 'right',
  };

  const tabs = [
    {
      id: 'analytics-details',
      name: i18n.translate(
        'xpack.ml.dataframe.analyticsList.analyticsDetails.tabs.analyticsSettingsLabel',
        {
          defaultMessage: 'Analytics details',
        }
      ),
      content: <ExpandedRowDetailsPane sections={[state, checkpointing, stats]} />,
    },
    {
      id: 'analytics-json',
      name: 'JSON',
      content: <ExpandedRowJsonPane json={item.config} />,
    },
    // Audit messages are not yet supported by the analytics API.
    /*
    {
      id: 'analytics-messages',
      name: i18n.translate(
        'xpack.ml.dataframe.analyticsList.analyticsDetails.tabs.analyticsMessagesLabel',
        {
          defaultMessage: 'Messages',
        }
      ),
      content: <ExpandedRowMessagesPane analyticsId={item.id} />,
    },
    */
  ];
  return (
    <EuiTabbedContent
      size="s"
      tabs={tabs}
      initialSelectedTab={tabs[0]}
      onTabClick={() => {}}
      expand={false}
    />
  );
};
