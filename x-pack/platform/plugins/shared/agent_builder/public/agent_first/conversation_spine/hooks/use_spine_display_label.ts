/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getSpineTypeLabel } from '../spine_type_config';
import type { SpineType } from '../types';

export { getSpineTypeLabel };

export const formatSpineDisplayLabel = (type: SpineType, identifier: string): string =>
  `${getSpineTypeLabel(type)} · ${identifier}`;
