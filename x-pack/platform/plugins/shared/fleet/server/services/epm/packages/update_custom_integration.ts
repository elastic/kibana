/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { ElasticsearchClient, SavedObjectsClientContract } from '@kbn/core/server';

import { PACKAGES_SAVED_OBJECT_TYPE, ASSETS_SAVED_OBJECT_TYPE } from '../../../../common/constants';

/**
 * Updates a custom integration in Elasticsearch
 *
 * Custom integrations are stored as package saved objects in Elasticsearch
 * @param esClient The Elasticsearch client
 * @param soClient The SavedObjects client
 * @param id The ID of the integration to update
 * @param fields The fields to update
 */
export async function updateCustomIntegration(
  esClient: ElasticsearchClient,
  soClient: SavedObjectsClientContract,
  id: string,
  fields: {
    readMeData?: string;
    categories?: string[];
  }
) {
  try {
    // Get the current integration using the id
    const integration = await soClient.get(PACKAGES_SAVED_OBJECT_TYPE, id);

    // then get the package assets if theres an integration
    if (!integration) {
      throw new Error(`Integration with ID ${id} not found`);
    } else {
      // get the asset with the path ending in README.md and save the id to use later
      const matchingAssetItem = integration.attributes.package_assets.find(
        (asset: any) => asset.path === `${id}-${integration.attributes?.version}/docs/README.md`
      );
      const readMeAsset = await soClient.get(ASSETS_SAVED_OBJECT_TYPE, matchingAssetItem.id);

      // if the readme asset is found, update the data_utf8 field with the new readme content
      if (readMeAsset) {
        const res = await soClient.update(ASSETS_SAVED_OBJECT_TYPE, readMeAsset.id, {
          data_utf8: fields.readMeData,
        });
        // TODO: increment the version by 1, waiting for clarification here on how?

        return {
          readMeAsset: res,
        };
      }
    }
  } catch (error) {
    throw new Error(error.message);
  }
}
