/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiPopover,
  EuiTitle
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import cytoscape from 'cytoscape';
import React, { CSSProperties, useContext, useEffect, useState } from 'react';
import { ServiceNodeMetrics } from '../../../../../server/lib/service_map/get_service_map_service_node_info';
import { CytoscapeContext } from '../Cytoscape';
import { Buttons } from './Buttons';
import { MetricList } from './MetricList';
import { useFetcher } from '../../../../hooks/useFetcher';
import { useUrlParams } from '../../../../hooks/useUrlParams';

interface PopoverProps {
  focusedServiceName?: string;
}

export function Popover({ focusedServiceName }: PopoverProps) {
  const cy = useContext(CytoscapeContext);
  const [selectedNode, setSelectedNode] = useState<
    cytoscape.NodeSingular | undefined
  >(undefined);

  const {
    urlParams: { start, end, environment }
  } = useUrlParams();

  const serviceName = selectedNode?.data('isService')
    ? (selectedNode.data('id') as string)
    : null;

  const { data = {} as ServiceNodeMetrics } = useFetcher(
    callApmApi => {
      if (serviceName && start && end) {
        return callApmApi({
          pathname: '/api/apm/service-map/service/{serviceName}',
          params: {
            path: {
              serviceName
            },
            query: {
              start,
              end,
              environment
            }
          }
        });
      }
    },
    [serviceName, start, end, environment],
    {
      preservePreviousData: false
    }
  );

  useEffect(() => {
    const selectHandler: cytoscape.EventHandler = event => {
      setSelectedNode(event.target);
    };
    const unselectHandler: cytoscape.EventHandler = () => {
      // Set a timeout here so we don't unselect if the selection has changed to
      // a new node.
      setTimeout(() => {
        if (cy?.$('node:selected').length === 0) {
          setSelectedNode(undefined);
        }
      }, 0);
    };
    const viewportHandler: cytoscape.EventHandler = event => {
      const selectedNodes = cy?.$('node:selected');
      if (selectedNodes) {
        selectedNodes.unselect();
      }
    };

    if (cy) {
      cy.on('select', 'node', selectHandler);
      cy.on('unselect', 'node', unselectHandler);
      cy.on('viewport', viewportHandler);
    }

    return () => {
      if (cy) {
        cy.removeListener('select', 'node', selectHandler);
        cy.removeListener('unselect', 'node', unselectHandler);
        cy.removeListener('viewport', undefined, viewportHandler);
      }
    };
  }, [cy]);

  const renderedHeight = selectedNode?.renderedHeight() ?? 0;
  const renderedWidth = selectedNode?.renderedWidth() ?? 0;
  const { x, y } = selectedNode?.renderedPosition() ?? { x: 0, y: 0 };
  const isOpen = !!selectedNode;
  const selectedNodeServiceName: string = selectedNode?.data('id');
  const isService = !!selectedNode?.data('isService');
  const triggerStyle: CSSProperties = {
    background: 'transparent',
    height: renderedHeight,
    position: 'absolute',
    width: renderedWidth
  };
  const trigger = <div className="trigger" style={triggerStyle} />;

  const zoom = cy?.zoom() ?? 1;
  const height = selectedNode?.height() ?? 0;
  const translateY = y - (zoom + 1) * (height / 2);
  const popoverStyle: CSSProperties = {
    position: 'absolute',
    transform: `translate(${x}px, ${translateY}px)`
  };

  const instanceCount = data.numInstances;

  return (
    <EuiPopover
      anchorPosition={'upCenter'}
      button={trigger}
      closePopover={() => {}}
      isOpen={isOpen}
      style={popoverStyle}
    >
      <EuiFlexGroup direction="column" gutterSize="s">
        <EuiFlexItem>
          <EuiTitle size="xxs">
            <h3>{selectedNodeServiceName}</h3>
          </EuiTitle>
          <EuiHorizontalRule margin="xs" />
        </EuiFlexItem>

        {instanceCount && instanceCount > 1 && (
          <EuiFlexItem>
            <div>
              <EuiBadge iconType="apps" color="hollow">
                {i18n.translate('xpack.apm.serviceMap.instanceCount', {
                  values: { instanceCount },
                  defaultMessage: '{instanceCount} instances'
                })}
              </EuiBadge>
            </div>
          </EuiFlexItem>
        )}

        <EuiFlexItem>
          <MetricList {...data} />
        </EuiFlexItem>
        {isService && (
          <Buttons
            focusedServiceName={focusedServiceName}
            selectedNodeServiceName={selectedNodeServiceName}
          />
        )}
      </EuiFlexGroup>
    </EuiPopover>
  );
}
