/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import type { VisEditorOptionsProps } from '@kbn/visualizations-plugin/public';
import { VisTypeDefinition } from '@kbn/visualizations-plugin/public';
import { dynamic } from '@kbn/shared-ux-utility';
import { toExpressionAst } from './to_ast';
import { REGION_MAP_VIS_TYPE, RegionMapVisParams } from './types';

export const title = i18n.translate('xpack.maps.regionMapMap.vis.title', {
  defaultMessage: 'Region Map',
});

const LazyRegionMapEditor = function (props: VisEditorOptionsProps) {
  const Component = dynamic(async () => {
    const { RegionMapEditor } = await import('./region_map_editor');
    return {
      default: RegionMapEditor,
    };
  });
  return <Component {...props} />;
};

export const regionMapVisType = {
  name: REGION_MAP_VIS_TYPE,
  title,
  icon: 'visMapRegion',
  description: i18n.translate('xpack.maps.regionMap.vis.description', {
    defaultMessage: 'Show metrics on a thematic map.',
  }),
  editorConfig: {
    optionTabs: [
      {
        name: '',
        title: '',
        editor: LazyRegionMapEditor,
      },
    ],
  },
  visConfig: {
    defaults: {
      colorSchema: 'Yellow to Red',
      mapZoom: 2,
      mapCenter: [0, 0],
    },
  },
  toExpressionAst,
  requiresSearch: true,
  disableCreate: true,
} as VisTypeDefinition<RegionMapVisParams>;
