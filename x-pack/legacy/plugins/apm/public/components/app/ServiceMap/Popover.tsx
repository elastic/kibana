/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiPopover } from '@elastic/eui';
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

    window.onclick = event => {
      console.log(event);
      console.log(event.target.x, event.target.y);
    };
  }, [cy]);

  if (!cy || !selectedNode) {
    return null;
  }

  const container = (cy.container() as HTMLElement) || undefined;

  if (!container) {
    return null;
  }

  const triggerStyle = {
    background: 'transparent',
    height: selectedNode.renderedHeight(),
    width: selectedNode.renderedWidth()
  };
  const trigger = <div className="trigger" style={triggerStyle} />;

  const { x, y } = selectedNode.position();
  const pan = cy.pan();

  const popoverStyle = {
    transform: `translate(${x - pan.x}px, ${y + pan.y}px)`
  };
  console.log({ x, y, panx: cy.pan().x, pany: cy.pan().y });
  return (
    <EuiPopover
      className="poopover"
      container={container}
      style={popoverStyle}
      closePopover={() => {}}
      isOpen={true}
      button={trigger}
    >
      {JSON.stringify(selectedNode.data())}
    </EuiPopover>
  );
}
