/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import '../../../../plugins/maps/public/kibana_services';

// import the uiExports that we want to "use"
import 'uiExports/inspectorViews';
import 'uiExports/search';
import 'uiExports/embeddableFactories';
import 'uiExports/embeddableActions';

import 'ui/autoload/all';
import 'react-vis/dist/style.css';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import '../../../../plugins/maps/public/angular/services/gis_map_saved_object_loader';
import './angular/map_controller';
import './routes';
// @ts-ignore
import { MapsPlugin } from './plugin';

export const plugin = () => {
  return new MapsPlugin();
};

// eslint-disable-next-line @kbn/eslint/no-restricted-paths
export {
  RenderTooltipContentParams,
  ITooltipProperty,
} from '../../../../plugins/maps/public/layers/tooltips/tooltip_property';
export { MapEmbeddable, MapEmbeddableInput } from '../../../../plugins/maps/public/embeddable';
