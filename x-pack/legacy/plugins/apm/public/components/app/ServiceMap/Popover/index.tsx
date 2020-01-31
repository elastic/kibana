/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import cytoscape from 'cytoscape';
import React, {
  CSSProperties,
  useCallback,
  useContext,
  useEffect,
  useState
} from 'react';
import { CytoscapeContext } from '../Cytoscape';
import { Contents } from './Contents';

interface PopoverProps {
  focusedServiceName?: string;
}

export function Popover({ focusedServiceName }: PopoverProps) {
  const cy = useContext(CytoscapeContext);
  const [selectedNode, setSelectedNode] = useState<
    cytoscape.NodeSingular | undefined
  >(undefined);
  const onFocusClick = useCallback(() => setSelectedNode(undefined), [
    setSelectedNode
  ]);

  useEffect(() => {
    const selectHandler: cytoscape.EventHandler = event => {
      setSelectedNode(event.target);
    };
    const unselectHandler: cytoscape.EventHandler = () => {
      setSelectedNode(undefined);
    };

    if (cy) {
      cy.on('select', 'node', selectHandler);
      cy.on('unselect', 'node', unselectHandler);
      cy.on('data viewport', unselectHandler);
    }

    return () => {
      if (cy) {
        cy.removeListener('select', 'node', selectHandler);
        cy.removeListener('unselect', 'node', unselectHandler);
        cy.removeListener('data viewport', undefined, unselectHandler);
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
  const label = data.label || selectedNodeServiceName;

  return (
    <Contents
      button={trigger}
      data={data}
      isOpen={isOpen}
      isService={isService}
      label={label}
      onFocusClick={onFocusClick}
      selectedNodeServiceName={selectedNodeServiceName}
      style={popoverStyle}
    />
  );
}
