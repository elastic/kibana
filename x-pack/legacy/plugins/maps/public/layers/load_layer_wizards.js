/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { registerLayerWizard } from './layer_wizard_registry';
import { uploadLayerWizardConfig } from './sources/client_file_source';
import { esDocumentsLayerWizardConfig } from './sources/es_search_source';
import { clustersLayerWizardConfig, heatmapLayerWizardConfig } from './sources/es_geo_grid_source';
import { point2PointLayerWizardConfig } from './sources/es_pew_pew_source/es_pew_pew_source';
import { emsBoundariesLayerWizardConfig } from './sources/ems_file_source';
import { emsBaseMapLayerWizardConfig } from './sources/ems_tms_source';
import { kibanaRegionMapLayerWizardConfig } from './sources/kibana_regionmap_source';
import { kibanaBasemapLayerWizardConfig } from './sources/kibana_tilemap_source';
import { tmsLayerWizardConfig } from './sources/xyz_tms_source';
import { wmsLayerWizardConfig } from './sources/wms_source';

// Registration order determines display order
registerLayerWizard(uploadLayerWizardConfig);
registerLayerWizard(esDocumentsLayerWizardConfig);
registerLayerWizard(clustersLayerWizardConfig);
registerLayerWizard(heatmapLayerWizardConfig);
registerLayerWizard(point2PointLayerWizardConfig);
registerLayerWizard(emsBoundariesLayerWizardConfig);
registerLayerWizard(emsBaseMapLayerWizardConfig);
registerLayerWizard(kibanaRegionMapLayerWizardConfig);
registerLayerWizard(kibanaBasemapLayerWizardConfig);
registerLayerWizard(tmsLayerWizardConfig);
registerLayerWizard(wmsLayerWizardConfig);
