/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getSpineTypeLabel } from '../spine_type_config';
import type { SpineType } from '../types';

export { getSpineTypeLabel };

/** POC: omit conversation id suffix from badge labels until identifier UX is finalized. */
const SHOW_SPINE_IDENTIFIER_IN_BADGE = false;

export const formatSpineDisplayLabel = (type: SpineType, identifier: string): string =>
  SHOW_SPINE_IDENTIFIER_IN_BADGE
    ? `${getSpineTypeLabel(type)} · ${identifier}`
    : getSpineTypeLabel(type);
