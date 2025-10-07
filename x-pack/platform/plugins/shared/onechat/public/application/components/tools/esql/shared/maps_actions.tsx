/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiButtonIcon, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/css';
import { i18n } from '@kbn/i18n';
import type { MapAttributes } from '@kbn/maps-plugin/server';
import type { MapEmbeddableState } from '@kbn/maps-plugin/common';
import type { UiActionsStart } from '@kbn/ui-actions-plugin/public';
import type { MapsAppLocator } from '@kbn/maps-plugin/public/locators/map_locator/types';
import { MAPS_APP_LOCATOR } from '@kbn/maps-plugin/public';
import { useOnechatServices } from '../../../../hooks/use_onechat_service';
import { useKibana } from '../../../../hooks/use_kibana';
import { actionsContainer } from './styles';

interface Props {
  uiActions: UiActionsStart;
  mapInput: MapEmbeddableState | undefined;
  mapConfig: MapAttributes;
  setMapInput: (input: MapEmbeddableState) => void;
}

const editInMapsLabel = i18n.translate('xpack.onechat.visualization.editInMapsButtonAriaLabel', {
  defaultMessage: 'Edit in Maps',
});

export function MapsActions({ mapConfig }: Props) {
  const { euiTheme } = useEuiTheme();
  const {
    startDependencies: { share },
  } = useOnechatServices();
  const {
    services: { application },
  } = useKibana();

  const {
    url: { locators },
  } = share;

  const mapsLocator = useMemo(
    () => locators.get(MAPS_APP_LOCATOR) as MapsAppLocator | undefined,
    [locators]
  );

  const mapsUrl = useMemo(async () => {
    if (!mapsLocator || !mapConfig?.layers) return undefined;

    const location = await mapsLocator.getLocation({
      initialLayers: mapConfig.layers as any,
      ...(mapConfig.filters ? { filters: mapConfig.filters } : {}),
      ...(mapConfig.query ? { query: mapConfig.query } : {}),
      ...(mapConfig.timeFilters ? { timeRange: mapConfig.timeFilters } : {}),
    });

    return application.getUrlForApp(location.app, {
      path: location.path,
    });
  }, [mapsLocator, mapConfig, application]);

  const [url, setUrl] = React.useState<string | undefined>(undefined);

  React.useEffect(() => {
    mapsUrl.then(setUrl);
  }, [mapsUrl]);

  if (!url) {
    return null;
  }

  const containerCss = css([
    actionsContainer(euiTheme),
    {
      right: '73px',
      top: '0px',
    },
  ]);

  return (
    <div
      className={`visualization-button-actions ${containerCss}`}
      data-test-subj="visualizationButtonActions"
    >
      <EuiButtonIcon
        display="base"
        color="text"
        size="s"
        iconType="pencil"
        aria-label={editInMapsLabel}
        href={url}
        target="_blank"
      />
    </div>
  );
}
