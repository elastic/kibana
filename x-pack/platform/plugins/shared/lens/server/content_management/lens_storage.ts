/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';

import type { Logger } from '@kbn/logging';
import type {
  SavedObject,
  SavedObjectsFindOptions,
  SavedObjectsFindResult,
} from '@kbn/core-saved-objects-api-server';
import type { StorageContext } from '@kbn/content-management-plugin/server';
import type { SOWithMetadata } from '@kbn/content-management-utils';
import { SOContentStorage, tagsToFindOptions } from '@kbn/content-management-utils';

import type { UserContentCommonSchema } from '@kbn/content-management-table-list-view-common';

// pick up types for the CM storage from the latest version
import { LENS_CONTENT_TYPE } from '@kbn/lens-common/content_management/constants';
import type {
  LensAttributes,
  LensGetOut,
  LensSearchIn,
  LensUpdateIn,
  LensUpdateOut,
  LensCrud,
  LensCreateOut,
  LensSearchOut,
  LensSavedObject,
  LensCreateIn,
} from './latest';
import { servicesDefinitions } from './services';

const searchArgsToSOFindOptions = (args: LensSearchIn): SavedObjectsFindOptions => {
  const { query, contentTypeId, options } = args;

  // Shared schema type allows string here, need to align manually
  const searchFields = (options?.searchFields
    ? Array.isArray(options.searchFields)
      ? options.searchFields
      : [options.searchFields]
    : null) ?? ['title^3', 'description'];

  return {
    type: contentTypeId,
    search: query.text,
    perPage: query.limit,
    page: query.cursor ? +query.cursor : undefined,
    defaultSearchOperator: 'AND',
    ...options,
    ...tagsToFindOptions(query.tags),
    searchFields,
  } satisfies SavedObjectsFindOptions;
};

export class LensStorage extends SOContentStorage<LensCrud> {
  constructor(params: { logger: Logger; throwOnResultValidationError: boolean }) {
    super({
      savedObjectType: LENS_CONTENT_TYPE,
      cmServicesDefinition: servicesDefinitions,
      searchArgsToSOFindOptions,
      enableMSearch: true,
      allowedSavedObjectAttributes: [
        'title',
        'description',
        'visualizationType',
        'version',
        'state',
      ],
      logger: params.logger,
      throwOnResultValidationError: params.throwOnResultValidationError,
    });

    this.mSearch!.toItemResult = (ctx: StorageContext, savedObject: SavedObjectsFindResult) => {
      const transforms = ctx.utils.getTransforms(servicesDefinitions);
      const { attributes, ...rest } = this.savedObjectToItem(
        // TODO: Fix this typing, this is not true we don't necessarily have all the Lens attributes
        savedObject as SavedObject<LensAttributes>
      ) as SOWithMetadata<UserContentCommonSchema['attributes']>;
      const commonContentItem: UserContentCommonSchema = {
        updatedAt: '', // type misalignment
        ...rest,
        attributes: {
          ...attributes, // temporarily pass all attributes for SO finder usages
          title: attributes.title,
          description: attributes.description ?? '',
        },
      };

      const validationError = transforms.mSearch.out.result.validate(commonContentItem);

      if (validationError) {
        if (this.throwOnResultValidationError) {
          throw Boom.badRequest(`Invalid response. ${validationError.message}`);
        } else {
          this.logger.warn(`Invalid response. ${validationError.message}`);
        }
      }

      // TODO: Fix this typing, this expects a full item attributes but only has title and description
      return commonContentItem as LensSavedObject;
    };
  }

  async get(ctx: StorageContext, id: string): Promise<LensGetOut> {
    const soClient = await LensStorage.getSOClientFromRequest(ctx);

    // Save data in DB
    const {
      saved_object: savedObject,
      alias_purpose: aliasPurpose,
      alias_target_id: aliasTargetId,
      outcome,
    } = await soClient.resolve<LensAttributes>(LENS_CONTENT_TYPE, id);

    const response: LensGetOut = {
      item: this.savedObjectToItem(savedObject),
      meta: {
        aliasPurpose,
        aliasTargetId,
        outcome,
      },
    };

    const itemVersion = response.item.attributes.version ?? 0;
    const transforms = ctx.utils.getTransforms(servicesDefinitions);

    // transform item from given version to latest version
    const { value, error: resultError } = transforms.get.out.result.down<LensGetOut, LensGetOut>(
      response,
      itemVersion,
      { validate: true } // validate initial SO Item
    );

    if (resultError) {
      throw Boom.badRequest(`Transform error. ${resultError.message}`);
    }

    const validationError = transforms.get.out.result.validate(value);

    if (validationError) {
      if (this.throwOnResultValidationError) {
        throw Boom.badRequest(`Invalid response. ${validationError.message}`);
      } else {
        this.logger.warn(`Invalid response. ${validationError.message}`);
      }
    }

    return value;
  }

