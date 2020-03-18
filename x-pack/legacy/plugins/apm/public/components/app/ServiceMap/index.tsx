/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiBetaBadge } from '@elastic/eui';
import theme from '@elastic/eui/dist/eui_theme_light.json';
import { i18n } from '@kbn/i18n';
import { default as React, default as React, useMemo } from 'react';
import styled from 'styled-components';
import { isValidPlatinumLicense } from '../../../../../../../plugins/apm/common/service_map';
import { useDeepObjectIdentity } from '../../../hooks/useDeepObjectIdentity';
import { useFetcher } from '../../../hooks/useFetcher';
import { useLicense } from '../../../hooks/useLicense';
import { useLocation } from '../../../hooks/useLocation';
import { useUrlParams } from '../../../hooks/useUrlParams';
import { callApmApi } from '../../../services/rest/createCallApmApi';
import { Controls } from './Controls';
import { Cytoscape } from './Cytoscape';
import { EmptyBanner } from './EmptyBanner';
import { getCytoscapeElements } from './get_cytoscape_elements';
import { PlatinumLicensePrompt } from './PlatinumLicensePrompt';
import { Popover } from './Popover';
import { useRefDimensions } from './useRefDimensions';

interface ServiceMapProps {
  serviceName?: string;
}

const cytoscapeDivStyle = {
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
  margin: `-${theme.gutterTypes.gutterLarge}`,
  marginTop: 0
};
const BetaBadgeContainer = styled.div`
  right: ${theme.gutterTypes.gutterMedium};
  position: absolute;
  top: ${theme.gutterTypes.gutterSmall};
  z-index: 1; /* The element containing the cytoscape canvas has z-index = 0. */
`;
const MAX_REQUESTS = 5;

export function ServiceMap({ serviceName }: ServiceMapProps) {
  const license = useLicense();
  const { search } = useLocation();
  const { urlParams, uiFilters } = useUrlParams();
  const params = useDeepObjectIdentity({
    start: urlParams.start,
    end: urlParams.end,
    environment: urlParams.environment,
    serviceName,
    uiFilters: {
      ...uiFilters,
      environment: undefined
    }
  });

  const { data } = useFetcher(() => {
    const { start, end } = params;
    if (start && end) {
      return callApmApi({
        pathname: '/api/apm/service-map',
        params: {
          query: {
            ...params,
            start,
            end,
            uiFilters: JSON.stringify(params.uiFilters)
          }
        }
      });
    }
  }, [params]);

  const elements = useMemo(() => {
    return data ? getCytoscapeElements(data as any, search) : [];
  }, [data, search]);

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
        elements={elements}
        serviceName={serviceName}
        height={height}
        width={width}
        style={cytoscapeDivStyle}
      >
        <Controls />
        {serviceName && <EmptyBanner />}
        <Popover focusedServiceName={serviceName} />
        <BetaBadgeContainer>
          <EuiBetaBadge
            label={i18n.translate('xpack.apm.serviceMap.betaBadge', {
              defaultMessage: 'Beta'
            })}
            tooltipContent={i18n.translate(
              'xpack.apm.serviceMap.betaTooltipMessage',
              {
                defaultMessage:
                  'This feature is currently in beta. If you encounter any bugs or have feedback, please open an issue or visit our discussion forum.'
              }
            )}
          />
        </BetaBadgeContainer>
      </Cytoscape>
    </div>
  ) : (
    <PlatinumLicensePrompt />
  );
}
