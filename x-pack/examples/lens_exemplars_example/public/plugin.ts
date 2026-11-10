/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BehaviorSubject } from 'rxjs';
import type { Plugin, CoreSetup } from '@kbn/core/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { LensPublicSetup, LensPublicStart } from '@kbn/lens-plugin/public';
import type { DeveloperExamplesSetup } from '@kbn/developer-examples-plugin/public';
import { createExemplarsExtension, EXEMPLARS_APP_ID, type Exemplar } from './exemplars_extension';
import { mount } from './mount';

export interface SetupDependencies {
  developerExamples: DeveloperExamplesSetup;
  lens: LensPublicSetup;
}

export interface StartDependencies {
  data: DataPublicPluginStart;
  lens: LensPublicStart;
}

export class LensExemplarsExamplePlugin
  implements Plugin<void, void, SetupDependencies, StartDependencies>
{
  private readonly selectedExemplar$ = new BehaviorSubject<Exemplar | undefined>(undefined);

  public setup(core: CoreSetup<StartDependencies>, { developerExamples, lens }: SetupDependencies) {
    lens.registerExtension(
      createExemplarsExtension({
        onExemplarClick: (exemplar) => this.selectedExemplar$.next(exemplar),
      })
    );

    core.application.register({
      id: EXEMPLARS_APP_ID,
      title: 'Lens exemplars example',
      visibleIn: [],
      mount: mount(core, this.selectedExemplar$),
    });

    developerExamples.register({
      appId: EXEMPLARS_APP_ID,
      title: 'Lens exemplars',
      description:
        'Register a Lens extension that draws clickable exemplars over XY charts at render time, without storing anything in the chart.',
      links: [
        {
          label: 'README',
          href: 'https://github.com/elastic/kibana/tree/main/x-pack/examples/lens_exemplars_example',
          iconType: 'logoGithub',
          target: '_blank',
        },
      ],
    });
  }

  public start() {}

  public stop() {}
}
