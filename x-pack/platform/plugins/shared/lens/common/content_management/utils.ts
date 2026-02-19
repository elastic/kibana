/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LensAttributesV0 } from './v0';
import type { LensAttributesV1 } from './v1';
import type { LensAttributesV2 } from './v2';

export function isLensAttributesV0(
  attributes: LensAttributesV0 | LensAttributesV1 | LensAttributesV2
): attributes is LensAttributesV0 {
  return !attributes.version;
}

export function isLensAttributesV1(
  attributes: LensAttributesV0 | LensAttributesV1 | LensAttributesV2
): attributes is LensAttributesV1 {
  return attributes.version === 1;
}

export function isLensAttributesV2(
  attributes: LensAttributesV0 | LensAttributesV1 | LensAttributesV2
): attributes is LensAttributesV2 {
  return attributes.version === 2;
}
