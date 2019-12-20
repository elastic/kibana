/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiButton,
  EuiFlexGroup,
  EuiHorizontalRule,
  EuiPopover,
  EuiTitle
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import cytoscape from 'cytoscape';
import React, { useContext, useEffect, useState } from 'react';
import { CytoscapeContext } from './Cytoscape';

export function Popover() {
  const cy = useContext(CytoscapeContext);
  const [selectedNode, setSelectedNode] = useState<
    cytoscape.NodeSingular | undefined
  >(undefined);

  useEffect(() => {
    if (cy) {
      cy.on('select', event => {
        setSelectedNode(event.target);
      });
      cy.on('unselect viewport', () => {
        setSelectedNode(undefined);
      });
    }
  }, [cy]);

  const container = (cy?.container() as HTMLElement) ?? undefined;
  const renderedHeight = selectedNode?.renderedHeight() ?? 0;
  const renderedWidth = selectedNode?.renderedWidth() ?? 0;
  const { x, y } = selectedNode?.position() ?? { x: 0, y: 0 };
  const pan = cy?.pan() ?? { x: 0, y: 0 };
  //  const isOpen = !!selectedNode;
  const isOpen = true;
  const serviceName = selectedNode?.data('id');

  const triggerStyle = {
    background: 'transparent',
    height: renderedHeight,
    width: renderedWidth
  };
  const trigger = <div className="trigger" style={triggerStyle} />;

  const popoverStyle = {
    transform: `translate(${x - pan.x}px, ${y + pan.y}px)`
  };

  return (
    <EuiPopover
      container={container}
      style={popoverStyle}
      closePopover={() => {}}
      isOpen={isOpen}
      button={trigger}
    >
      <EuiFlexGroup direction="column" gutterSize="m">
        <EuiTitle size="xxs">
          <>{serviceName}</>
        </EuiTitle>
        <EuiHorizontalRule margin="xs" />
        <EuiButton fill={true}>
          {i18n.translate('xpack.apm.serviceMap.serviceDetailsButtonText', {
            defaultMessage: 'Service Details'
          })}
        </EuiButton>
        <EuiButton color="secondary">
          {i18n.translate('xpack.apm.serviceMap.focusMapButtonText', {
            defaultMessage: 'Focus map'
          })}
        </EuiButton>
      </EuiFlexGroup>
    </EuiPopover>
  );
}
