/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ListNodesRouteResponse,
  PhaseWithAllocation,
} from '../../../../../../../../../common/types';

export interface SharedProps {
  phase: PhaseWithAllocation;
  nodes: ListNodesRouteResponse['nodesByAttributes'];
  hasNodeAttributes: boolean;
  isCloudEnabled: boolean;
  isUsingDeprecatedDataRoleConfig: boolean;
  /**
   * A flag to indicate whether input fields should be showing a loading spinner
   */
  isLoading: boolean;
}
