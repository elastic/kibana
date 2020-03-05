/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, {
  CSSProperties,
  useState,
  useRef,
  useEffect,
  ReactNode,
  createContext,
  useCallback
} from 'react';
import cytoscape from 'cytoscape';
import { isRumAgentName } from '../../../../../../../plugins/apm/common/agent_name';
import {
  cytoscapeOptions,
  nodeHeight,
  animationOptions
} from './cytoscapeOptions';

export const CytoscapeContext = createContext<cytoscape.Core | undefined>(
  undefined
);

interface CytoscapeProps {
  children?: ReactNode;
  elements: cytoscape.ElementDefinition[];
  height: number;
  width: number;
  serviceName?: string;
  style?: CSSProperties;
}

function useCytoscape(options: cytoscape.CytoscapeOptions) {
  const [cy, setCy] = useState<cytoscape.Core | undefined>(undefined);
  const ref = useRef(null);

  useEffect(() => {
    if (!cy) {
      setCy(cytoscape({ ...options, container: ref.current }));
    }
  }, [options, cy]);

  // Destroy the cytoscape instance on unmount
  useEffect(() => {
    return () => {
      if (cy) {
        cy.destroy();
      }
    };
  }, [cy]);

  return [ref, cy] as [React.MutableRefObject<any>, cytoscape.Core | undefined];
}

function getLayoutOptions(
  selectedRoots: string[],
  height: number,
  width: number
): cytoscape.LayoutOptions {
  return {
    name: 'breadthfirst',
    roots: selectedRoots,
    fit: true,
    padding: nodeHeight,
    spacingFactor: 0.85,
    animate: true,
    animationEasing: animationOptions.easing,
    animationDuration: animationOptions.duration,
    // Rotate nodes from top -> bottom to display left -> right
    // @ts-ignore
    transform: (node: any, { x, y }: cytoscape.Position) => ({ x: y, y: -x }),
    // swap width/height of boundingBox to compensation for the rotation
    boundingBox: { x1: 0, y1: 0, w: height, h: width }
  };
}

function selectRoots(elements: cytoscape.ElementDefinition[]): string[] {
  const nodes = cytoscape({ elements }).nodes();
  const unconnectedNodes = nodes.roots().intersection(nodes.leaves());
  const rumNodes = nodes.filter(node => isRumAgentName(node.data('agentName')));
  return rumNodes.union(unconnectedNodes).map(node => node.id());
}

export function Cytoscape({
  children,
  elements,
  height,
  width,
  serviceName,
  style
}: CytoscapeProps) {
  const initialElements = elements.map(element => ({
    ...element,
    // prevents flash of unstyled elements
    classes: [element.classes, 'invisible'].join(' ').trim()
  }));

  const [ref, cy] = useCytoscape({
    ...cytoscapeOptions,
    elements: initialElements
  });

  // Add the height to the div style. The height is a separate prop because it
  // is required and can trigger rendering when changed.
  const divStyle = { ...style, height };

  const dataHandler = useCallback<cytoscape.EventHandler>(
    event => {
      if (cy) {
        // Add the "primary" class to the node if its id matches the serviceName.
        if (cy.nodes().length > 0 && serviceName) {
          cy.nodes().removeClass('primary');
          cy.getElementById(serviceName).addClass('primary');
        }

        if (event.cy.elements().length > 0) {
          const selectedRoots = selectRoots(elements);
          const layout = cy.layout(
            getLayoutOptions(selectedRoots, height, width)
          );
          layout.one('layoutstop', () => {
            // show elements after layout is applied
            cy.elements().removeClass('invisible');
          });
          layout.run();
        }
      }
    },
    [cy, serviceName, elements, height, width]
  );

  // Trigger a custom "data" event when data changes
  useEffect(() => {
    if (cy) {
      cy.add(elements);
      cy.trigger('data');
    }
  }, [cy, elements]);

  // Set up cytoscape event handlers
  useEffect(() => {
    const mouseoverHandler: cytoscape.EventHandler = event => {
      event.target.addClass('hover');
      event.target.connectedEdges().addClass('nodeHover');
    };
    const mouseoutHandler: cytoscape.EventHandler = event => {
      event.target.removeClass('hover');
      event.target.connectedEdges().removeClass('nodeHover');
    };

    if (cy) {
      cy.on('data', dataHandler);
      cy.ready(dataHandler);
      cy.on('mouseover', 'edge, node', mouseoverHandler);
      cy.on('mouseout', 'edge, node', mouseoutHandler);
    }

    return () => {
      if (cy) {
        cy.removeListener(
          'data',
          undefined,
          dataHandler as cytoscape.EventHandler
        );
        cy.removeListener('mouseover', 'edge, node', mouseoverHandler);
        cy.removeListener('mouseout', 'edge, node', mouseoutHandler);
      }
    };
  }, [cy, dataHandler, serviceName]);

  return (
    <CytoscapeContext.Provider value={cy}>
      <div ref={ref} style={divStyle}>
        {children}
      </div>
    </CytoscapeContext.Provider>
  );
}
