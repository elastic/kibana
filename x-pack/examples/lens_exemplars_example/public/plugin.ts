/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Subscription } from 'rxjs';
import type { Plugin, CoreSetup, CoreStart } from '@kbn/core/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { LensPublicSetup, LensPublicStart } from '@kbn/lens-plugin/public';
import type { DeveloperExamplesSetup } from '@kbn/developer-examples-plugin/public';
import {
  createExemplarsOverlayProvider,
  EXEMPLARS_APP_ID,
  EXEMPLARS_FEATURE_FLAG,
  type Exemplar,
} from './exemplars_overlay_provider';
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
  private coreStart?: CoreStart;
  private isExemplarsEnabled = false;
  private featureFlagSubscription?: Subscription;

  public setup(core: CoreSetup<StartDependencies>, { developerExamples, lens }: SetupDependencies) {
    lens.registerXYOverlayProvider(
      createExemplarsOverlayProvider({
        onExemplarClick: (exemplar) => {
          void this.openExemplarFlyout(exemplar);
        },
        isEnabled: () => this.isExemplarsEnabled,
      })
    );

    core.application.register({
      id: EXEMPLARS_APP_ID,
      title: 'Lens exemplars example',
      visibleIn: [],
      mount: mount(core),
    });

    developerExamples.register({
      appId: EXEMPLARS_APP_ID,
      title: 'Lens exemplars',
      description:
        'Register a Lens XY overlay provider that draws clickable exemplars on top of XY charts at render time, without storing anything in the chart.',
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

  public start(core: CoreStart) {
    this.coreStart = core;
    this.featureFlagSubscription = core.featureFlags
      .getBooleanValue$(EXEMPLARS_FEATURE_FLAG, false)
      .subscribe((enabled) => {
        this.isExemplarsEnabled = enabled;
      });
  }

  public stop() {
    this.featureFlagSubscription?.unsubscribe();
  }

  private async openExemplarFlyout(exemplar: Exemplar) {
    if (!this.coreStart) {
      return;
    }
    const { openExemplarFlyout } = await import('./exemplar_flyout');
    openExemplarFlyout(this.coreStart, exemplar);
  }
}
