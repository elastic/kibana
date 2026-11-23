/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BoostProfile } from './types';

const CONVERTED_PROFILE_PREFIX = '_converted_';

/**
 * Whether Elasticsearch created the profile from the project's search power and boost window.
 * Converted profiles are Elastic-managed, like the other builtin profiles.
 */
export const isConvertedProfile = ({ name, is_builtin: isBuiltin }: BoostProfile) =>
  isBuiltin && name.startsWith(CONVERTED_PROFILE_PREFIX);
