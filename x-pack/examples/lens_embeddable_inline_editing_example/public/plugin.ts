/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Plugin, CoreSetup } from '@kbn/core/public';
import type { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import type { UiActionsStart } from '@kbn/ui-actions-plugin/public';
import { LensPublicStart } from '@kbn/lens-plugin/public';
import { DeveloperExamplesSetup } from '@kbn/developer-examples-plugin/public';
import { mount } from './mount';
import image from './image.png';

export interface SetupDependencies {
  developerExamples: DeveloperExamplesSetup;
}

export interface StartDependencies {
  dataViews: DataViewsPublicPluginStart;
  lens: LensPublicStart;
  uiActions: UiActionsStart;
}

export class LensInlineEditingPlugin
  implements Plugin<void, void, SetupDependencies, StartDependencies>
{
  public setup(core: CoreSetup<StartDependencies>, { developerExamples }: SetupDependencies) {
    core.application.register({
      id: 'lens_embeddable_inline_editing_example',
      title: 'Lens inline editing embeddable',
      visibleIn: [],
      mount: mount(core),
    });

    developerExamples.register({
      appId: 'lens_embeddable_inline_editing_example',
      title: 'Lens inline editing embeddable',
      description: 'Inline editing of a Lens embeddable examples',
      links: [
        {
          label: 'README',
          href: 'https://github.com/elastic/kibana/tree/main/x-pack/examples/lens_embeddable_inline_editing_example',
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
