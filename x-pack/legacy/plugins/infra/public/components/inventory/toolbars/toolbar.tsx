/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { InfraNodeType } from '../../../graphql/types';
import { HostToolbar } from './host_toolbar';
import { PodToolbar } from './pod_toolbar';
import { ContainerToolbar } from './container_toolbar';

export interface ToolbarProps {
  nodeType: InfraNodeType;
}

export const Toolbar = (props: ToolbarProps) => {
  switch (props.nodeType) {
    case InfraNodeType.host:
      return <HostToolbar {...props} />;
    case InfraNodeType.pod:
      return <PodToolbar {...props} />;
    case InfraNodeType.container:
      return <ContainerToolbar {...props} />;
    default:
      return null;
  }
};
