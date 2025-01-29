/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { Adapters } from '@kbn/inspector-plugin/public';
import { i18n } from '@kbn/i18n';
import { dynamic } from '@kbn/shared-ux-utility';

export const MapInspectorView = {
  title: i18n.translate('xpack.maps.inspector.mapDetailsViewTitle', {
    defaultMessage: 'Map details',
  }),
  order: 30,
  help: i18n.translate('xpack.maps.inspector.mapDetailsViewHelpText', {
    defaultMessage: 'View the map state',
  }),
  shouldShow(adapters: Adapters) {
    return Boolean(adapters.map);
  },
  component: (props: { adapters: Adapters }) => {
    const Component = dynamic(async () => {
      const { MapViewComponent } = await import('./map_view_component');
      return {
        default: MapViewComponent,
      };
    });
    return <Component {...props} />;
  },
};
