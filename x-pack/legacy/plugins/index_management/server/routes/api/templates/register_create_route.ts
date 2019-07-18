/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import {
  Router,
  RouterRouteHandler,
  wrapCustomError,
} from '../../../../../../server/lib/create_router';
import { Template } from '../../../../common/types';

const handler: RouterRouteHandler = async (req, callWithRequest) => {
  const {
    name = '',
    order,
    version,
    settings = {},
    mappings = {},
    aliases = {},
    indexPatterns = [],
  } = req.payload as Template;

  const conflictError = wrapCustomError(
    new Error(
      i18n.translate('xpack.idxMgmt.createRoute.duplicateTemplateIdErrorMessage', {
        defaultMessage: "There is already a template with name '{name}'.",
        values: {
          name,
        },
      })
    ),
    409
  );

  // Check that template with the same name doesn't already exist
  try {
    const templateExists = await callWithRequest('indices.existsTemplate', { name });

    if (templateExists) {
      throw conflictError;
    }
  } catch (e) {
    // Rethrow conflict error but silently swallow all others
    if (e === conflictError) {
      throw e;
    }
  }

  // Otherwise create new index template
  return await callWithRequest('indices.putTemplate', {
    name,
    order,
    body: {
      index_patterns: indexPatterns,
      version,
      settings,
      mappings,
      aliases,
    },
  });
};

export function registerCreateRoute(router: Router) {
  router.put('templates', handler);
}
