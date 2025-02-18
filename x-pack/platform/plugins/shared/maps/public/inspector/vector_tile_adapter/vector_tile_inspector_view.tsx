/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { Adapters, InspectorViewProps } from '@kbn/inspector-plugin/public';
import { i18n } from '@kbn/i18n';
import { dynamic } from '@kbn/shared-ux-utility';

export const VectorTileInspectorView = {
  title: i18n.translate('xpack.maps.inspector.vectorTileViewTitle', {
    defaultMessage: 'Vector tiles',
  }),
  order: 10,
  help: i18n.translate('xpack.maps.inspector.vectorTileViewHelpText', {
    defaultMessage: 'View the vector tile search requests used to collect the data',
  }),
  shouldShow(adapters: Adapters) {
    return Boolean(adapters.vectorTiles?.hasLayers());
  },
  component: (props: InspectorViewProps) => {
    const Component = dynamic(async () => {
      const { VectorTileInspector } = await import('./components/vector_tile_inspector');
      return {
        default: VectorTileInspector,
      };
    });
    return <Component {...props} />;
  },
};
