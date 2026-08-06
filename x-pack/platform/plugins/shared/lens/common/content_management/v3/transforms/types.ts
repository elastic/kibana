/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SOWithMetadata } from '@kbn/content-management-utils';

import type { LensAttributes } from '../../../../server/content_management/v3';

/**
 * A v3 Lens item that may or may not include old runtime migrations.
 */
export type LensSavedObjectV3 = SOWithMetadata<LensAttributesV3>;

export type LensAttributesV3 = LensAttributes;
