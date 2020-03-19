/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import theme from '@elastic/eui/dist/eui_theme_light.json';
import { i18n } from '@kbn/i18n';
import { ElementDefinition } from 'cytoscape';
import { find, isEqual } from 'lodash';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react';
import { isValidPlatinumLicense } from '../../../../../../../plugins/apm/common/service_map';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { ServiceMapAPIResponse } from '../../../../../../../plugins/apm/server/lib/service_map/get_service_map';
import { useApmPluginContext } from '../../../hooks/useApmPluginContext';
import { useDeepObjectIdentity } from '../../../hooks/useDeepObjectIdentity';
import { useLicense } from '../../../hooks/useLicense';
import { useLoadingIndicator } from '../../../hooks/useLoadingIndicator';
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

const MAX_REQUESTS = 5;

export function ServiceMap({ serviceName }: ServiceMapProps) {
  const license = useLicense();
  const { search } = useLocation();
  const { urlParams, uiFilters } = useUrlParams();
  const { notifications } = useApmPluginContext().core;
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

  const renderedElements = useRef<ElementDefinition[]>([]);

  const [responses, setResponses] = useState<ServiceMapAPIResponse[]>([]);

  const { setIsLoading } = useLoadingIndicator();

  const [, _setUnusedState] = useState(false);

  const elements = useMemo(() => getCytoscapeElements(responses, search), [
    responses,
    search
  ]);

  const forceUpdate = useCallback(() => _setUnusedState(value => !value), []);

  const getNext = useCallback(
    async (input: { reset?: boolean; after?: string | undefined }) => {
      const { start, end, uiFilters: strippedUiFilters, ...query } = params;

      if (input.reset) {
        renderedElements.current = [];
        setResponses([]);
      }

      if (start && end) {
        setIsLoading(true);
        try {
          const data = await callApmApi({
            pathname: '/api/apm/service-map',
            params: {
              query: {
                ...query,
                start,
                end,
                uiFilters: JSON.stringify(strippedUiFilters),
                after: input.after
              }
            }
          });
          setResponses(resp => resp.concat(data));

          const shouldGetNext =
            responses.length + 1 < MAX_REQUESTS && data.after;

          if (shouldGetNext) {
            await getNext({ after: data.after });
          } else {
            setIsLoading(false);
          }
        } catch (error) {
          setIsLoading(false);
          notifications.toasts.addError(error, {
            title: i18n.translate('xpack.apm.errorServiceMapData', {
              defaultMessage: `Error loading service connections`
            })
          });
        }
      }
    },
    [params, setIsLoading, responses.length, notifications.toasts]
  );

  useEffect(() => {
    const loadServiceMaps = async () => {
      await getNext({ reset: true });
    };

    loadServiceMaps();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  useEffect(() => {
    if (renderedElements.current.length === 0) {
      renderedElements.current = elements;
      return;
    }

    const newElements = elements.filter(element => {
      return !find(renderedElements.current, el => isEqual(el, element));
    });

    if (newElements.length > 0 && renderedElements.current.length > 0) {
      renderedElements.current = elements;
      forceUpdate();
    }
  }, [elements, forceUpdate]);

  const { ref: wrapperRef, width, height } = useRefDimensions();

  if (!license) {
    return null;
  }

  return isValidPlatinumLicense(license) ? (
    <div
      style={{ height: height - parseInt(theme.gutterTypes.gutterLarge, 10) }}
      ref={wrapperRef}
    >
      <Cytoscape
        elements={renderedElements.current}
        serviceName={serviceName}
        height={height}
        width={width}
        style={cytoscapeDivStyle}
      >
        <Controls />
        {serviceName && <EmptyBanner />}
        <Popover focusedServiceName={serviceName} />
      </Cytoscape>
    </div>
  ) : (
    <PlatinumLicensePrompt />
  );
}
