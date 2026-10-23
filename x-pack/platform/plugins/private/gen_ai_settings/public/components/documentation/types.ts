/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { InstallationStatus } from '@kbn/product-doc-base-plugin/common/install_status';
import type { ResourceType } from '@kbn/product-doc-common';

export type DocumentationStatus = InstallationStatus | 'not_available';

export interface DocumentationItem {
  id: string;
  name: string;
  description?: string;
  status: DocumentationStatus;
  /**
   * The resource type this row manages.
   * Use explicit resource types so row actions can be fully data-driven.
   */
  resourceType: ResourceType;
  updateAvailable?: boolean;
  /** ISO 8601 LastModified of the newer repository artifact, when an update is available. */
  availableArtifactLastModified?: string;
  /** Major.minor stack version of that artifact, when it is a versioned zip. */
  availableStackVersion?: string;
  isTechPreview?: boolean;
  isStubbed?: boolean;
  icon?: string;
  failureReason?: string;
  inferenceId?: string;
  /** ISO 8601 time the documentation was last installed. Present when status is `installed`. */
  installedAt?: string;
  /**
   * ISO 8601 LastModified of the installed zip. Shown with `installedStackVersion`
   * as the installed release, for example `9.6 | Sep 28, 2026`.
   */
  artifactLastModified?: string;
  /**
   * Installed release version shown on the version badge.
   * Product docs use a major.minor stack version. Security labs uses its content version.
   * Omitted when the artifact is identified only by its last-modified date.
   */
  installedStackVersion?: string;
}

export const ELASTIC_DOCS_ID = 'elastic_documents';
export const SECURITY_LABS_ID = 'security_labs';
