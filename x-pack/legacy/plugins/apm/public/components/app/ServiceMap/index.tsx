/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiPanel } from '@elastic/eui';
import React from 'react';
import { useFetcher } from '../../../hooks/useFetcher';
import { loadServiceMap } from '../../../services/rest/apm/services';
import { MapOfServices } from './MapOfServices';
import { useUrlParams } from '../../../hooks/useUrlParams';

const initalData = {
  items: [],
  hasHistoricalData: true,
  hasLegacyData: false
};

interface Props {
  global?: boolean;
  layout?: string;
}

export function ServiceMap({ global = false, layout = 'circle' }: Props) {
  // console.log(global);
  const {
    urlParams: { start, end, serviceName },
    uiFilters
  } = useUrlParams();

  const { data = initalData } = useFetcher(() => {
    if (start && end) {
      return loadServiceMap({
        start,
        end,
        // TODO: i did this because useUrlParams() does not return
        // the right service name when used at the higher level
        serviceName: global ? undefined : serviceName,
        uiFilters
      });
    }
  }, [start, end, uiFilters]);

  return (
    <EuiPanel>
      {data.map ? (
        <MapOfServices connections={data.map.conns} layout={layout} />
      ) : null}
    </EuiPanel>
  );
}
