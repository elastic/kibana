/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { SFC } from 'react';

import { EuiTabbedContent } from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { DataFrameTransformListRow } from './common';
import { ExpandedRowDetailsPane, SectionConfig } from './expanded_row_details_pane';
import { ExpandedRowJsonPane } from './expanded_row_json_pane';
import { ExpandedRowMessagesPane } from './expanded_row_messages_pane';
import { ExpandedRowPreviewPane } from './expanded_row_preview_pane';

function getItemDescription(value: any) {
  if (typeof value === 'object') {
    return JSON.stringify(value);
  }

  return value.toString();
}

interface Props {
  item: DataFrameTransformListRow;
}

export const ExpandedRow: SFC<Props> = ({ item }) => {
  const state: SectionConfig = {
    title: 'State',
    items: Object.entries(item.state).map(s => {
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
    items: Object.entries(item.stats).map(s => {
      return { title: s[0].toString(), description: getItemDescription(s[1]) };
    }),
    position: 'right',
  };

  const tabs = [
    {
      id: 'transform-details',
      name: i18n.translate(
        'xpack.ml.dataframe.transformList.transformDetails.tabs.transformSettingsLabel',
        {
          defaultMessage: 'Transform details',
        }
      ),
      content: <ExpandedRowDetailsPane sections={[state, checkpointing, stats]} />,
    },
    {
      id: 'transform-json',
      name: 'JSON',
      content: <ExpandedRowJsonPane json={item.config} />,
    },
    {
      id: 'transform-messages',
      name: i18n.translate(
        'xpack.ml.dataframe.transformList.transformDetails.tabs.transformMessagesLabel',
        {
          defaultMessage: 'Messages',
        }
      ),
      content: <ExpandedRowMessagesPane transformId={item.id} />,
    },
    {
      id: 'transform-preview',
      name: i18n.translate(
        'xpack.ml.dataframe.transformList.transformDetails.tabs.transformPreviewLabel',
        {
          defaultMessage: 'Preview',
        }
      ),
      content: <ExpandedRowPreviewPane transformConfig={item.config} />,
    },
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
