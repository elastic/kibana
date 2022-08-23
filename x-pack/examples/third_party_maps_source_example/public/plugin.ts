/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreSetup, Plugin } from '@kbn/core/public';
import { MapsCustomRasterSourcePluginSetup, MapsCustomRasterSourcePluginStart } from './types';
import { CustomRasterSource } from './classes/custom_raster_source';
import { customRasterLayerWizard } from './classes/custom_raster_layer_wizard';
import { PLUGIN_ID, PLUGIN_NAME } from '../common';
import image from './third_party_maps_source_example.png';

export class MapsCustomRasterSourcePlugin
  implements
    Plugin<void, void, MapsCustomRasterSourcePluginSetup, MapsCustomRasterSourcePluginStart>
{
  public setup(
    core: CoreSetup<MapsCustomRasterSourcePluginStart>,
    { developerExamples, maps: mapsSetup }: MapsCustomRasterSourcePluginSetup
  ) {
    // Register the Custom raster layer wizard with the Maps application
    mapsSetup.registerSource({
      type: CustomRasterSource.type,
      ConstructorFunction: CustomRasterSource,
    });
    mapsSetup.registerLayerWizard(customRasterLayerWizard);

    // Register an application into the side navigation menu
    core.application.register({
      id: PLUGIN_ID,
      title: PLUGIN_NAME,
      mount: ({ history }) => {
        (async () => {
          const [coreStart] = await core.getStartServices();
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
      description: 'Example of using a third-party custom source with Elastic Maps',
      image,
      links: [
        {
          label: 'README',
          href: 'https://github.com/elastic/kibana/tree/main/x-pack/examples/third_party_maps_source_example',
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
