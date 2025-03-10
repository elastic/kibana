/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React from 'react';

import { mlNodesAvailable, permissionToViewMlNodeCount } from '../../ml_nodes_check';
import { getCloudDeploymentId, isCloud, isCloudTrial } from '../../services/ml_server_info';
import { Warning } from './warning';

export const NodeAvailableWarning: FC = () => {
  if (mlNodesAvailable() === true || permissionToViewMlNodeCount() === false) {
    return null;
  }

  return (
    <Warning
      isCloud={isCloud()}
      isCloudTrial={isCloudTrial()}
      deploymentId={getCloudDeploymentId()}
    />
  );
};
