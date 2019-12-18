/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { safeLoad } from 'js-yaml';
import { AssetReference, Dataset, RegistryPackage } from '../../../../common/types';
import { CallESAsCurrentUser } from '../../../../server/lib/cluster_access';
import { getAssetsData } from '../../../packages/assets';
import { Field } from '../../fields/field';
import { getPipelineNameForInstallation } from '../ingest_pipeline/ingest_pipelines';
import { generateMappings, generateTemplateName, getTemplate } from './template';

const isFields = (path: string) => {
  return path.includes('/fields/');
};

/**
 * installTemplates installs one template for each dataset
 *
 * For each dataset, the fields.yml files are extracted. If there are multiple
 * in one datasets, they are merged together into 1 and then converted to a template
 * The template is currently loaded with the pkgey-package-dataset
 */
export async function installTemplateForDataset(
  pkg: RegistryPackage,
  callCluster: CallESAsCurrentUser,
  dataset: Dataset,
  datasourceName: string
) {
  // Fetch all field definition files for this dataset
  const fieldDefinitionFiles = await getAssetsData(pkg, isFields, dataset.name);
  // Merge all the fields of a dataset together and create an Elasticsearch index template
  let fields: Field[] = [];
  for (const file of fieldDefinitionFiles) {
    // Make sure it is defined as it is optional. Should never happen.
    if (file.buffer) {
      const tmpFields = safeLoad(file.buffer.toString());
      // safeLoad() returns undefined for empty files, we don't want that
      if (tmpFields) {
        fields = fields.concat(tmpFields);
      }
    }
    dataset.package = pkg.name;
    return installTemplate({ callCluster, fields, dataset, datasourceName });
  }
}

async function installTemplate({
  callCluster,
  fields,
  dataset,
  datasourceName,
}: {
  callCluster: CallESAsCurrentUser;
  fields: Field[];
  dataset: Dataset;
  datasourceName: string;
}): Promise<AssetReference> {
  const mappings = generateMappings(fields);
  const templateName = generateTemplateName(dataset);
  let pipelineName;
  if (dataset.ingest_pipeline) {
    pipelineName = getPipelineNameForInstallation(
      dataset.ingest_pipeline,
      dataset,
      dataset.package,
      datasourceName
    );
  }
  const template = getTemplate(templateName + '-*', mappings, pipelineName);

  // TODO: Check return values for errors
  await callCluster('indices.putTemplate', {
    name: templateName,
    body: template,
  });

  // The id of a template is it's name
  return { id: templateName, type: 'index-template' };
}
