/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { htmlIdGenerator, useEuiTheme } from '@elastic/eui';
import type { CoreStart, StartServicesAccessor } from '@kbn/core/public';
import type { LocatorPublic } from '@kbn/share-plugin/common';
import type { SerializableRecord } from '@kbn/utility-types';
import type { LayerWizard, RenderWizardArguments } from '@kbn/maps-plugin/public';
import { LAYER_TYPE } from '@kbn/maps-plugin/common';
import type { VectorLayerDescriptor } from '@kbn/maps-plugin/common/descriptor_types';
import { ML_APP_LOCATOR } from '@kbn/ml-common-types/locator_app_locator';
import { ML_PAGES } from '@kbn/ml-common-types/locator_ml_pages';

import type { MlPluginStart, MlStartDependencies } from '../plugin';

import { getActualStyle } from './util';
import { CreateAnomalySourceEditor } from './create_anomaly_source_editor';
import type { AnomalySourceDescriptor } from './anomaly_source';
import { AnomalySource } from './anomaly_source';
import { anomalyLayerWizard } from './anomaly_layer_wizard';

export const ML_ANOMALY = 'ML_ANOMALIES';

const AnomalySourceEditorWithTheme: React.FC<{
  coreStart: CoreStart;
  jobsManagementPath?: string;
  canCreateJobs: boolean;
  previewLayers: (layers: VectorLayerDescriptor[]) => void;
}> = ({ coreStart, jobsManagementPath, canCreateJobs, previewLayers }) => {
  const { euiTheme } = useEuiTheme();

  const handleSourceConfigChange = (sourceConfig: Partial<AnomalySourceDescriptor> | null) => {
    if (!sourceConfig) {
      previewLayers([]);
      return;
    }

    const anomalyLayerDescriptor: VectorLayerDescriptor = {
      id: htmlIdGenerator()(),
      type: LAYER_TYPE.GEOJSON_VECTOR,
      sourceDescriptor: AnomalySource.createDescriptor({
        jobId: sourceConfig.jobId,
        typicalActual: sourceConfig.typicalActual,
      }),
      style: getActualStyle(euiTheme) as VectorLayerDescriptor['style'],
    };

    previewLayers([anomalyLayerDescriptor]);
  };

  return (
    <CreateAnomalySourceEditor
      onSourceConfigChange={handleSourceConfigChange}
      coreStart={coreStart}
      jobsManagementPath={jobsManagementPath}
      canCreateJobs={canCreateJobs}
    />
  );
};

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
    let jobsManagementPath: string | undefined;
    if (mlLocator) {
      jobsManagementPath = await mlLocator.getUrl({
        page: ML_PAGES.ANOMALY_DETECTION_JOBS_MANAGE,
      });
    } else {
      // eslint-disable-next-line no-console
      console.error('Unable to get job management path.');
    }
    anomalyLayerWizard.getIsDisabled = () => !this.canGetJobs;

    anomalyLayerWizard.renderWizard = ({ previewLayers }: RenderWizardArguments) => {
      return (
        <AnomalySourceEditorWithTheme
          coreStart={coreStart}
          jobsManagementPath={jobsManagementPath}
          canCreateJobs={this.canCreateJobs}
          previewLayers={previewLayers}
        />
      );
    };

    return anomalyLayerWizard as LayerWizard;
  }
}
