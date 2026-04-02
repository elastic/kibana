/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LENS_ITEM_VERSION_V3 } from '@kbn/lens-common/content_management/constants';
import type { LensAttributes } from '../../../../server/content_management/v3/types';
import type { LensAttributesV2 } from '../../v2';
import type { LensAttributesV3 } from './types';

export function increaseVersion(attributes: LensAttributesV2 | LensAttributesV3): LensAttributes {
  return {
    ...attributes,
    version: LENS_ITEM_VERSION_V3,
  };
}
