/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { EuiListGroup } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { ExpandPopoverListItem } from '../styles';
import { GraphPopover } from '../../..';
import {
  GRAPH_NODE_EXPAND_POPOVER_TEST_ID,
  GRAPH_NODE_POPOVER_SHOW_RELATED_ITEM_ID,
  GRAPH_NODE_POPOVER_SHOW_ACTIONS_BY_ITEM_ID,
  GRAPH_NODE_POPOVER_SHOW_ACTIONS_ON_ITEM_ID,
} from '../test_ids';

interface GraphNodeExpandPopoverProps {
  isOpen: boolean;
  anchorElement: HTMLElement | null;
  closePopover: () => void;
  onShowRelatedEntitiesClick: () => void;
  onShowActionsByEntityClick: () => void;
  onShowActionsOnEntityClick: () => void;
}

export const GraphNodeExpandPopover: React.FC<GraphNodeExpandPopoverProps> = memo(
  ({
    isOpen,
    anchorElement,
    closePopover,
    onShowRelatedEntitiesClick,
    onShowActionsByEntityClick,
    onShowActionsOnEntityClick,
  }) => {
    return (
      <GraphPopover
        panelPaddingSize="s"
        anchorPosition="rightCenter"
        isOpen={isOpen}
        anchorElement={anchorElement}
        closePopover={closePopover}
        data-test-subj={GRAPH_NODE_EXPAND_POPOVER_TEST_ID}
      >
        <EuiListGroup gutterSize="none" bordered={false} flush={true}>
          <ExpandPopoverListItem
            iconType="users"
            label={i18n.translate('xpack.csp.graph.graphNodeExpandPopover.showActionsByEntity', {
              defaultMessage: 'Show actions by this entity',
            })}
            onClick={onShowActionsByEntityClick}
            data-test-subj={GRAPH_NODE_POPOVER_SHOW_ACTIONS_BY_ITEM_ID}
          />
          <ExpandPopoverListItem
            iconType="storage"
            label={i18n.translate('xpack.csp.graph.graphNodeExpandPopover.showActionsOnEntity', {
              defaultMessage: 'Show actions on this entity',
            })}
            onClick={onShowActionsOnEntityClick}
            data-test-subj={GRAPH_NODE_POPOVER_SHOW_ACTIONS_ON_ITEM_ID}
          />
          <ExpandPopoverListItem
            iconType="visTagCloud"
            label={i18n.translate('xpack.csp.graph.graphNodeExpandPopover.showRelatedEvents', {
              defaultMessage: 'Show related events',
            })}
            onClick={onShowRelatedEntitiesClick}
            data-test-subj={GRAPH_NODE_POPOVER_SHOW_RELATED_ITEM_ID}
          />
        </EuiListGroup>
      </GraphPopover>
    );
  }
);

GraphNodeExpandPopover.displayName = 'GraphNodeExpandPopover';
