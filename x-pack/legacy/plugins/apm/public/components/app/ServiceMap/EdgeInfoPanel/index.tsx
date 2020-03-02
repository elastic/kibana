/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup } from '@elastic/eui';
import lightTheme from '@elastic/eui/dist/eui_theme_light.json';
import cytoscape from 'cytoscape';
import React, { useContext, useEffect, useState } from 'react';
import styled from 'styled-components';
import { CytoscapeContext } from '../Cytoscape';
import { Contents } from './Contents';

const FlexGroup = styled(EuiFlexGroup)`
  bottom: ${lightTheme.gutterTypes.gutterLarge};
  position: absolute;
  width: 100%;
  transition: opacity ${lightTheme.euiAnimSpeedFast}
    ${lightTheme.euiAnimSlightResistance};
  z-index: 1;
`;

export function EdgeInfoPanel() {
  const cy = useContext(CytoscapeContext);
  const [focusedEdge, setFocusedEdge] = useState<
    cytoscape.EdgeSingular | undefined
  >(undefined);

  useEffect(() => {
    const readyHandler: cytoscape.EventHandler = event => {
      const selectedEdges = event.cy.edges(':selected');
      if (selectedEdges.length === 1) {
        setFocusedEdge(selectedEdges.first());
      }
    };
    const setHandler: cytoscape.EventHandler = event => {
      if (
        event.cy.edges(':selected').length === 1 &&
        event.type === 'mouseover'
      ) {
        return;
      }
      setFocusedEdge(event.target);
    };
    const unsetHandler: cytoscape.EventHandler = event => {
      if (event.cy.edges(':selected').length === 0) {
        setFocusedEdge(undefined);
      }
    };

    if (cy) {
      cy.ready(readyHandler);
      cy.on('mouseover select', 'edge', setHandler);
      cy.on('mouseout unselect', 'edge', unsetHandler);
    }
    return () => {
      if (cy) {
        cy.removeListener('mouseover select', 'edge', setHandler);
        cy.removeListener('mouseout unselect', 'edge', unsetHandler);
      }
    };
  });

  const style = { opacity: 1 };
  if (!focusedEdge || focusedEdge.length === 0) {
    style.opacity = 0;
  }

  // TODO : REAL DATA!
  const { avgResponseTime = 0, callsPerMin = 0 } = {
    avgResponseTime: Math.random() * Math.floor(1000000),
    callsPerMin: Math.random() * Math.floor(10000)
  }; // focusedEdge.data();

  return (
    <FlexGroup justifyContent="spaceAround" style={style}>
      <Contents avgResponseTime={avgResponseTime} callsPerMin={callsPerMin} />
    </FlexGroup>
  );
}
