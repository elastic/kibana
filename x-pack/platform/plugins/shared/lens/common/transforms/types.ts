/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LensItem as LensItemV1, LensAttributesV0 } from '../content_management/v1';
import type { LensItem } from '../content_management';

/**
 * Any of the versioned Lens Item
 */
export type VersionLensItem = LensItem | LensItemV1;

/**
 * Any of the versioned or unversioned Lens Item
 */
export type UnknownLensItem = LensAttributesV0 | VersionLensItem;
