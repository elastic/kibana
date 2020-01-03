/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { storiesOf } from '@storybook/react';
import React from 'react';
import { Cytoscape } from './Cytoscape';
import { Popover } from './Popover';

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

storiesOf('app/ServiceMap/Cytoscape', module).add(
  'example',
  () => {
    return (
      <Cytoscape
        elements={[service]}
        style={{ border: '1px dotted', height: '400px' }}
      >
        <Popover />
      </Cytoscape>
    );
  },
  {
    info: {
      text: 'An example Cytoscape component with one node and Popovers',
      source: false,
      propTablesExclude: [Cytoscape]
    }
  }
);
