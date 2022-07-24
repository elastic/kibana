/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreSetup, Plugin } from '@kbn/core/public';
import { MapCustomRasterSourcePluginSetup, MapCustomRasterSourcePluginStart } from './types';
import { CustomRasterSource } from './classes/custom_raster_source';
import { customRasterLayerWizard } from './classes/custom_raster_layer_wizard';
import { PLUGIN_ID, PLUGIN_NAME } from '../common';

export class MapCustomRasterSourcePlugin
  implements Plugin<void, void, MapCustomRasterSourcePluginSetup, MapCustomRasterSourcePluginStart>
{
  public setup(
    core: CoreSetup<MapCustomRasterSourcePluginStart>,
    { developerExamples, maps: mapsSetup }: MapCustomRasterSourcePluginSetup
  ) {
    // Register the Custom raster layer wizard with the Maps application
    mapsSetup.registerSource({
      type: CustomRasterSource.type,
      ConstructorFunction: CustomRasterSource,
    });
    mapsSetup.registerLayerWizard(customRasterLayerWizard);

    // Register an application into the side navigation menu
    core.application.register({
      id: 'mapCustomRasterSource',
      title: PLUGIN_NAME,
      mount: ({ history }) => {
        (async () => {
          const [coreStart, { maps: mapsStart }] = await core.getStartServices();
          // if it's a regular navigation, open a new map
          if (history.action === 'PUSH') {
            coreStart.application.navigateToApp('maps', { path: 'map' });
          } else {
            coreStart.application.navigateToApp('developerExamples');
          }
        })();
        return () => {};
      },
    });

    developerExamples.register({
      appId: PLUGIN_ID,
      title: PLUGIN_NAME,
      description: 'Create a custom source to use with Elastic Maps',
      links: [
        {
          label: 'README',
          href: 'https://example.com',
          iconType: 'logoGithub',
          size: 's',
          target: '_blank',
        },
      ],
    });
  }

  public start() {}

  public stop() {}
}
