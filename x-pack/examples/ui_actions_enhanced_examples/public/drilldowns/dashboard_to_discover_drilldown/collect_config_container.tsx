/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState, useEffect } from 'react';
import useMountedState from 'react-use/lib/useMountedState';
import { CollectConfigProps } from './types';
import { DiscoverDrilldownConfig, IndexPatternItem } from './components/discover_drilldown_config';
import { Params } from './drilldown';

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
      const indexPatternSavedObjects = await start().plugins.data.indexPatterns.getCache();
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
