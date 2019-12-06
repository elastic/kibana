/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import './kibana_services';

import { wrapInI18nContext } from 'ui/i18n';

// import the uiExports that we want to "use"
import 'uiExports/inspectorViews';
import 'uiExports/search';
import 'uiExports/embeddableFactories';
import 'uiExports/embeddableActions';
import 'ui/agg_types';

import 'ui/kbn_top_nav';
// @ts-ignore
import { uiModules } from 'ui/modules';
import 'ui/autoload/all';
import 'react-vis/dist/style.css';

import './angular/services/gis_map_saved_object_loader';
import './angular/map_controller';
// @ts-ignore
import { MapsPlugin } from './plugin';
// @ts-ignore
import { MapListing } from './components/map_listing';
// @ts-ignore
import { initRoutes } from './routes';

const app = uiModules.get('app/maps', ['ngRoute', 'react']);

app.directive('mapListing', function(reactDirective: any) {
  return reactDirective(wrapInI18nContext(MapListing));
});

initRoutes();

export function plugin() {
  return new MapsPlugin();
}
