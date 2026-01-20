/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { InstallationStatus } from '@kbn/product-doc-base-plugin/common/install_status';

export type DocumentationStatus = InstallationStatus | 'not_available';

export interface DocumentationItem {
  id: string;
  name: string;
  description?: string;
  status: DocumentationStatus;
  updateAvailable?: boolean;
  isTechPreview?: boolean;
  isStubbed?: boolean;
  icon?: string;
}

export const ELASTIC_DOCS_ID = 'elastic_documents';
export const SECURITY_LABS_ID = 'security_labs';
