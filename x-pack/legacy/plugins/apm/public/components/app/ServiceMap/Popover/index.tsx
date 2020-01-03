/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiPopover,
  EuiTitle
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import cytoscape from 'cytoscape';
import React, { useContext, useEffect, useState } from 'react';
import { CytoscapeContext } from '../Cytoscape';
import { Buttons } from './Buttons';
import { MetricList } from './MetricList';

export function Popover() {
  const cy = useContext(CytoscapeContext);
  const [selectedNode, setSelectedNode] = useState<
    cytoscape.NodeSingular | undefined
  >(undefined);

  useEffect(() => {
    const selectHandler: cytoscape.EventHandler = event => {
      setSelectedNode(event.target);
    };
    const unselectHandler: cytoscape.EventHandler = event => {
      setTimeout(() => {
        if (cy?.$('node:selected').length === 0) {
          setSelectedNode(undefined);
        }
      }, 0);
    };

    if (cy) {
      cy.on('select', 'node', selectHandler);
      cy.on('unselect', 'node', unselectHandler);
    }

    return () => {
      if (cy) {
        cy.removeListener('select', 'node', selectHandler);
        cy.removeListener('unselect', 'node', unselectHandler);
      }
    };
  }, [cy]);

  const container = (cy?.container() as HTMLElement) ?? undefined;
  const renderedHeight = selectedNode?.renderedHeight() ?? 0;
  const renderedWidth = selectedNode?.renderedWidth() ?? 0;
  const { x, y } = selectedNode?.renderedPosition() ?? { x: 0, y: 0 };
  const pan = cy?.pan() ?? { x: 0, y: 0 };
  const isOpen = !!selectedNode;
  const serviceName = selectedNode?.data('id');
  const instanceCount = selectedNode?.data('instanceCount');

  const triggerStyle = {
    background: 'transparent',
    height: renderedHeight,
    width: renderedWidth
  };
  const trigger = <div className="trigger" style={triggerStyle} />;

  const popoverStyle = {
    transform: `translate(${x - renderedWidth / 2}px, ${y +
      renderedHeight / 2}px)`
  };

  return (
    <EuiPopover
      container={container}
      style={popoverStyle}
      closePopover={() => {}}
      isOpen={isOpen}
      button={trigger}
    >
      <EuiFlexGroup direction="column" gutterSize="s">
        <EuiFlexItem>
          <EuiTitle size="xxs">
            <h3>{serviceName}</h3>
          </EuiTitle>
          <EuiHorizontalRule margin="xs" />
        </EuiFlexItem>

        {instanceCount && instanceCount > 1 && (
          <EuiFlexItem>
            <div>
              <EuiBadge iconType="apps" color="hollow">
                {i18n.translate('xpack.apm.serviceMap.instanceCount', {
                  values: { instanceCount },
                  defaultMessage: '{instanceCount} instances'
                })}
              </EuiBadge>
            </div>
          </EuiFlexItem>
        )}

        <EuiFlexItem>
          <MetricList {...selectedNode?.data()} />
        </EuiFlexItem>
        <Buttons serviceName={serviceName} />
      </EuiFlexGroup>
    </EuiPopover>
  );
}
