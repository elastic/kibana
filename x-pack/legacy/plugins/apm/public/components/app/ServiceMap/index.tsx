/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import theme from '@elastic/eui/dist/eui_theme_light.json';
import { useUrlParams } from '../../../hooks/useUrlParams';
import { useFetcher } from '../../../hooks/useFetcher';
import { Cytoscape } from './Cytoscape';
import { Controls } from './Controls';

interface ServiceMapProps {
  serviceName?: string;
}

const cytoscapeDivStyle = {
  height: '85vh',
  background: `linear-gradient(
  90deg,
  ${theme.euiPageBackgroundColor}
    calc(${theme.euiSizeL} - calc(${theme.euiSizeXS} / 2)),
  transparent 1%
)
center,
linear-gradient(
  ${theme.euiPageBackgroundColor}
    calc(${theme.euiSizeL} - calc(${theme.euiSizeXS} / 2)),
  transparent 1%
)
center,
${theme.euiColorLightShade}`,
  backgroundSize: `${theme.euiSizeL} ${theme.euiSizeL}`,
  margin: `-${theme.gutterTypes.gutterLarge}`
};

export function ServiceMap({ serviceName }: ServiceMapProps) {
  const {
    urlParams: { start, end }
  } = useUrlParams();

  const { data } = useFetcher(
    callApmApi => {
      if (start && end) {
        return callApmApi({
          pathname: '/api/apm/service-map',
          params: { query: { start, end } }
        });
      }
    },
    [start, end]
  );

  const elements = Array.isArray(data) ? data : [];

  return (
    <Cytoscape
      elements={elements}
      serviceName={serviceName}
      style={cytoscapeDivStyle}
    >
      <Controls />
    </Cytoscape>
  );
}
