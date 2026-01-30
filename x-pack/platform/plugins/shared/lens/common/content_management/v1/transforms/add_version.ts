/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LENS_ITEM_VERSION_V1 } from '@kbn/lens-common/content_management/constants';
import type { LensAttributes } from '../../../../server/content_management/v1';

export function addVersion(attributes: LensAttributes): LensAttributes {
  return {
    ...attributes,
    version: LENS_ITEM_VERSION_V1,
  };
}
