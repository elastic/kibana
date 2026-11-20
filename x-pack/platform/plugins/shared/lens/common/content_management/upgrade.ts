/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  LENS_ITEM_VERSION_V1,
  LENS_ITEM_VERSION_V2,
  LENS_ITEM_VERSION_V3,
} from '@kbn/lens-common/content_management/constants';
import type { LensAttributes as LatestLensItemAttributes } from '../../server/content_management/latest';
import type { LensAttributesV0 } from './v0';
import { transformToV1LensItemAttributes, type LensAttributesV1 } from './v1';
import { transformToV2LensItemAttributes, type LensAttributesV2 } from './v2';
import { transformToV3LensItemAttributes, type LensAttributesV3 } from './v3';

export type AnyLensItemAttributes =
  | LensAttributesV0
  | LensAttributesV1
  | LensAttributesV2
  | LensAttributesV3;

interface LensItemUpgrade {
  version: number;
  up: (attributes: AnyLensItemAttributes) => AnyLensItemAttributes;
}

const LENS_ITEM_UPGRADES: readonly LensItemUpgrade[] = [
  {
    version: LENS_ITEM_VERSION_V1,
    up: (attributes) =>
      transformToV1LensItemAttributes(attributes as LensAttributesV0 | LensAttributesV1),
  },
  {
    version: LENS_ITEM_VERSION_V2,
    up: (attributes) => transformToV2LensItemAttributes(attributes as LensAttributesV1),
  },
  {
    version: LENS_ITEM_VERSION_V3,
    up: (attributes) => transformToV3LensItemAttributes(attributes as LensAttributesV2),
  },
];

/**
 * Upgrades Lens item attributes to the latest version, running only the steps newer than
 * the attributes' version.
 */
export function upgradeLensItemAttributes(
  attributes: AnyLensItemAttributes
): LatestLensItemAttributes {
  const currentVersion = attributes.version ?? 0;

  return LENS_ITEM_UPGRADES.filter(({ version }) => version > currentVersion).reduce(
    (upgraded, { up }) => up(upgraded),
    attributes
  ) as LatestLensItemAttributes;
}
