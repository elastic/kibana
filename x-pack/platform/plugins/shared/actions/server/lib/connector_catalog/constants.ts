/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CatalogDefinitionRef } from './types';

export const CONNECTOR_CATALOG_INDEX = '.kibana_connector_catalog';
export const CATALOG_MANIFEST_DOC_ID = 'manifest';

export const getCatalogDefinitionDocId = ({ id, version }: CatalogDefinitionRef): string =>
  `definition:${id}@${version}`;

export const getCatalogAssetDocId = (sha256: string): string => `asset:${sha256}`;
