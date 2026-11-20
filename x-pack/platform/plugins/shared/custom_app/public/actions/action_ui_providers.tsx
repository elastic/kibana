/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, type ReactNode } from 'react';
import { listActionUiProviders } from '@kbn/custom-app-registry';
import { useOptionalDataLayer } from '../data/data_layer_context';

/**
 * Puts around the app what the actions that were registered need drawn, such as the dialog that
 * asks the person to confirm a workflow. Each is given where the app is and how to refresh it.
 */
export const ActionUiProviders = ({ appId, children }: { appId?: string; children: ReactNode }) => {
  const layer = useOptionalDataLayer();
  const host = useMemo(() => ({ appId, refreshData: () => layer?.retry() }), [appId, layer]);

  return (
    <>
      {listActionUiProviders().reduceRight(
        (inner, [id, Provider]) => (
          <Provider key={id} host={host}>
            {inner}
          </Provider>
        ),
        <>{children}</>
      )}
    </>
  );
};
