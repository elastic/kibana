/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiButton } from '@elastic/eui';
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
import { toMountPoint } from '../../../../../../../../src/plugins/kibana_react/public';
import { ServiceMapAPIResponse } from '../../../../server/lib/service_map/get_service_map';
import { useApmPluginContext } from '../../../hooks/useApmPluginContext';
import { useCallApmApi } from '../../../hooks/useCallApmApi';
import { useDeepObjectIdentity } from '../../../hooks/useDeepObjectIdentity';
import { useLicense } from '../../../hooks/useLicense';
import { useLocation } from '../../../hooks/useLocation';
import { useUrlParams } from '../../../hooks/useUrlParams';
import { Controls } from './Controls';
import { Cytoscape } from './Cytoscape';
import { getCytoscapeElements } from './get_cytoscape_elements';
import { LoadingOverlay } from './LoadingOverlay';
import { PlatinumLicensePrompt } from './PlatinumLicensePrompt';
import { Popover } from './Popover';

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

const MAX_REQUESTS = 5;

export function ServiceMap({ serviceName }: ServiceMapProps) {
  const callApmApi = useCallApmApi();
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
  const openToast = useRef<string | null>(null);

  const [responses, setResponses] = useState<ServiceMapAPIResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [percentageLoaded, setPercentageLoaded] = useState(0);
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
          setIsLoading(false);

          const shouldGetNext =
            responses.length + 1 < MAX_REQUESTS && data.after;

          if (shouldGetNext) {
            setPercentageLoaded(value => value + 30); // increase loading bar 30%
            await getNext({ after: data.after });
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
    [callApmApi, params, responses.length, notifications.toasts]
  );

  useEffect(() => {
    const loadServiceMaps = async () => {
      setPercentageLoaded(5);
      await getNext({ reset: true });
      setPercentageLoaded(100);
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

    const updateMap = () => {
      renderedElements.current = elements;
      if (openToast.current) {
        notifications.toasts.remove(openToast.current);
      }
      forceUpdate();
    };

    if (newElements.length > 0 && percentageLoaded === 100) {
      openToast.current = notifications.toasts.add({
        title: i18n.translate('xpack.apm.newServiceMapData', {
          defaultMessage: `Newly discovered connections are available.`
        }),
        onClose: () => {
          openToast.current = null;
        },
        toastLifeTimeMs: 24 * 60 * 60 * 1000,
        text: toMountPoint(
          <EuiButton onClick={updateMap}>
            {i18n.translate('xpack.apm.updateServiceMap', {
              defaultMessage: 'Update map'
            })}
          </EuiButton>
        )
      }).id;
    }

    return () => {
      if (openToast.current) {
        notifications.toasts.remove(openToast.current);
      }
    };

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [elements, percentageLoaded]);

  const isValidPlatinumLicense =
    license?.isActive &&
    (license?.type === 'platinum' || license?.type === 'trial');

  return isValidPlatinumLicense ? (
    <LoadingOverlay isLoading={isLoading} percentageLoaded={percentageLoaded}>
      <Cytoscape
        elements={renderedElements.current}
        serviceName={serviceName}
        style={cytoscapeDivStyle}
      >
        <Controls />
        <Popover focusedServiceName={serviceName} />
      </Cytoscape>
    </LoadingOverlay>
  ) : (
    <PlatinumLicensePrompt />
  );
}
