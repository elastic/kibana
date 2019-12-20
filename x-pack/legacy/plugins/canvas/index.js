/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { resolve } from 'path';
import { init } from './init';
import { mappings } from './server/mappings';
import { CANVAS_APP, CANVAS_TYPE, CUSTOM_ELEMENT_TYPE } from './common/lib';
import { migrations } from './migrations';

export const AppCategoryObj = {
  analyze: 'analyze',
  observability: 'observability',
  security: 'security',
  management: 'management',
};

export function canvas(kibana) {
  return new kibana.Plugin({
    id: CANVAS_APP,
    configPrefix: 'xpack.canvas',
    require: ['kibana', 'elasticsearch', 'xpack_main', 'interpreter'],
    publicDir: resolve(__dirname, 'public'),
    uiExports: {
      app: {
        title: 'Canvas',
        description: 'Data driven workpads',
        icon: 'plugins/canvas/icon.svg',
        euiIconType: 'canvasApp',
        main: 'plugins/canvas/legacy_start',
        category: AppCategoryObj.analyze,
      },
      interpreter: [
        'plugins/canvas/browser_functions',
        'plugins/canvas/renderers',
        'plugins/canvas/interpreter_expression_types',
      ],
      styleSheetPaths: resolve(__dirname, 'public/style/index.scss'),
      hacks: [
        // window.onerror override
        'plugins/canvas/lib/window_error_handler.js',
      ],
      home: ['plugins/canvas/register_feature'],
      mappings,
      migrations,
      savedObjectsManagement: {
        [CANVAS_TYPE]: {
          icon: 'canvasApp',
          defaultSearchField: 'name',
          isImportableAndExportable: true,
          getTitle(obj) {
            return obj.attributes.name;
          },
          getInAppUrl(obj) {
            return {
              path: `/app/canvas#/workpad/${encodeURIComponent(obj.id)}`,
              uiCapabilitiesPath: 'canvas.show',
            };
          },
        },
        [CUSTOM_ELEMENT_TYPE]: {
          icon: 'canvasApp',
          defaultSearchField: 'name',
          isImportableAndExportable: true,
          getTitle(obj) {
            return obj.attributes.displayName;
          },
        },
      },
    },

    config: Joi => {
      return Joi.object({
        enabled: Joi.boolean().default(true),
        indexPrefix: Joi.string().default('.canvas'),
      }).default();
    },

    init,
  });
}