  async create(
    ctx: StorageContext,
    data: LensCreateIn['data'],
    options: LensCreateIn['options'] = {}
  ): Promise<LensCreateOut> {
    const transforms = ctx.utils.getTransforms(servicesDefinitions);
    const soClient = await SOContentStorage.getSOClientFromRequest(ctx);

    const itemVersion = data.version ?? 0; // Check that this always has a version

    // transform data from given version to latest version
    const { value: dataToLatest, error: dataError } = transforms.create.in.data.down<
      LensCreateIn['data'],
      LensAttributes
    >(data, itemVersion);

    if (dataError) {
      throw Boom.badRequest(`Invalid data. ${dataError.message}`);
    }

    // transform options from given version to latest version
    const { value: optionsToLatest, error: optionsError } = transforms.create.in.options.down<
      LensCreateIn['options'],
      LensCreateIn['options']
    >(options, itemVersion);

    if (optionsError) {
      throw Boom.badRequest(`Invalid options. ${optionsError.message}`);
    }

    const createOptions = this.createArgsToSoCreateOptions(optionsToLatest ?? {});

    // Save data in DB
    const savedObject = await soClient.create<LensAttributes>(
      LENS_CONTENT_TYPE,
      dataToLatest,
      createOptions
    );

    const result = {
      item: this.savedObjectToItem(savedObject),
    };

    const validationError = transforms.create.out.result.validate(result);

    if (validationError) {
      if (this.throwOnResultValidationError) {
        throw Boom.badRequest(`Invalid response. ${validationError.message}`);
      } else {
        this.logger.warn(`Invalid response. ${validationError.message}`);
      }
    }

    // transform result from latest version to request version
    const { value, error: resultError } = transforms.create.out.result.down<
      LensCreateOut,
      LensCreateOut
    >(
      result,
      'latest',
      { validate: false } // validation is done above
    );

    if (resultError) {
      throw Boom.badRequest(`Invalid response. ${resultError.message}`);
    }

    return value;
  }

  /**
   * Lens requires a custom update function because of https://github.com/elastic/kibana/issues/160116
   * where a forced create with overwrite flag is used instead of regular update
   */
  async update(
    ctx: StorageContext,
    id: string,
    data: LensUpdateIn['data'],
    options: LensUpdateIn['options']
  ): Promise<LensUpdateOut> {
    const {
      utils: { getTransforms },
      version: { request: requestVersion },
    } = ctx;
    const transforms = getTransforms(servicesDefinitions, requestVersion);
    const itemVersion = data.version ?? 0; // Check that this always has a version

    // transform data from given version to latest version
    const { value: dataToLatest, error: dataError } = transforms.update.in.data.down<
      LensUpdateIn['data'],
      LensAttributes
    >(data, itemVersion);

    if (dataError) {
      throw Boom.badRequest(`Invalid data. ${dataError.message}`);
    }

    // transform options from given version to latest version
    const { value: optionsToLatest, error: optionsError } = transforms.update.in.options.down<
      LensUpdateIn['options'],
      LensUpdateIn['options']
    >(options, itemVersion);

    if (optionsError) {
      throw Boom.badRequest(`Invalid options. ${optionsError.message}`);
    }

    const soClient = await LensStorage.getSOClientFromRequest(ctx);

    // since we use create below this call is meant to throw if SO id not found
    await soClient.get(LENS_CONTENT_TYPE, id);

    const savedObject = await soClient.create<LensAttributes>(LENS_CONTENT_TYPE, dataToLatest, {
      id,
      overwrite: true,
      ...optionsToLatest,
    });

    const result = {
      item: this.savedObjectToItem(savedObject),
    };

    const validationError = transforms.update.out.result.validate(result);

    if (validationError) {
      if (this.throwOnResultValidationError) {
        throw Boom.badRequest(`Invalid response. ${validationError.message}`);
      } else {
        this.logger.warn(`Invalid response. ${validationError.message}`);
      }
    }

    // transform result from latest version to request version
    const { value, error: resultError } = transforms.update.out.result.down<
      LensUpdateOut,
      LensUpdateOut
    >(
      result,
      'latest',
      { validate: false } // validation is done above
    );

    if (resultError) {
      throw Boom.badRequest(`Invalid response. ${resultError.message}`);
    }

    return value;
  }

  async search(
    ctx: StorageContext,
    query: LensSearchIn['query'],
    options: LensSearchIn['options'] = {}
  ): Promise<LensSearchOut> {
    const transforms = ctx.utils.getTransforms(servicesDefinitions);
    const soClient = await SOContentStorage.getSOClientFromRequest(ctx);
    const requestVersion = 'latest'; // this should eventually come from the request when there is a v2

    // Validate and UP transform the options
    const { value: optionsToLatest, error: optionsError } = transforms.search.in.options.up<
      LensSearchIn['options'],
      LensSearchIn['options']
    >(options, requestVersion);
    if (optionsError) {
      throw Boom.badRequest(`Invalid payload. ${optionsError.message}`);
    }

    const soQuery: SavedObjectsFindOptions = this.searchArgsToSOFindOptions({
      contentTypeId: LENS_CONTENT_TYPE,
      query,
      options: optionsToLatest,
    });

    // Execute the query in the DB
    const soResponse = await soClient.find<LensAttributes>(soQuery);
    const items = soResponse.saved_objects.map((so) => this.savedObjectToItem(so));

    const transformedItems = items.map((item) => {
      // transform item from given version to latest version
      const { value: transformedItem, error: itemError } = transforms.search.out.result.down<
        LensSavedObject,
        LensSavedObject
      >(
        item,
        item.attributes.version ?? 0,
        { validate: false } // validation is done after transform below
      );

      if (itemError) {
        throw Boom.badRequest(`Transform error. ${itemError.message}`);
      }

      return transformedItem;
    });

    const response = {
      hits: transformedItems,
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

    return response;
  }
}
