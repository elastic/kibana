/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { htmlIdGenerator, useEuiTheme } from '@elastic/eui';
import type { StartServicesAccessor } from '@kbn/core/public';
import type { LocatorPublic } from '@kbn/share-plugin/common';
import type { SerializableRecord } from '@kbn/utility-types';
import type { LayerWizard, RenderWizardArguments } from '@kbn/maps-plugin/public';
import { LAYER_TYPE } from '@kbn/maps-plugin/common';
import type { VectorLayerDescriptor } from '@kbn/maps-plugin/common/descriptor_types';
import { ML_APP_LOCATOR, ML_PAGES } from '../../common/constants/locator';
import { getActualStyle } from './util';
import { CreateAnomalySourceEditor } from './create_anomaly_source_editor';
import type { AnomalySourceDescriptor } from './anomaly_source';
import { AnomalySource } from './anomaly_source';

import { HttpService } from '../application/services/http_service';
import type { MlPluginStart, MlStartDependencies } from '../plugin';
import type { MlApi } from '../application/services/ml_api_service';

export const ML_ANOMALY = 'ML_ANOMALIES';

const AnomalySourceEditorWithTheme: React.FC<{
  mlJobsService: MlApi['jobs'];
  jobsManagementPath?: string;
  canCreateJobs: boolean;
  previewLayers: (layers: VectorLayerDescriptor[]) => void;
}> = ({ mlJobsService, jobsManagementPath, canCreateJobs, previewLayers }) => {
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
      mlJobsService={mlJobsService}
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
    mlJobsService: MlApi['jobs'];
    mlLocator?: LocatorPublic<SerializableRecord>;
  }> {
    const [coreStart, pluginStart] = await this.getStartServices();
    const { jobsApiProvider } = await import('../application/services/ml_api_service/jobs');

    const httpService = new HttpService(coreStart.http);
    const mlJobsService = jobsApiProvider(httpService);
    const mlLocator = pluginStart.share.url.locators.get(ML_APP_LOCATOR);

    return { mlJobsService, mlLocator };
  }

  public async create(): Promise<LayerWizard> {
    const { mlJobsService, mlLocator } = await this.getServices();
    let jobsManagementPath: string | undefined;
    if (mlLocator) {
      jobsManagementPath = await mlLocator.getUrl({
        page: ML_PAGES.ANOMALY_DETECTION_JOBS_MANAGE,
      });
    } else {
      // eslint-disable-next-line no-console
      console.error('Unable to get job management path.');
    }

    const { anomalyLayerWizard } = await import('./anomaly_layer_wizard');

    anomalyLayerWizard.getIsDisabled = () => !this.canGetJobs;

    anomalyLayerWizard.renderWizard = ({ previewLayers }: RenderWizardArguments) => {
      return (
        <AnomalySourceEditorWithTheme
          mlJobsService={mlJobsService}
          jobsManagementPath={jobsManagementPath}
          canCreateJobs={this.canCreateJobs}
          previewLayers={previewLayers}
        />
      );
    };

    return anomalyLayerWizard as LayerWizard;
  }
}
