/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useContext, useState, useEffect } from 'react';
import { EuiPopover } from '@elastic/eui';
import { CytoscapeContext } from './Cytoscape';
import cytoscape from 'cytoscape';

export function Popover() {
  const cy = useContext(CytoscapeContext);
  const [isOpen, setIsOpen] = useState(true);
  const [selectedNode, setSelectedNode] = useState<
    cytoscape.NodeSingular | undefined
  >(undefined);

  useEffect(() => {
    if (cy) {
      cy.on('select', event => {
        setSelectedNode(event.target);
      });
      cy.on('unselect', () => {
        setSelectedNode(undefined);
      });
    }
  }, [cy]);

  console.log({
    position: selectedNode?.position(),
    renderedPostion: selectedNode?.renderedPosition()
  });

  return (
    <span
      style={{
        position: 'absolute',
        left: selectedNode?.renderedPosition().x,
        top: selectedNode?.renderedPosition().y
      }}
    >
      {JSON.stringify(selectedNode?.data())}
    </span>
    // <EuiPopover isOpen={isOpen} style={{ top: 100, right: 300 }}>
    //   content
    // </EuiPopover>
  );
}
