/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiButton } from '@elastic/eui';
import { storiesOf } from '@storybook/react';
import cytoscape from 'cytoscape';
import React from 'react';
import { Popover } from '.';
import { CytoscapeContext } from '../Cytoscape';

const service = {
  data: {
    id: 'opbeans-java',
    avgCpuUsage: 0.31,
    avgErrorsPerMinute: 7,
    avgMemoryUsage: 0.45,
    avgReqPerMinute: 5,
    avgTransDurationMs: 2459,
    instanceCount: 5
  }
};

const cy = cytoscape({ elements: [service] });

storiesOf('app/ServiceMap/Popover', module).add(
  'example',
  () => {
    function toggle() {
      const node = cy.getElementById(service.data.id);
      if (node?.selected()) {
        node.unselect();
      } else if (node && !node.selected()) {
        node.select();
      }
    }

    return (
      <CytoscapeContext.Provider value={cy}>
        <EuiButton iconType="arrowDown" iconSide="right" onClick={toggle}>
          Toggle popover
        </EuiButton>
        <Popover />
      </CytoscapeContext.Provider>
    );
  },
  {
    info: {
      text: `A popover using this data:

\`\`\`json
${JSON.stringify(service, null, '\t')}
\`\`\``,
      source: false,
      propTablesExclude: [CytoscapeContext.Provider, EuiButton, Popover]
    }
  }
);
