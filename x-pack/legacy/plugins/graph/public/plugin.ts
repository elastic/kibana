/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// import the uiExports that we want to "use"
import 'uiExports/fieldFormats';
import 'uiExports/savedObjectTypes';

import 'ui/autoload/all';
import 'ui/kbn_top_nav';
import 'ui/directives/saved_object_finder';
import 'ui/directives/input_focus';
import 'ui/saved_objects/ui/saved_object_save_as_checkbox';
import 'uiExports/autocompleteProviders';
import chrome from 'ui/chrome';
import { uiModules } from 'ui/modules';
import uiRoutes from 'ui/routes';
import { addAppRedirectMessageToUrl, fatalError, toastNotifications } from 'ui/notify';
import { formatAngularHttpError } from 'ui/notify/lib';
import { setup as data } from '../../../../../src/legacy/core_plugins/data/public/legacy';
import { SavedObjectsClientProvider } from 'ui/saved_objects';
import { KibanaParsedUrl } from 'ui/url/kibana_parsed_url';
import { npStart } from 'ui/new_platform';
import { SavedObjectRegistryProvider } from 'ui/saved_objects/saved_object_registry';
import { capabilities } from 'ui/capabilities';
import { showSaveModal } from 'ui/saved_objects/show_saved_object_save_modal';

import { xpackInfo } from 'plugins/xpack_main/services/xpack_info';

import { CoreSetup } from 'src/core/public';

export class GraphPlugin {
  setup(core: CoreSetup) {
    core.application.register({
      id: 'angularDemo',
      title: 'Angular Demo',
      async mount(context, params) {
        const { renderApp } = await import('./render_app');
        return renderApp(context, params);
      },
    });
  }

  start() {}

  stop() {}
}
