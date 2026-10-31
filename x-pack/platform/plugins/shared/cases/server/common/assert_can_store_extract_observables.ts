/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { canStoreExtractObservablesTrue } from '../../common/utils/case_settings';

/**
 * Throws a 400 when `extractObservables` would be stored as true for an owner that cannot
 * auto-extract observables. A false or an undefined value never throws.
 */
export const assertCanStoreExtractObservables = ({
  owner,
  extractObservables,
}: {
  owner: string;
  extractObservables: boolean | undefined;
}): void => {
  if (extractObservables !== true || canStoreExtractObservablesTrue(owner)) {
    return;
  }

  throw Boom.badRequest(
    `Setting extractObservables to true is not allowed for the "${owner}" owner. Only owners that support automatic observable extraction can enable it.`
  );
};
