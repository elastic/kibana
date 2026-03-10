/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, CoreStart } from '@kbn/core/server';
import type { ExecutionContext } from '@kbn/expressions-plugin/common';
import type { PluginStartContract } from '../plugin';

const getUiSettings = (coreStart: CoreStart, context: ExecutionContext) => {
  const kibanaRequest = context.getKibanaRequest?.();

  if (!kibanaRequest) {
    throw new Error('expression function cannot be executed without a KibanaRequest');
  }

  return coreStart.uiSettings.asScopedToClient(
    coreStart.savedObjects.getScopedClient(kibanaRequest)
  );
};

/** @internal **/
export const getFormatFactory =
  (core: CoreSetup<PluginStartContract>) => async (context: ExecutionContext) => {
    const [coreStart, { fieldFormats: fieldFormatsStart }] = await core.getStartServices();

    const fieldFormats = await fieldFormatsStart.fieldFormatServiceFactory(
      getUiSettings(coreStart, context)
    );

    return fieldFormats.deserialize;
  };

/** @internal **/
export const getTimeZoneFactory =
  (core: CoreSetup<PluginStartContract>) => async (context: ExecutionContext) => {
    const [coreStart] = await core.getStartServices();
    const uiSettings = await getUiSettings(coreStart, context);
    const timezone = await uiSettings.get('dateFormat:tz');

    /** if `Browser`, hardcode it to 'UTC' so the export has data that makes sense **/
    return timezone === 'Browser' ? 'UTC' : timezone;
  };

/** @internal **/
export const getDatatableUtilitiesFactory =
  (core: CoreSetup<PluginStartContract>) => async (context: ExecutionContext) => {
    const kibanaRequest = context.getKibanaRequest?.();

    if (!kibanaRequest) {
      throw new Error('expression function cannot be executed without a KibanaRequest');
    }

    const [{ elasticsearch, savedObjects }, { data }] = await core.getStartServices();
    // TODO [CPS routing]: this client currently preserves the existing "origin-only" behavior.
    //   Review and choose one of the following options:
    //   A) Still unsure? Leave this comment as-is.
    //   B) Confirmed origin-only is correct? Replace this TODO with a concise explanation of why.
    //   C) Want to use current space’s NPRE (Named Project Routing Expression)? Change 'origin-only' to 'space' and remove this comment.
    //      Note: 'space' requires the request passed to asScoped() to carry a `url: URL` property.
    const elasticsearchClient = elasticsearch.client.asScoped(kibanaRequest, { projectRouting: 'origin-only' }).asCurrentUser;
    const savedObjectsClient = savedObjects.getScopedClient(kibanaRequest);
    const { datatableUtilities } = data;

    return datatableUtilities.asScopedToClient(savedObjectsClient, elasticsearchClient);
  };
