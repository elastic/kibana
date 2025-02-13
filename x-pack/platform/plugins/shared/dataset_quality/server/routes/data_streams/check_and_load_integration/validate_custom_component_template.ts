/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { createDatasetQualityESClient } from '../../../utils';
import { getComponentTemplatePrefixFromIndexTemplate } from '../../../../common/utils/component_template_name';

export async function validateCustomComponentTemplate({
  esClient,
  indexTemplateName,
}: {
  esClient: ElasticsearchClient;
  indexTemplateName: string;
}): Promise<boolean> {
  const datasetQualityESClient = createDatasetQualityESClient(esClient);
  // cleaning the index template name as some have @template suffix
  const componentTemplateName = getComponentTemplatePrefixFromIndexTemplate(indexTemplateName);

  try {
    const { index_templates: indexTemplates } = await datasetQualityESClient.indexTemplates({
      name: indexTemplateName,
    });

    return indexTemplates.some((template) =>
      template.index_template.composed_of.includes(componentTemplateName + '@custom')
    );
  } catch (error) {
    return false;
  }
}
