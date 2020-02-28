/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { storiesOf } from '@storybook/react';
import cytoscape from 'cytoscape';
import React from 'react';
import { Cytoscape } from './Cytoscape';

const elements: cytoscape.ElementDefinition[] = [
  {
    data: {
      id: 'opbeans-python',
      label: 'opbeans-python',
      agentName: 'python',
      type: 'service'
    }
  },
  {
    data: {
      id: 'opbeans-node',
      label: 'opbeans-node',
      agentName: 'nodejs',
      type: 'service'
    }
  },
  {
    data: {
      id: 'opbeans-ruby',
      label: 'opbeans-ruby',
      agentName: 'ruby',
      type: 'service'
    }
  },
  { data: { source: 'opbeans-python', target: 'opbeans-node' } },
  {
    data: {
      bidirectional: true,
      source: 'opbeans-python',
      target: 'opbeans-ruby'
    }
  }
];
const height = 300;
const serviceName = 'opbeans-python';

storiesOf('app/ServiceMap/Cytoscape', module).add(
  'example',
  () => {
    return (
      <Cytoscape
        elements={elements}
        height={height}
        serviceName={serviceName}
      />
    );
  },
  {
    info: {
      source: false
    }
  }
);
