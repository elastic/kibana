/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Subscription } from 'rxjs';
import type { CoreSetup, CoreStart, Plugin } from '@kbn/core/public';
import type { LensPublicSetup } from '@kbn/lens-plugin/public';
import {
  createExemplarsOverlayProvider,
  EXEMPLARS_FEATURE_FLAG,
  type Exemplar,
} from './exemplars_overlay_provider';

export interface MetricsExemplarsSetupDependencies {
  lens: LensPublicSetup;
}

export class MetricsExemplarsPlugin
  implements Plugin<void, void, MetricsExemplarsSetupDependencies>
{
  private coreStart?: CoreStart;
  private isExemplarsEnabled = false;
  private featureFlagSubscription?: Subscription;

  public setup(_core: CoreSetup, { lens }: MetricsExemplarsSetupDependencies) {
    lens.registerXYOverlayProvider(
      createExemplarsOverlayProvider({
        isEnabled: () => this.isExemplarsEnabled,
        onExemplarClick: (exemplar) => {
          void this.openExemplarFlyout(exemplar);
        },
      })
    );
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
