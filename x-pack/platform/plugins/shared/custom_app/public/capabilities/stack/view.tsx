/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiPanel } from '@elastic/eui';
import { css } from '@emotion/react';
import { type AppNode, type AppNodeOfType } from '@kbn/custom-app-common';
import { getCapability } from '@kbn/custom-app-registry';
import { NodeRenderer } from '../../components/node_renderer';
import type { CapabilityViewProps } from '../capability_views';

const isInput = (node: AppNode): boolean => getCapability(node.type)?.filter === true;

/** What takes only the room it needs in a row: a status, a button, a link. They do not fill it. */
const isCompact = (node: AppNode): boolean => getCapability(node.type)?.compact === true;

export const StackView = ({ node }: CapabilityViewProps<AppNodeOfType<'stack'>>) => {
  const isRow = node.direction === 'horizontal';
  // A row of inputs reads as a toolbar for what is below it, so it is drawn as one.
  const isFilterBar = isRow && node.children.length > 0 && node.children.every(isInput);
  // A row of statuses and buttons, such as a filter and the button that clears it, sits together
  // on one line, at the start, and not spread across the width.
  const isCompactRow = isRow && node.children.length > 0 && node.children.every(isCompact);
  const group = (
    <EuiFlexGroup
      direction={isRow ? 'row' : 'column'}
      // Stacked things get room to breathe; things side by side belong together, so sit closer.
      gutterSize={isRow ? 'm' : 'l'}
      alignItems={isFilterBar ? 'flexEnd' : isCompactRow ? 'center' : 'stretch'}
      responsive={false}
      wrap={isRow}
      data-node-id={node.id}
    >
      {node.children.map((child) =>
        // A flyout draws nothing in place, so it gets no item, which would only add a gap.
        getCapability(child.type)?.overlay === true ? (
          <NodeRenderer key={child.id} node={child} />
        ) : getCapability(child.type)?.alignEnd === true ? (
          // The period belongs at the right, in a row of filters as on a line of its own, and
          // takes only the room it needs: it is not a filter that fills the row with the rest.
          <EuiFlexItem
            key={child.id}
            grow={false}
            css={css({ marginInlineStart: 'auto' })}
            data-test-subj="customAppTimeRangeItem"
          >
            <NodeRenderer node={child} />
          </EuiFlexItem>
        ) : (
          <EuiFlexItem key={child.id} grow={isRow && !isCompact(child)}>
            <NodeRenderer node={child} />
          </EuiFlexItem>
        )
      )}
    </EuiFlexGroup>
  );
  return isFilterBar ? (
    <EuiPanel
      color="subdued"
      paddingSize="s"
      hasShadow={false}
      borderRadius="m"
      data-test-subj="customAppFilterBar"
    >
      {group}
    </EuiPanel>
  ) : (
    group
  );
};
