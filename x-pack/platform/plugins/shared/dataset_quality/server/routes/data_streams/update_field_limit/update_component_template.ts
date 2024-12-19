/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DatasetQualityESClient } from '../../../utils/create_dataset_quality_es_client';
import { getComponentTemplatePrefixFromIndexTemplate } from '../../../../common/utils/component_template_name';

interface UpdateComponentTemplateResponse {
  acknowledged: boolean | undefined;
  componentTemplateName: string;
  error?: string;
}

export async function updateComponentTemplate({
  datasetQualityESClient,
  indexTemplate,
  newFieldLimit,
}: {
  datasetQualityESClient: DatasetQualityESClient;
  indexTemplate: string;
  newFieldLimit: number;
}): Promise<UpdateComponentTemplateResponse> {
  const newSettings = {
    settings: {
      'index.mapping.total_fields.limit': newFieldLimit,
    },
  };

  const customComponentTemplateName = `${getComponentTemplatePrefixFromIndexTemplate(
    indexTemplate
  )}@custom`;

  try {
    const { acknowledged } = await datasetQualityESClient.updateComponentTemplate({
      name: customComponentTemplateName,
      template: newSettings,
    });

    return {
      acknowledged,
      componentTemplateName: customComponentTemplateName,
    };
  } catch (error) {
    return {
      acknowledged: undefined, // acknowledge is undefined when the request fails
      componentTemplateName: customComponentTemplateName,
      error: error.message,
    };
  }
}
