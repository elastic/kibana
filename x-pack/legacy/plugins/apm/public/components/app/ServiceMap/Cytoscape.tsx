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
  createContext
} from 'react';
import cytoscape from 'cytoscape';
import dagre from 'cytoscape-dagre';
import { cytoscapeOptions } from './cytoscapeOptions';

cytoscape.use(dagre);

export const CytoscapeContext = createContext<cytoscape.Core | undefined>(
  undefined
);

interface CytoscapeProps {
  children?: ReactNode;
  elements: cytoscape.ElementDefinition[];
  serviceName?: string;
  style: CSSProperties;
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

export function Cytoscape({
  children,
  elements,
  serviceName,
  style
}: CytoscapeProps) {
  const [ref, cy] = useCytoscape({ ...cytoscapeOptions, elements });

  // Trigger a custom "data" event when data changes
  useEffect(() => {
    if (cy) {
      cy.remove('*');
      cy.add(elements);
      cy.trigger('data');
    }
  }, [cy, elements]);

  // Set up cytoscape event handlers
  useEffect(() => {
    if (cy) {
      cy.on('data', event => {
        // Add the "primary" class to the node if its id matches the serviceName.
        if (cy.nodes().length > 0 && serviceName) {
          cy.getElementById(serviceName).addClass('primary');
        }

        if (event.cy.elements().length > 0) {
          cy.layout(cytoscapeOptions.layout as cytoscape.LayoutOptions).run();
        }
      });
    }
  }, [cy, serviceName]);

  return (
    <CytoscapeContext.Provider value={cy}>
      <div ref={ref} style={style}>
        {children}
      </div>
    </CytoscapeContext.Provider>
  );
}
