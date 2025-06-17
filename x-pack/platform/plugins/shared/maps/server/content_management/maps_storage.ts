/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import { StorageContext } from '@kbn/content-management-plugin/server';
import { SavedObject, SavedObjectsFindOptions } from '@kbn/core-saved-objects-api-server';
import Boom from '@hapi/boom';
import { SearchQuery } from '@kbn/content-management-plugin/common';
import type { MapAttributes, MapItem, MapsSearchOut } from '../../common/content_management';
import { MAP_SAVED_OBJECT_TYPE } from '../../common';
import { MapsSavedObjectAttributes, MapsGetOut, MapsSearchOptions } from './schema/v1/types';
import { savedObjectToItem } from './schema/v1/transform_utils';
import { cmServicesDefinition } from './schema/cm_services';

const savedObjectClientFromRequest = async (ctx: StorageContext) => {
  if (!ctx.requestHandlerContext) {
    throw new Error('Storage context.requestHandlerContext missing.');
  }
  const { savedObjects } = await ctx.requestHandlerContext.core;
  return savedObjects.client;
};

const searchArgsToSOFindOptions = (
  query: SearchQuery,
  options: MapsSearchOptions
): SavedObjectsFindOptions => {
  return {
    type: MAP_SAVED_OBJECT_TYPE,
    searchFields: options?.onlyTitle ? ['title'] : ['title^3', 'description'],
    search: query.text,
    perPage: query.limit,
    page: query.cursor ? +query.cursor : undefined,
    defaultSearchOperator: 'AND',
  };
};

export class MapsStorage {
  constructor({
    logger,
    throwOnResultValidationError,
  }: {
    logger: Logger;
    throwOnResultValidationError: boolean;
  }) {
    this.logger = logger;
    this.throwOnResultValidationError = throwOnResultValidationError ?? false;
  }

  private logger: Logger;
  private throwOnResultValidationError: boolean;

  async get(ctx: StorageContext, id: string): Promise<MapsGetOut> {
    const transforms = ctx.utils.getTransforms(cmServicesDefinition);
    const soClient = await savedObjectClientFromRequest(ctx);

    const {
      saved_object: savedObject,
      alias_purpose: aliasPurpose,
      alias_target_id: aliasTargetId,
      outcome,
    } = await soClient.resolve<MapsSavedObjectAttributes>(MAP_SAVED_OBJECT_TYPE, id);

    const response = {
      item: savedObject,
      meta: { aliasPurpose, aliasTargetId, outcome },
    };

    const validationError = transforms.get.out.result.validate(response);
    if (validationError) {
      if (this.throwOnResultValidationError) {
        throw Boom.badRequest(`Invalid response. ${validationError.message}`);
      } else {
        this.logger.warn(`Invalid response. ${validationError.message}`);
      }
    }
    const { value, error: resultError } = transforms.get.out.result.down<MapsGetOut, MapsGetOut>(
      response,
      undefined,
      { validate: false }
    );

    if (resultError) {
      throw Boom.badRequest(`Invalid response. ${resultError.message}`);
    }

    return value;
  }

  async search(
    ctx: StorageContext,
    query: SearchQuery,
    options: MapsSearchOptions
  ): Promise<MapsSearchOut> {
    const transforms = ctx.utils.getTransforms(cmServicesDefinition);
    const soClient = await savedObjectClientFromRequest(ctx);

    const { value: optionsToLatest, error: optionsError } = transforms.search.in.options.up<
      MapsSearchOptions,
      MapsSearchOptions
    >(options);

    this.logger.warn(`@@@+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++_______`);

    if (optionsError) {
      throw Boom.badRequest(`Invalid payload. ${optionsError.message}`);
    }

    const soQuery = searchArgsToSOFindOptions(query, optionsToLatest);
    const soResponse = await soClient.find<MapsSavedObjectAttributes>(soQuery);
    const hits = await Promise.all(
      soResponse.saved_objects
        .map(async (so) => {
          const item = savedObjectToItem(so, false);
          return item;
        })
        .filter((item) => item !== null)
    );

    const response = {
      hits,
      pagination: {
        total: soResponse.total,
      },
    };

    const validationError = transforms.search.out.result.validate(response);
    if (validationError) {
      if (this.throwOnResultValidationError) {
        throw Boom.badRequest(`Invalid response. ${validationError.message}`);
      } else {
        this.logger.warn(`Invalid response. ${validationError.message}`);
      }
    }

    const { value, error: resultError } = transforms.search.out.result.down<
      MapsSearchOut,
      MapsSearchOut
    >(response, undefined, { validate: false });
    if (resultError) {
      throw Boom.badRequest(`Invalid response. ${resultError.message}`);
    }
    return value;
  }

  async bulkGet(): Promise<never> {
    // Not implemented
    throw new Error(`[bulkGet] has not been implemented. See MapsStorage class.`);
  }
}

// /*
//  * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
//  * or more contributor license agreements. Licensed under the Elastic License
//  * 2.0; you may not use this file except in compliance with the Elastic License
//  * 2.0.
//  */

// import { SOContentStorage, tagsToFindOptions } from '@kbn/content-management-utils';
// import { SavedObjectsFindOptions } from '@kbn/core-saved-objects-api-server';
// import type { Logger } from '@kbn/logging';
// import { CONTENT_ID } from '../../common/content_management';
// import { cmServicesDefinition } from './schema/cm_services';
// import type { MapCrudTypes } from '../../common/content_management';

// const searchArgsToSOFindOptions = (args: MapCrudTypes['SearchIn']): SavedObjectsFindOptions => {
//   const { query, contentTypeId, options } = args;

//   return {
//     type: contentTypeId,
//     searchFields: options?.onlyTitle ? ['title'] : ['title^3', 'description'],
//     fields: ['description', 'title'],
//     search: query.text,
//     perPage: query.limit,
//     page: query.cursor ? +query.cursor : undefined,
//     defaultSearchOperator: 'AND',
//     ...tagsToFindOptions(query.tags),
//   };
// };

// export class MapsStorage extends SOContentStorage<MapCrudTypes> {
//   constructor({
//     logger,
//     throwOnResultValidationError,
//   }: {
//     logger: Logger;
//     throwOnResultValidationError: boolean;
//   }) {
//     super({
//       savedObjectType: CONTENT_ID,
//       cmServicesDefinition,
//       searchArgsToSOFindOptions,
//       enableMSearch: true,
//       allowedSavedObjectAttributes: [
//         'title',
//         'description',
//         'mapStateJSON',
//         'layerListJSON',
//         'uiStateJSON',
//       ],
//       logger,
//       throwOnResultValidationError,
//     });
//   }
// }
