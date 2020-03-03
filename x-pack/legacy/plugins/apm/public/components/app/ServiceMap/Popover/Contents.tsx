/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiTitle
} from '@elastic/eui';
import cytoscape from 'cytoscape';
import React from 'react';
import { Buttons } from './Buttons';
import { Info } from './Info';
import { ServiceMetricFetcher } from './ServiceMetricFetcher';

const popoverMinWidth = 280;

interface ContentsProps {
  focusedServiceName?: string;
  isService: boolean;
  label: string;
  onFocusClick: () => void;
  selectedNodeData: cytoscape.NodeDataDefinition;
  selectedNodeServiceName: string;
}

export function Contents({
  selectedNodeData,
  focusedServiceName,
  isService,
  label,
  onFocusClick,
  selectedNodeServiceName
}: ContentsProps) {
  const frameworkName = selectedNodeData.frameworkName;
  return (
    <EuiFlexGroup
      direction="column"
      gutterSize="s"
      style={{ minWidth: popoverMinWidth }}
    >
      <EuiFlexItem>
        <EuiTitle size="xxs">
          <h3>{label}</h3>
        </EuiTitle>
        <EuiHorizontalRule margin="xs" />
      </EuiFlexItem>
      <EuiFlexItem>
        {isService ? (
          <ServiceMetricFetcher
            frameworkName={frameworkName}
            serviceName={selectedNodeServiceName}
          />
        ) : (
          <Info {...selectedNodeData} />
        )}
      </EuiFlexItem>
      {isService && (
        <Buttons
          focusedServiceName={focusedServiceName}
          onFocusClick={onFocusClick}
          selectedNodeServiceName={selectedNodeServiceName}
        />
      )}
    </EuiFlexGroup>
  );
}
