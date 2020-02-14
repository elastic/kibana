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
import { PlatinumLicensePrompt } from './PlatinumLicensePrompt';
import { Popover } from './Popover';
import { useRefHeight } from './useRefHeight';
import { useLoadingIndicator } from '../../../hooks/useLoadingIndicator';

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
    [params, setIsLoading, callApmApi, responses.length, notifications.toasts]
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

    const updateMap = () => {
      renderedElements.current = elements;
      if (openToast.current) {
        notifications.toasts.remove(openToast.current);
      }
      forceUpdate();
    };

    if (newElements.length > 0 && renderedElements.current.length > 0) {
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
  }, [elements]);

  const isValidPlatinumLicense =
    license?.isActive &&
    (license?.type === 'platinum' || license?.type === 'trial');

  const [wrapperRef, height] = useRefHeight();

  return isValidPlatinumLicense ? (
    <div
      style={{ height: height - parseInt(theme.gutterTypes.gutterLarge, 10) }}
      ref={wrapperRef}
    >
      <Cytoscape
        elements={renderedElements.current}
        serviceName={serviceName}
        height={height}
        style={cytoscapeDivStyle}
      >
        <Controls />
        <Popover focusedServiceName={serviceName} />
      </Cytoscape>
    </div>
  ) : (
    <PlatinumLicensePrompt />
  );
}
