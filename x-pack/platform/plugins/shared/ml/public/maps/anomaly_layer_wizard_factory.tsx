/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { ML_APP_LOCATOR } from '@kbn/ml-common-types/locator_app_locator';
import type { CoreStart, StartServicesAccessor } from '@kbn/core/public';
import type { LocatorPublic } from '@kbn/share-plugin/common';
import type { SerializableRecord } from '@kbn/utility-types';
import type { LayerWizard, RenderWizardArguments } from '@kbn/maps-plugin/public';
import type { MlPluginStart } from '@kbn/ml-plugin-contracts';

import type { MlStartDependencies } from '../plugin';

import { anomalyLayerWizard } from './anomaly_layer_wizard';
import { AnomalySourceEditorWithThemeLazy } from './anomaly_source_editor_with_theme_lazy';

export const ML_ANOMALY = 'ML_ANOMALIES';

export class AnomalyLayerWizardFactory {
  public readonly type = ML_ANOMALY;

  constructor(
    private getStartServices: StartServicesAccessor<MlStartDependencies, MlPluginStart>,
    private canGetJobs: boolean,
    private canCreateJobs: boolean
  ) {
    this.canGetJobs = canGetJobs;
    this.canCreateJobs = canCreateJobs;
  }

  private async getServices(): Promise<{
    coreStart: CoreStart;
    mlLocator?: LocatorPublic<SerializableRecord>;
  }> {
    const [coreStart, pluginStart] = await this.getStartServices();
    const mlLocator = pluginStart.share.url.locators.get(ML_APP_LOCATOR);

    return { coreStart, mlLocator };
  }

  public async create(): Promise<LayerWizard> {
    const { coreStart, mlLocator } = await this.getServices();

    anomalyLayerWizard.getIsDisabled = () => !this.canGetJobs;

    anomalyLayerWizard.renderWizard = ({ previewLayers }: RenderWizardArguments) => {
      return (
        <AnomalySourceEditorWithThemeLazy
          coreStart={coreStart}
          mlLocator={mlLocator}
          canCreateJobs={this.canCreateJobs}
          previewLayers={previewLayers}
        />
      );
    };

    return anomalyLayerWizard as LayerWizard;
  }
}
