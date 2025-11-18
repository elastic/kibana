/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useEffect } from 'react';
import useMountedState from 'react-use/lib/useMountedState';
import type { CollectConfigProps } from './types';
import type { IndexPatternItem } from './components/discover_drilldown_config';
import { DiscoverDrilldownConfig } from './components/discover_drilldown_config';
import type { Params } from './drilldown';

export interface CollectConfigContainerProps extends CollectConfigProps {
  params: Params;
}

export const CollectConfigContainer: React.FC<CollectConfigContainerProps> = ({
  config,
  onConfig,
  params: { start },
}) => {
  const isMounted = useMountedState();
  const [indexPatterns, setIndexPatterns] = useState<IndexPatternItem[]>([]);

  useEffect(() => {
    (async () => {
      const indexPatternSavedObjects = await start().plugins.data.dataViews.getCache();
      if (!isMounted()) return;
      setIndexPatterns(
        indexPatternSavedObjects
          ? indexPatternSavedObjects.map((indexPattern) => ({
              id: indexPattern.id,
              title: indexPattern.attributes.title,
            }))
          : []
      );
    })();
  }, [isMounted, start]);

  return (
    <DiscoverDrilldownConfig
      activeIndexPatternId={config.indexPatternId}
      indexPatterns={indexPatterns}
      onIndexPatternSelect={(indexPatternId) => {
        onConfig({ ...config, indexPatternId });
      }}
      customIndexPattern={config.customIndexPattern}
      onCustomIndexPatternToggle={() =>
        onConfig({
          ...config,
          customIndexPattern: !config.customIndexPattern,
          indexPatternId: undefined,
        })
      }
      carryFiltersAndQuery={config.carryFiltersAndQuery}
      onCarryFiltersAndQueryToggle={() =>
        onConfig({
          ...config,
          carryFiltersAndQuery: !config.carryFiltersAndQuery,
        })
      }
      carryTimeRange={config.carryTimeRange}
      onCarryTimeRangeToggle={() =>
        onConfig({
          ...config,
          carryTimeRange: !config.carryTimeRange,
        })
      }
    />
  );
};
