/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiPopover,
  EuiTitle
} from '@elastic/eui';
import cytoscape from 'cytoscape';
import React, { CSSProperties, useContext, useEffect, useState } from 'react';
import { CytoscapeContext } from '../Cytoscape';
import { Buttons } from './Buttons';
import { Info } from './Info';
import { ServiceMetricList } from './ServiceMetricList';

const popoverMinWidth = 280;

interface PopoverProps {
  focusedServiceName?: string;
}

export function Popover({ focusedServiceName }: PopoverProps) {
  const cy = useContext(CytoscapeContext);
  const [selectedNode, setSelectedNode] = useState<
    cytoscape.NodeSingular | undefined
  >(undefined);

  useEffect(() => {
    const selectHandler: cytoscape.EventHandler = event => {
      setSelectedNode(event.target);
    };
    const unselectHandler: cytoscape.EventHandler = () => {
      // Set a timeout here so we don't unselect if the selection has changed to
      // a new node.
      setTimeout(() => {
        if (cy?.$('node:selected').length === 0) {
          setSelectedNode(undefined);
        }
      }, 0);
    };
    const viewportHandler: cytoscape.EventHandler = event => {
      const selectedNodes = cy?.$('node:selected');
      if (selectedNodes) {
        selectedNodes.unselect();
      }
    };

    if (cy) {
      cy.on('select', 'node', selectHandler);
      cy.on('unselect', 'node', unselectHandler);
      cy.on('viewport', viewportHandler);
    }

    return () => {
      if (cy) {
        cy.removeListener('select', 'node', selectHandler);
        cy.removeListener('unselect', 'node', unselectHandler);
        cy.removeListener('viewport', undefined, viewportHandler);
      }
    };
  }, [cy]);

  const renderedHeight = selectedNode?.renderedHeight() ?? 0;
  const renderedWidth = selectedNode?.renderedWidth() ?? 0;
  const { x, y } = selectedNode?.renderedPosition() ?? { x: 0, y: 0 };
  const isOpen = !!selectedNode;
  const selectedNodeServiceName: string = selectedNode?.data('id');
  const isService = selectedNode?.data('type') === 'service';
  const triggerStyle: CSSProperties = {
    background: 'transparent',
    height: renderedHeight,
    position: 'absolute',
    width: renderedWidth
  };
  const trigger = <div className="trigger" style={triggerStyle} />;

  const zoom = cy?.zoom() ?? 1;
  const height = selectedNode?.height() ?? 0;
  const translateY = y - (zoom + 1) * (height / 2);
  const popoverStyle: CSSProperties = {
    position: 'absolute',
    transform: `translate(${x}px, ${translateY}px)`
  };
  const data = selectedNode?.data() ?? {};

  return (
    <EuiPopover
      anchorPosition={'upCenter'}
      button={trigger}
      closePopover={() => {}}
      isOpen={isOpen}
      style={popoverStyle}
    >
      <EuiFlexGroup
        direction="column"
        gutterSize="s"
        style={{ minWidth: popoverMinWidth }}
      >
        <EuiFlexItem>
          <EuiTitle size="xxs">
            <h3>{selectedNodeServiceName}</h3>
          </EuiTitle>
          <EuiHorizontalRule margin="xs" />
        </EuiFlexItem>

        <EuiFlexItem>
          {isService ? (
            <ServiceMetricList serviceName={selectedNodeServiceName} />
          ) : (
            <Info {...data} />
          )}
        </EuiFlexItem>
        {isService && (
          <Buttons
            focusedServiceName={focusedServiceName}
            selectedNodeServiceName={selectedNodeServiceName}
          />
        )}
      </EuiFlexGroup>
    </EuiPopover>
  );
}
