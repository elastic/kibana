/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { SFC } from 'react';

import { EuiTabbedContent } from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { formatHumanReadableDateTimeSeconds } from '../../../../../../common/utils/date_utils';

import { TransformListRow } from '../../../../common';
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

interface Item {
  title: string;
  description: any;
}

interface Props {
  item: TransformListRow;
}

export const ExpandedRow: SFC<Props> = ({ item }) => {
  const stateValues = { ...item.stats };
  delete stateValues.stats;
  delete stateValues.checkpointing;

  const stateItems: Item[] = [];
  stateItems.push(
    {
      title: 'id',
      description: item.id,
    },
    {
      title: 'state',
      description: item.stats.state,
    }
  );
  if (item.stats.node !== undefined) {
    stateItems.push({
      title: 'node.name',
      description: item.stats.node.name,
    });
  }

  const state: SectionConfig = {
    title: 'State',
    items: stateItems,
    position: 'left',
  };

  const checkpointingItems: Item[] = [];
  if (item.stats.checkpointing.last !== undefined) {
    checkpointingItems.push({
      title: 'last.checkpoint',
      description: item.stats.checkpointing.last.checkpoint,
    });
    if (item.stats.checkpointing.last.timestamp_millis !== undefined) {
      checkpointingItems.push({
        title: 'last.timestamp',
        description: formatHumanReadableDateTimeSeconds(
          item.stats.checkpointing.last.timestamp_millis
        ),
      });
      checkpointingItems.push({
        title: 'last.timestamp_millis',
        description: item.stats.checkpointing.last.timestamp_millis,
      });
    }
  }

  if (item.stats.checkpointing.next !== undefined) {
    checkpointingItems.push({
      title: 'next.checkpoint',
      description: item.stats.checkpointing.next.checkpoint,
    });
    if (item.stats.checkpointing.next.checkpoint_progress !== undefined) {
      checkpointingItems.push({
        title: 'next.checkpoint_progress.total_docs',
        description: item.stats.checkpointing.next.checkpoint_progress.total_docs,
      });
      checkpointingItems.push({
        title: 'next.checkpoint_progress.docs_remaining',
        description: item.stats.checkpointing.next.checkpoint_progress.docs_remaining,
      });
      checkpointingItems.push({
        title: 'next.checkpoint_progress.percent_complete',
        description: item.stats.checkpointing.next.checkpoint_progress.percent_complete,
      });
    }
  }

  const checkpointing: SectionConfig = {
    title: 'Checkpointing',
    items: checkpointingItems,
    position: 'left',
  };

  const stats: SectionConfig = {
    title: 'Stats',
    items: Object.entries(item.stats.stats).map(s => {
      return { title: s[0].toString(), description: getItemDescription(s[1]) };
    }),
    position: 'right',
  };

  const tabs = [
    {
      id: 'transform-details',
      name: i18n.translate(
        'xpack.transform.transformList.transformDetails.tabs.transformSettingsLabel',
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
        'xpack.transform.transformList.transformDetails.tabs.transformMessagesLabel',
        {
          defaultMessage: 'Messages',
        }
      ),
      content: <ExpandedRowMessagesPane transformId={item.id} />,
    },
    {
      id: 'transform-preview',
      name: i18n.translate(
        'xpack.transform.transformList.transformDetails.tabs.transformPreviewLabel',
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
