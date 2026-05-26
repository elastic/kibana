/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { z } from '@kbn/zod/v4';

/**
 * Runtime helper for unified attachment registration. Kept in a leaf module under
 * `common/` so other plugins can import it without pulling in the Cases plugin
 * class and its attachment registration chain (circular dependency risk).
 *
 * Prop narrowing is provided by the typed overload in the Cases public API.
 */
export const defineAttachment = <S extends z.ZodType, T extends { schema: S }>(
  attachmentType: T
): T => attachmentType;
