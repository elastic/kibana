/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import 'ui/autoload/all';
import './angular/config';
import './angular/services';
import React from 'react';
import ReactDOM from 'react-dom';
import { i18n } from '@kbn/i18n';
import chrome from 'ui/chrome';
import { documentationLinks } from './lib/documentation_links';
import { CanvasRootController } from './angular/controllers';

// Import the uiExports that the application uses
import 'uiExports/visTypes';
import 'uiExports/visResponseHandlers';
import 'uiExports/visRequestHandlers';
import 'uiExports/visEditorTypes';
import 'uiExports/savedObjectTypes';
import 'uiExports/spyModes';
import 'uiExports/fieldFormats';
import 'uiExports/embeddableFactories';

// load application code
import './lib/load_expression_types';
import './lib/load_transitions';
import 'uiExports/canvas';

import { HelpMenu } from './components/help_menu/help_menu';

// load the application
chrome.setRootController('canvas', CanvasRootController);

// add Canvas docs to help menu in global nav
chrome.helpExtension.set({
  appName: i18n.translate('xpack.canvas.helpMenu.appName', {
    defaultMessage: 'Canvas',
  }),
  links: [
    {
      linkType: 'documentation',
      href: documentationLinks.canvas,
    },
  ],
  content: domNode => {
    ReactDOM.render(<HelpMenu />, domNode);
  },
});
