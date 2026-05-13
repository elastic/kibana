/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';

import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import { EuiPageTemplate } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { ElasticInferenceServiceModelsHeader } from './elastic_inference_service/header';
import { ElasticInferenceServiceModelsPage } from './elastic_inference_service/elastic_inference_service_models_page';
import { useKibana } from '../hooks/use_kibana';

export const ElasticInferenceService = () => {
  const { services } = useKibana();

  useEffect(() => {
    // Only set breadcrumbs in classic chrome. In project chrome (serverless or solution spaces),
    // the navigation tree provides the breadcrumb path automatically.
    if (services.chrome.getChromeStyle() === 'classic') {
      services.setBreadcrumbs([
        {
          text: i18n.translate(
            'xpack.searchInferenceEndpoints.breadcrumbs.elasticInferenceService',
            {
              defaultMessage: 'Elastic Inference',
            }
          ),
        },
      ]);
    }
  }, [services]);

  return (
    <KibanaPageTemplate
      offset={0}
      restrictWidth={false}
      grow={false}
      data-test-subj="eisModelsPage"
    >
      <ElasticInferenceServiceModelsHeader />
      <EuiPageTemplate.Section
        className="eui-yScroll"
        data-test-subj="eisModelsPageMain"
        paddingSize="none"
      >
        <ElasticInferenceServiceModelsPage />
      </EuiPageTemplate.Section>
    </KibanaPageTemplate>
  );
};
