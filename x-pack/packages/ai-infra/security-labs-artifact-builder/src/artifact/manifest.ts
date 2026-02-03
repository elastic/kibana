/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Manifest structure for Security Labs artifacts.
 */
export interface SecurityLabsManifest {
  /** Format version for the artifact structure */
  formatVersion: string;
  /** Resource type identifier */
  resourceType: 'security_labs';
  /** Date-based version (YYYY.MM.DD) */
  version: string;
}

/**
 * Creates the manifest for a Security Labs artifact.
 */
export const getSecurityLabsManifest = ({
  version,
  formatVersion,
}: {
  version: string;
  formatVersion: string;
}): SecurityLabsManifest => {
  return {
    formatVersion,
    resourceType: 'security_labs',
    version,
  };
};
