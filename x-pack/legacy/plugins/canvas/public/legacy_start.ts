/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// TODO: These are legacy imports.  We should work to have all of these come from New Platform
// Import the uiExports that the application uses
// These will go away as these plugins are converted to NP
import 'ui/autoload/all';
import 'uiExports/visTypes';
import 'uiExports/visResponseHandlers';
import 'uiExports/visRequestHandlers';
import 'uiExports/savedObjectTypes';
import 'uiExports/spyModes';
import 'uiExports/embeddableFactories';
import 'uiExports/interpreter';

// TODO: These dependencies should be moved into plugin startup methods
// Load the interpreter so that the kbnInterpreter global will be available when plugins load
import 'plugins/interpreter/interpreter';
// Load our app component to initialize registries
import './components/app';

// load application code
import 'uiExports/canvas';

import { PluginInitializerContext } from '../../../../../src/core/public';
import { plugin } from './';
import { getCoreStart, getStartPlugins, getSetupPlugins, getCoreSetup } from './legacy';
const pluginInstance = plugin({} as PluginInitializerContext);

// Setup and Startup the plugin
export const setup = pluginInstance.setup(getCoreSetup(), getSetupPlugins());
export const start = pluginInstance.start(getCoreStart(), getStartPlugins());
