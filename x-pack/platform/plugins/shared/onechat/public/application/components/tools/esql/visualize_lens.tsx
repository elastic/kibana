/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiLoadingSpinner } from '@elastic/eui';
import { v4 as uuidv4 } from 'uuid';
import type { DataViewsServicePublic } from '@kbn/data-views-plugin/public/types';
import type { LensPublicStart, TypedLensByValueInput } from '@kbn/lens-plugin/public';
import React, { useMemo, useState } from 'react';
import useAsync from 'react-use/lib/useAsync';
import { LensConfigBuilder } from '@kbn/lens-embeddable-utils/config_builder';

const VISUALIZATION_HEIGHT = 240;

interface VisualizeLensProps {
  lens: LensPublicStart;
  dataViews: DataViewsServicePublic;
  lensConfig: any;
}

export function VisualizeLens({ lens, dataViews, lensConfig }: VisualizeLensProps) {
  const lensHelpersAsync = useAsync(() => {
    return lens.stateHelperApi();
  }, [lens]);

  // convert lens config to lens attributes
  const lensAttributes = useMemo(() => {
    return new LensConfigBuilder().fromAPIFormat(lensConfig);
  }, [lensConfig]);

  const [lensInput, setLensInput] = useState<TypedLensByValueInput | undefined>({
    attributes: lensAttributes,
    id: uuidv4(),
  });

  const isLoading = !lensHelpersAsync.value || !lensInput;

  return (
    <div style={{ height: VISUALIZATION_HEIGHT }}>
      {isLoading ? (
        <EuiLoadingSpinner />
      ) : (
        <lens.EmbeddableComponent
          {...lensInput}
          style={{
            height: VISUALIZATION_HEIGHT,
          }}
        />
      )}
    </div>
  );
}
