/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useEffect } from 'react';

import { htmlIdGenerator, useEuiTheme } from '@elastic/eui';

import type { CoreStart } from '@kbn/core/public';
import { LAYER_TYPE } from '@kbn/maps-plugin/common';
import type { VectorLayerDescriptor } from '@kbn/maps-plugin/common/descriptor_types';
import type { LocatorPublic } from '@kbn/share-plugin/common';
import type { SerializableRecord } from '@kbn/utility-types';
import { ML_PAGES } from '@kbn/ml-common-types/locator_ml_pages';

import { getActualStyle } from './utils/get_actual_style';
import { CreateAnomalySourceEditor } from './create_anomaly_source_editor';
import type { AnomalySourceDescriptor } from './anomaly_source';
import { AnomalySource } from './anomaly_source';

export const AnomalySourceEditorWithTheme: React.FC<{
  coreStart: CoreStart;
  mlLocator?: LocatorPublic<SerializableRecord>;
  canCreateJobs: boolean;
  previewLayers: (layers: VectorLayerDescriptor[]) => void;
}> = ({ coreStart, mlLocator, canCreateJobs, previewLayers }) => {
  const { euiTheme } = useEuiTheme();

  const [jobsManagementPath, setJobsManagementPath] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (mlLocator) {
      mlLocator
        .getUrl({
          page: ML_PAGES.ANOMALY_DETECTION_JOBS_MANAGE,
        })
        .then(setJobsManagementPath);
    } else {
      // eslint-disable-next-line no-console
      console.error('Unable to get job management path.');
    }
  }, [mlLocator]);

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
