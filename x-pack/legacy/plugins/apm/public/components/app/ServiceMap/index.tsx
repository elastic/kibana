/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import theme from '@elastic/eui/dist/eui_theme_light.json';
import React, { useMemo } from 'react';
import { useFetcher } from '../../../hooks/useFetcher';
import { useLicense } from '../../../hooks/useLicense';
import { useUrlParams } from '../../../hooks/useUrlParams';
import { Controls } from './Controls';
import { Cytoscape } from './Cytoscape';
import { PlatinumLicensePrompt } from './PlatinumLicensePrompt';
import { useApmPluginContext } from '../../../hooks/useApmPluginContext';
import { callApi } from '../../../services/rest/callApi';

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
    urlParams: { start, end, environment },
    uiFilters
  } = useUrlParams();

  const uiFiltersOmitEnv = useMemo(
    () => ({
      ...uiFilters,
      environment: undefined
    }),
    [uiFilters]
  );

  const { http } = useApmPluginContext().core;
  const { data: serviceMapStartResponse } = useFetcher(async () => {
    const response = await callApi<{
      taskStatus: 'initialized' | 'active';
    }>(http, {
      method: 'GET',
      pathname: `/api/apm/service-map-start-task`
    });
    return response;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [http]);

  const { data } = useFetcher(
    callApmApi => {
      if (start && end && serviceMapStartResponse) {
        return callApmApi({
          pathname: '/api/apm/service-map',
          params: {
            query: {
              start,
              end,
              environment,
              serviceName,
              uiFilters: JSON.stringify(uiFiltersOmitEnv)
            }
          }
        });
      }
    },
    [
      start,
      end,
      uiFiltersOmitEnv,
      environment,
      serviceName,
      serviceMapStartResponse
    ]
  );

  const elements = Array.isArray(data) ? data : [];
  const license = useLicense();
  const isValidPlatinumLicense =
    true ||
    (license?.isActive &&
      (license?.type === 'platinum' || license?.type === 'trial'));

  return (
    <>
      {isValidPlatinumLicense ? (
        <Cytoscape
          elements={elements}
          serviceName={serviceName}
          style={cytoscapeDivStyle}
        >
          <Controls />
        </Cytoscape>
      ) : (
        <PlatinumLicensePrompt />
      )}
    </>
  );
}
