/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import './kibana_services';

import './layers/layer_wizard_registry';
import './layers/sources/source_registry';
import './layers/sources/ems_file_source';
import './layers/sources/ems_tms_source';
import './layers/sources/client_file_source';
import './layers/sources/xyz_tms_source';
import './layers/sources/wms_source';
import './layers/sources/kibana_tilemap_source';
import './layers/sources/kibana_regionmap_source';
import './layers/sources/es_geo_grid_source';
import './layers/sources/es_search_source';
import './layers/sources/es_pew_pew_source/es_pew_pew_source';

// import the uiExports that we want to "use"
import 'uiExports/inspectorViews';
import 'uiExports/search';
import 'uiExports/embeddableFactories';
import 'uiExports/embeddableActions';

import 'ui/autoload/all';
import 'react-vis/dist/style.css';

import './angular/services/gis_map_saved_object_loader';
import './angular/map_controller';
import './routes';
// @ts-ignore
import { PluginInitializerContext } from 'kibana/public';
import { MapsPlugin } from './plugin';

export const plugin = (initializerContext: PluginInitializerContext) => {
  return new MapsPlugin();
};
