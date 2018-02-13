import { dirname, resolve } from 'path';
const ROOT = dirname(require.resolve('../../../package.json'));

export const UI_EXPORT_DEFAULTS = {
  webpackNoParseRules: [
    /node_modules[\/\\](angular|elasticsearch-browser)[\/\\]/,
    /node_modules[\/\\](mocha|moment)[\/\\]/
  ],

  webpackAliases: {
    ui: resolve(ROOT, 'src/ui/public'),
    ui_framework: resolve(ROOT, 'ui_framework'),
    test_harness: resolve(ROOT, 'src/test_harness/public'),
    querystring: 'querystring-browser',
    moment$: resolve(ROOT, 'webpackShims/moment'),
    'moment-timezone$': resolve(ROOT, 'webpackShims/moment-timezone')
  },

  translationPaths: [
    resolve(ROOT, 'src/ui/ui_i18n/translations/en.json'),
  ],

  appExtensions: {
    fieldFormatEditors: [
      'ui/field_format_editor/register'
    ],
    visRequestHandlers: [
      'ui/vis/request_handlers/courier',
      'ui/vis/request_handlers/none'
    ],
    visResponseHandlers: [
      'ui/vis/response_handlers/basic',
      'ui/vis/response_handlers/none',
      'ui/vis/response_handlers/tabify',
    ],
    visEditorTypes: [
      'ui/vis/editors/default/default',
    ],
    embeddableFactories: [
      'plugins/kibana/visualize/embeddable/visualize_embeddable_factory_provider',
      'plugins/kibana/discover/embeddable/search_embeddable_factory_provider',
    ]
  },
};
