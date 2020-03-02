/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { storiesOf } from '@storybook/react';
import cytoscape from 'cytoscape';
import React from 'react';
import { CytoscapeContext } from '../Cytoscape';
import { EdgeInfoPanel } from './';

storiesOf('app/ServiceMap/EdgeInfoPanel', module).add(
  'example',
  () => {
    const cy = cytoscape({
      elements: [
        { data: { id: 'a' } },
        { data: { id: 'b' } },
        {
          data: {
            id: 'test edge',
            source: 'a',
            target: 'b',
            avgResponseTime: 756000,
            callsPerMin: 37.6
          },
          selected: true
        }
      ]
    });
    cy.edges()
      .first()
      .select();

    return (
      <CytoscapeContext.Provider value={cy}>
        <EdgeInfoPanel />
      </CytoscapeContext.Provider>
    );
  },
  { info: { propTables: false, source: false } }
);
