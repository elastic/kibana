/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { storiesOf } from '@storybook/react';
import React from 'react';
import { Contents } from './Contents';
import {
  ApmPluginContext,
  ApmPluginContextValue
} from '../../../../context/ApmPluginContext';

const data = {
  id: 'opbeans-node',
  label: 'opbeans-node',
  href:
    '#/services/opbeans-node/service-map?rangeFrom=now-24h&rangeTo=now&refreshPaused=true&refreshInterval=0',
  agentName: 'nodejs',
  type: 'service'
};

function Example() {
  const [isOpen, setIsOpen] = React.useState(true);

  return (
    <Contents
      button={
        <button
          onClick={() => {
            setIsOpen(prevState => !prevState);
          }}
        >
          toggle popover
        </button>
      }
      data={data}
      isOpen={isOpen}
      isService={true}
      label="opbeans-node"
      onFocusClick={() => {}}
      selectedNodeServiceName="opbeans-node"
      style={{}}
    />
  );
}

storiesOf('app/ServiceMap/Popover/Contents', module).add(
  'example',
  () => {
    return (
      <ApmPluginContext.Provider
        value={
          ({ core: { notifications: {} } } as unknown) as ApmPluginContextValue
        }
      >
        <Example />
      </ApmPluginContext.Provider>
    );
  },
  {
    info: {
      propTablesExclude: [ApmPluginContext.Provider, Example],
      source: false
    }
  }
);
