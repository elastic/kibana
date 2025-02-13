/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { SearchQuery } from '@kbn/content-management-plugin/common';
import { ContentManagementPublicStart } from '@kbn/content-management-plugin/public';
import type {
  SerializableAttributes,
  VisualizationClient,
} from '@kbn/visualizations-plugin/public/vis_types/vis_type_alias_registry';

import type { MapCrudTypes } from '../../common/content_management';
import { CONTENT_ID as contentTypeId } from '../../common/content_management';
import { getContentManagement } from '../kibana_services';

export function getMapClient<Attr extends SerializableAttributes = SerializableAttributes>(
  cm: ContentManagementPublicStart = getContentManagement()
): VisualizationClient<'map', Attr> {
  const get = async (id: string) => {
    return cm.client.get<MapCrudTypes['GetIn'], MapCrudTypes['GetOut']>({
      contentTypeId,
      id,
    });
  };

  const create = async ({ data, options }: Omit<MapCrudTypes['CreateIn'], 'contentTypeId'>) => {
    const res = await cm.client.create<MapCrudTypes['CreateIn'], MapCrudTypes['CreateOut']>({
      contentTypeId,
      data,
      options,
    });
    return res;
  };

  const update = async ({ id, data, options }: Omit<MapCrudTypes['UpdateIn'], 'contentTypeId'>) => {
    const res = await cm.client.update<MapCrudTypes['UpdateIn'], MapCrudTypes['UpdateOut']>({
      contentTypeId,
      id,
      data,
      options,
    });
    return res;
  };

  const deleteMap = async (id: string) => {
    return await cm.client.delete<MapCrudTypes['DeleteIn'], MapCrudTypes['DeleteOut']>({
      contentTypeId,
      id,
    });
  };

  const search = async (query: SearchQuery = {}, options?: MapCrudTypes['SearchOptions']) => {
    return cm.client.search<MapCrudTypes['SearchIn'], MapCrudTypes['SearchOut']>({
      contentTypeId,
      query,
      options,
    });
  };

  return {
    get,
    create,
    update,
    delete: deleteMap,
    search,
  } as unknown as VisualizationClient<'map', Attr>;
}
