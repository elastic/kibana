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
import { getCytoscapeElements } from './get_cytoscape_elements';
import serviceMapResponse from './cytoscape-layout-test-response.json';
import { iconForNode } from './icons';

const elementsFromResponses = getCytoscapeElements([serviceMapResponse], '');

storiesOf('app/ServiceMap/Cytoscape', module).add(
  'example',
  () => {
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
        { data: { id: 'default', label: 'default', type: undefined } },
        { data: { id: 'cache', label: 'cache', type: 'cache' } },
        { data: { id: 'database', label: 'database', type: 'database' } },
        { data: { id: 'external', label: 'external', type: 'external' } },
        { data: { id: 'messaging', label: 'messaging', type: 'messaging' } },

        {
          data: {
            id: 'dotnet',
            label: 'dotnet service',
            type: 'service',
            agentName: 'dotnet'
          }
        },
        {
          data: {
            id: 'go',
            label: 'go service',
            type: 'service',
            agentName: 'go'
          }
        },
        {
          data: {
            id: 'java',
            label: 'java service',
            type: 'service',
            agentName: 'java'
          }
        },
        {
          data: {
            id: 'js-base',
            label: 'js-base service',
            type: 'service',
            agentName: 'js-base'
          }
        },
        {
          data: {
            id: 'nodejs',
            label: 'nodejs service',
            type: 'service',
            agentName: 'nodejs'
          }
        },
        {
          data: {
            id: 'php',
            label: 'php service',
            type: 'service',
            agentName: 'php'
          }
        },
        {
          data: {
            id: 'python',
            label: 'python service',
            type: 'service',
            agentName: 'python'
          }
        },
        {
          data: {
            id: 'ruby',
            label: 'ruby service',
            type: 'service',
            agentName: 'ruby'
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
                    agentName: {node.data('agentName') || 'undefined'}, type:{' '}
                    {node.data('type') || 'undefined'}
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
                title={node.data('label')}
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
