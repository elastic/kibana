/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Semver from 'semver';

/**
 * checks if the provided manifest version was a version where legacy semantic_text behavior was being used
 */
export const isLegacySemanticTextVersion = (manifestVersion: string): boolean => {
  return Semver.lte(manifestVersion, '1.0.0');
};
