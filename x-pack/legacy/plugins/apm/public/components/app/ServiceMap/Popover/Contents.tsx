/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiPopover,
  EuiTitle
} from '@elastic/eui';
import cytoscape from 'cytoscape';
import React, { CSSProperties, MutableRefObject } from 'react';
import { Buttons } from './Buttons';
import { Info } from './Info';
import { ServiceMetricList } from './ServiceMetricList';

const popoverMinWidth = 280;

interface ContentsProps {
  button: JSX.Element;
  data: cytoscape.NodeDataDefinition;
  focusedServiceName?: string;
  isOpen: boolean;
  isService: boolean;
  label: string;
  onFocusClick: () => void;
  popoverRef: MutableRefObject<EuiPopover | null>;
  selectedNodeServiceName: string;
  style: CSSProperties;
}

export function Contents({
  button,
  data,
  focusedServiceName,
  isOpen,
  isService,
  label,
  onFocusClick,
  popoverRef,
  selectedNodeServiceName,
  style
}: ContentsProps) {
  return (
    <EuiPopover
      anchorPosition={'upCenter'}
      button={button}
      closePopover={() => {}}
      isOpen={isOpen}
      ref={popoverRef}
      style={style}
    >
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
            <ServiceMetricList serviceName={selectedNodeServiceName} />
          ) : (
            <Info {...data} />
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
    </EuiPopover>
  );
}
