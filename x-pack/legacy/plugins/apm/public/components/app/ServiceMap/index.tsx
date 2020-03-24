/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import theme from '@elastic/eui/dist/eui_theme_light.json';
import React from 'react';
import {
  invalidLicenseMessage,
  isValidPlatinumLicense
} from '../../../../../../../plugins/apm/common/service_map';
import { useFetcher } from '../../../hooks/useFetcher';
import { useLicense } from '../../../hooks/useLicense';
import { useUrlParams } from '../../../hooks/useUrlParams';
import { callApmApi } from '../../../services/rest/createCallApmApi';
import { LicensePrompt } from '../../shared/LicensePrompt';
import { Controls } from './Controls';
import { Cytoscape } from './Cytoscape';
import { cytoscapeDivStyle } from './cytoscapeOptions';
import { EmptyBanner } from './EmptyBanner';
import { Popover } from './Popover';
import { useRefDimensions } from './useRefDimensions';
import { BetaBadge } from './BetaBadge';

interface ServiceMapProps {
  serviceName?: string;
}

export function ServiceMap({ serviceName }: ServiceMapProps) {
  const license = useLicense();
  const { urlParams, uiFilters } = useUrlParams();

  const { data } = useFetcher(() => {
    const { start, end, environment } = urlParams;
    if (start && end) {
      return callApmApi({
        pathname: '/api/apm/service-map',
        params: {
          query: {
            start,
            end,
            environment,
            serviceName,
            uiFilters: JSON.stringify({
              ...uiFilters,
              environment: undefined
            })
          }
        }
      });
    }
  }, [serviceName, uiFilters, urlParams]);

  const { ref, height, width } = useRefDimensions();

  if (!license) {
    return null;
  }

  return isValidPlatinumLicense(license) ? (
    <div
      style={{ height: height - parseInt(theme.gutterTypes.gutterLarge, 10) }}
      ref={ref}
    >
      <Cytoscape
        elements={data?.elements ?? []}
        height={height}
        serviceName={serviceName}
        style={cytoscapeDivStyle}
        width={width}
      >
        <Controls />
        <BetaBadge />
        {serviceName && <EmptyBanner />}
        <Popover focusedServiceName={serviceName} />
      </Cytoscape>
    </div>
  ) : (
    <EuiFlexGroup
      alignItems="center"
      justifyContent="spaceAround"
      // Set the height to give it some top margin
      style={{ height: '60vh' }}
    >
      <EuiFlexItem
        grow={false}
        style={{ width: 600, textAlign: 'center' as const }}
      >
        <LicensePrompt text={invalidLicenseMessage} showBetaBadge />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
