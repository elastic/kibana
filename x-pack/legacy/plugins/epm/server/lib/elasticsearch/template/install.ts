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
 * loadDatasetFieldsFromYaml loads all related dataset fields from yaml
 *
 * For each dataset, the fields.yml files are extracted. If there are multiple
 * in one datasets, they are merged together into 1
 */

 export const loadDatasetFieldsFromYaml = async (pkg: RegistryPackage, datasetName: string) => {
  // Fetch all field definition files for this dataset
  const fieldDefinitionFiles = await getAssetsData(pkg, isFields, datasetName);
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
  }
  return fields;
 }

 /**
 * installTemplatesForDataset installs one template for each dataset
 *
 * The template is currently loaded with the pkgey-package-dataset
 */

 export async function installTemplateForDataset(
  pkg: RegistryPackage,
  callCluster: CallESAsCurrentUser,
  dataset: Dataset,
  datasourceName: string
) {
  const fields = await loadDatasetFieldsFromYaml(pkg, dataset.name);
  return installTemplate({ callCluster, fields, dataset, datasourceName });
}

export async function installTemplate({
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
  console.log('fields', JSON.stringify(fields))
  const mappings = generateMappings(fields);
  const templateName = generateTemplateName(dataset);
  let pipelineName;
  if (dataset.ingest_pipeline) {
    pipelineName = getPipelineNameForInstallation(
      dataset.ingest_pipeline,
      dataset,
      dataset.packageName,
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
