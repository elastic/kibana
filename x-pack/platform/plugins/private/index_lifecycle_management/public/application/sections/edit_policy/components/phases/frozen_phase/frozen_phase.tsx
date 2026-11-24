/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FunctionComponent } from 'react';
import React from 'react';
import { EuiSpacer } from '@elastic/eui';

import type { ListNodesRouteResponse } from '../../../../../../../common/types';
import { useKibana } from '../../../../../../shared_imports';
import { useLoadNodes } from '../../../../../services/api';
import { SearchableSnapshotField } from '../shared_fields';
import { Phase } from '../phase';
import { NoFrozenNodesNotice } from './no_frozen_nodes_notice';

/**
 * Frozen indices can only be allocated to nodes with the "data_frozen" role, or to nodes with
 * the generic "data" role, which covers all tiers.
 */
const hasNodesForFrozenTier = (nodesByRoles: ListNodesRouteResponse['nodesByRoles']) =>
  Boolean(nodesByRoles.data_frozen?.length || nodesByRoles.data?.length);

export const FrozenPhase: FunctionComponent = () => {
  const {
    services: { cloud },
  } = useKibana();
  const { data, isLoading, error } = useLoadNodes();

  /**
   * On Cloud, autoscaling provisions the frozen tier when it is needed, so the notice is not shown,
   * like the other data tier notices.
   */
  const showNoFrozenNodesNotice =
    !cloud?.isCloudEnabled && !isLoading && !error && !hasNodesForFrozenTier(data!.nodesByRoles);

  return (
    <Phase
      phase="frozen"
      topLevelSettings={
        <>
          {showNoFrozenNodesNotice && (
            <>
              <NoFrozenNodesNotice />
              <EuiSpacer size="m" />
            </>
          )}
          <SearchableSnapshotField phase="frozen" canBeDisabled={false} />
        </>
      }
    />
  );
};
