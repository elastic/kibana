/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Plugin, CoreSetup, AppNavLinkStatus } from '@kbn/core/public';
import { DataPublicPluginStart } from '@kbn/data-plugin/public';
import { LensPublicStart } from '@kbn/lens-plugin/public';
import { DeveloperExamplesSetup } from '@kbn/developer-examples-plugin/public';
import { mount } from './mount';
import image from './image.png';

export interface SetupDependencies {
  developerExamples: DeveloperExamplesSetup;
}

export interface StartDependencies {
  data: DataPublicPluginStart;
  lens: LensPublicStart;
}

export class EmbeddedLensExamplePlugin
  implements Plugin<void, void, SetupDependencies, StartDependencies>
{
  public setup(core: CoreSetup<StartDependencies>, { developerExamples }: SetupDependencies) {
    core.application.register({
      id: 'enhancedLensEmbeddable',
      title: 'Enhanced Lens embedded example',
      navLinkStatus: AppNavLinkStatus.hidden,
      mount: mount(core),
    });

    developerExamples.register({
      appId: 'enhancedLensEmbeddable',
      title: 'Enhanced Embedded Lens',
      description:
        'Embed Lens visualizations into other applications and link to a pre-configured Lens editor to allow users to use visualizations in your app as starting points for further explorations.',
      links: [
        {
          label: 'README',
          href: 'https://github.com/elastic/kibana/tree/main/x-pack/examples/enhance_lens_embedded_example',
          iconType: 'logoGithub',
          size: 's',
          target: '_blank',
        },
      ],
      image,
    });
  }

  public start() {}

  public stop() {}
}
