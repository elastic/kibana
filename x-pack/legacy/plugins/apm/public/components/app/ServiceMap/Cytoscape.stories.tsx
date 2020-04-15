/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiCard, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { storiesOf } from '@storybook/react';
import cytoscape from 'cytoscape';
import React from 'react';
import { Cytoscape } from './Cytoscape';
import serviceMapResponse from './cytoscape-layout-test-response.json';
import { iconForNode } from './icons';

const elementsFromResponses = serviceMapResponse.elements;

storiesOf('app/ServiceMap/Cytoscape', module).add(
  'example',
  () => {
    const elements: cytoscape.ElementDefinition[] = [
      {
        data: {
          id: 'opbeans-python',
          'service.name': 'opbeans-python',
          'agent.name': 'python'
        }
      },
      {
        data: {
          id: 'opbeans-node',
          'service.name': 'opbeans-node',
          'agent.name': 'nodejs'
        }
      },
      {
        data: {
          id: 'opbeans-ruby',
          'service.name': 'opbeans-ruby',
          'agent.name': 'ruby'
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
    const width = 1340;
    const serviceName = 'opbeans-python';
    return (
      <Cytoscape
        elements={elements}
        height={height}
        width={width}
        serviceName={serviceName}
      />
    );
  },
  {
    info: {
      propTables: false,
      source: false
    }
  }
);

storiesOf('app/ServiceMap/Cytoscape', module)
  .add(
    'node icons',
    () => {
      const cy = cytoscape();
      const elements = [
        { data: { id: 'default' } },
        { data: { id: 'cache', 'span.type': 'cache' } },
        { data: { id: 'database', 'span.type': 'db' } },
        {
          data: {
            id: 'elasticsearch',
            'span.type': 'db',
            'span.subtype': 'elasticsearch'
          }
        },
        { data: { id: 'external', 'span.type': 'external' } },
        { data: { id: 'ext', 'span.type': 'ext' } },
        { data: { id: 'messaging', 'span.type': 'messaging' } },
        {
          data: {
            id: 'dotnet',
            'service.name': 'dotnet service',
            'agent.name': 'dotnet'
          }
        },
        {
          data: {
            id: 'go',
            'service.name': 'go service',
            'agent.name': 'go'
          }
        },
        {
          data: {
            id: 'java',
            'service.name': 'java service',
            'agent.name': 'java'
          }
        },
        {
          data: {
            id: 'RUM (js-base)',
            'service.name': 'RUM service',
            'agent.name': 'js-base'
          }
        },
        {
          data: {
            id: 'RUM (rum-js)',
            'service.name': 'RUM service',
            'agent.name': 'rum-js'
          }
        },
        {
          data: {
            id: 'nodejs',
            'service.name': 'nodejs service',
            'agent.name': 'nodejs'
          }
        },
        {
          data: {
            id: 'php',
            'service.name': 'php service',
            'agent.name': 'php'
          }
        },
        {
          data: {
            id: 'python',
            'service.name': 'python service',
            'agent.name': 'python'
          }
        },
        {
          data: {
            id: 'ruby',
            'service.name': 'ruby service',
            'agent.name': 'ruby'
          }
        }
      ];
      cy.add(elements);

      return (
        <EuiFlexGroup gutterSize="l" wrap={true}>
          {cy.nodes().map(node => (
            <EuiFlexItem key={node.data('id')}>
              <EuiCard
                description={
                  <pre>
                    agent.name: {node.data('agent.name') || 'undefined'},
                    span.type: {node.data('span.type') || 'undefined'},
                    span.subtype: {node.data('span.subtype') || 'undefined'}
                  </pre>
                }
                icon={
                  <img
                    alt={node.data('label')}
                    src={iconForNode(node)}
                    height={80}
                    width={80}
                  />
                }
                title={node.data('id')}
              />
            </EuiFlexItem>
          ))}
        </EuiFlexGroup>
      );
    },
    {
      info: {
        propTables: false,
        source: false
      }
    }
  )
  .add(
    'layout',
    () => {
      const height = 640;
      const width = 1340;
      const serviceName = undefined; // global service map

      return (
        <Cytoscape
          elements={elementsFromResponses}
          height={height}
          width={width}
          serviceName={serviceName}
        />
      );
    },
    {
      info: {
        source: false
      }
    }
  )
  .addParameters({ options: { showPanel: false } });
