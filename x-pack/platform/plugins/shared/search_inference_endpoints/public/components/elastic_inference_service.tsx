/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';

import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import { EuiPageTemplate } from '@elastic/eui';
import { ElasticInferenceServiceModelsHeader } from './elastic_inference_service/header';
import { ElasticInferenceServiceModelsPage } from './elastic_inference_service/elastic_inference_service_models_page';
import { ManageRegionsModal } from './elastic_inference_service/manage_regions_modal';
import { useBreadcrumbs } from '../hooks/use_breadcrumbs';
import { ELASTIC_INFERENCE_SERVICE_BREADCRUMB } from '../translations';

export const ElasticInferenceService = () => {
  useBreadcrumbs(ELASTIC_INFERENCE_SERVICE_BREADCRUMB);

  const [isManageRegionsOpen, setIsManageRegionsOpen] = useState(false);

  return (
    <KibanaPageTemplate
      offset={0}
      restrictWidth={false}
      grow={false}
      data-test-subj="eisModelsPage"
    >
      <ElasticInferenceServiceModelsHeader onManageRegions={() => setIsManageRegionsOpen(true)} />
      <EuiPageTemplate.Section
        className="eui-yScroll"
        data-test-subj="eisModelsPageMain"
        paddingSize="none"
      >
        <ElasticInferenceServiceModelsPage />
      </EuiPageTemplate.Section>
      {isManageRegionsOpen && <ManageRegionsModal onClose={() => setIsManageRegionsOpen(false)} />}
    </KibanaPageTemplate>
  );
};
