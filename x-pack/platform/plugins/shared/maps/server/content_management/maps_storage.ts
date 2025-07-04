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
import { CreateResult, SearchQuery, DeleteResult } from '@kbn/content-management-plugin/common';
import type { MapAttributes, MapItem, MapsSearchOut } from '../../common/content_management';
import { MAP_SAVED_OBJECT_TYPE } from '../../common';
import {
  MapsSavedObjectAttributes,
  MapsGetOut,
  MapsSearchOptions,
  MapsCreateOptions,
  MapsCreateOut,
  MapsUpdateOptions,
  MapsUpdateOut,
} from './schema/v1/types';
import { savedObjectToItem, itemToSavedObject } from './schema/v1/transform_utils';
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
  const hasReference = query.tags?.included?.map((tagId) => ({
    type: 'tag',
    id: tagId,
  }));

  const hasNoReference = query.tags?.excluded?.map((tagId) => ({
    type: 'tag',
    id: tagId,
  }));

  return {
    type: MAP_SAVED_OBJECT_TYPE,
    searchFields: options?.onlyTitle ? ['title'] : ['title^3', 'description'],
    search: query.text,
    perPage: query.limit,
    page: query.cursor ? +query.cursor : undefined,
    defaultSearchOperator: 'AND',
    hasReference,
    hasNoReference,
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

  async bulkGet(): Promise<never> {
    // Not implemented
    throw new Error(`[bulkGet] has not been implemented. See MapsStorage class.`);
  }

  async create(
    ctx: StorageContext,
    data: MapAttributes,
    options: MapsCreateOptions
  ): Promise<MapsCreateOut> {
    const transforms = ctx.utils.getTransforms(cmServicesDefinition);
    const soClient = await savedObjectClientFromRequest(ctx);

    // Validate input (data & options) & UP transform them to the latest version
    const { value: dataToLatest, error: dataError } = transforms.create.in.data.up<
      MapAttributes,
      MapAttributes
    >(data);
    if (dataError) {
      throw Boom.badRequest(`Invalid data. ${dataError.message}`);
    }

    const { value: optionsToLatest, error: optionsError } = transforms.create.in.options.up<
      MapsCreateOptions,
      MapsCreateOptions
    >(options);
    if (optionsError) {
      throw Boom.badRequest(`Invalid options. ${optionsError.message}`);
    }

    const { attributes: soAttributes, references: soReferences } = itemToSavedObject({
      attributes: dataToLatest,
      references: options.references,
    });

    // Save data in DB
    const savedObject = await soClient.create<MapsSavedObjectAttributes>(
      MAP_SAVED_OBJECT_TYPE,
      soAttributes,
      { ...optionsToLatest, references: soReferences }
    );

    const item = savedObjectToItem(savedObject, false);

    const validationError = transforms.create.out.result.validate({ item });
    if (validationError) {
      if (this.throwOnResultValidationError) {
        throw Boom.badRequest(`Invalid response. ${validationError.message}`);
      } else {
        this.logger.warn(`Invalid response. ${validationError.message}`);
      }
    }

    // Validate DB response and DOWN transform to the request version
    const { value, error: resultError } = transforms.create.out.result.down<CreateResult<MapItem>>(
      { item },
      undefined, // do not override version
      { validate: false } // validation is done above
    );

    if (resultError) {
      throw Boom.badRequest(`Invalid response. ${resultError.message}`);
    }

    return value;
  }

  async update(
    ctx: StorageContext,
    id: string,
    data: MapAttributes,
    options: MapsUpdateOptions
  ): Promise<MapsUpdateOut> {
    const transforms = ctx.utils.getTransforms(cmServicesDefinition);
    const soClient = await savedObjectClientFromRequest(ctx);

    // Validate input (data & options) & UP transform them to the latest version
    const { value: dataToLatest, error: dataError } = transforms.update.in.data.up<
      MapAttributes,
      MapAttributes
    >(data);
    if (dataError) {
      throw Boom.badRequest(`Invalid data. ${dataError.message}`);
    }

    const { value: optionsToLatest, error: optionsError } = transforms.update.in.options.up<
      MapsUpdateOptions,
      MapsUpdateOptions
    >(options);
    if (optionsError) {
      throw Boom.badRequest(`Invalid options. ${optionsError.message}`);
    }

    const { attributes: soAttributes, references: soReferences } = itemToSavedObject({
      attributes: dataToLatest,
      references: options.references,
    });

    // Save data in DB
    const partialSavedObject = await soClient.update<MapsSavedObjectAttributes>(
      MAP_SAVED_OBJECT_TYPE,
      id,
      soAttributes,
      { ...optionsToLatest, references: soReferences }
    );

    const item = savedObjectToItem(partialSavedObject, true);

    const validationError = transforms.update.out.result.validate({ item });
    if (validationError) {
      if (this.throwOnResultValidationError) {
        throw Boom.badRequest(`Invalid response. ${validationError.message}`);
      } else {
        this.logger.warn(`Invalid response. ${validationError.message}`);
      }
    }

    // Validate DB response and DOWN transform to the request version
    const { value, error: resultError } = transforms.update.out.result.down<
      MapsUpdateOut,
      MapsUpdateOut
    >(
      { item },
      undefined, // do not override version
      { validate: false } // validation is done above
    );

    if (resultError) {
      throw Boom.badRequest(`Invalid response. ${resultError.message}`);
    }

    return value;
  }

  async delete(
    ctx: StorageContext,
    id: string,
    // force is necessary to delete saved objects that exist in multiple namespaces
    options?: { force: boolean }
  ): Promise<DeleteResult> {
    const soClient = await savedObjectClientFromRequest(ctx);
    await soClient.delete(MAP_SAVED_OBJECT_TYPE, id, { force: options?.force ?? false });
    return { success: true };
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

  mSearch = {
    savedObjectType: MAP_SAVED_OBJECT_TYPE,
    toItemResult: (
      ctx: StorageContext,
      savedObject: SavedObject<MapsSavedObjectAttributes>
    ): MapItem => {
      const transforms = ctx.utils.getTransforms(cmServicesDefinition);

      const contentItem = savedObjectToItem(savedObject, false);

      const validationError = transforms.mSearch.out.result.validate(contentItem);
      if (validationError) {
        if (this.throwOnResultValidationError) {
          throw Boom.badRequest(`Invalid response. ${validationError.message}`);
        } else {
          this.logger.warn(`Invalid response. ${validationError.message}`);
        }
      }

      // Validate DB response and DOWN transform to the request version
      const { value, error: resultError } = transforms.mSearch.out.result.down<MapItem, MapItem>(
        contentItem,
        undefined, // do not override version
        { validate: false } // validation is done above
      );

      if (resultError) {
        throw Boom.badRequest(`Invalid response. ${resultError.message}`);
      }

      return value;
    },
  };
}
