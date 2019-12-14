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
export async function installTemplates(
  pkg: RegistryPackage,
  datasets: Dataset[],
  callCluster: CallESAsCurrentUser
) {
  // If no datasets exist in this package, no templates have to be installed.
  if (!pkg.datasets) return;
  return datasets.map(async dataset => {
    // Fetch all assset entries for this dataset
    const assetEntries = await getAssetsData(pkg, isFields, dataset.name);
    // Merge all the fields of a dataset together and create an Elasticsearch index template
    let fields: Field[] = [];
    for (const entry of assetEntries) {
      // Make sure it is defined as it is optional. Should never happen.
      if (entry.buffer) {
        fields = safeLoad(entry.buffer.toString());
      }
    }

    return installTemplate({ callCluster, fields, dataset });
  });
}

async function installTemplate({
  callCluster,
  fields,
  dataset,
}: {
  callCluster: CallESAsCurrentUser;
  fields: Field[];
  dataset: Dataset;
}): Promise<AssetReference> {
  const mappings = generateMappings(fields);
  const templateName = generateTemplateName(dataset);
  const template = getTemplate(templateName + '-*', mappings);
  // TODO: Check return values for errors
  await callCluster('indices.putTemplate', {
    name: templateName,
    body: template,
  });

  // The id of a template is it's name
  return { id: templateName, type: 'index-template' };
}
