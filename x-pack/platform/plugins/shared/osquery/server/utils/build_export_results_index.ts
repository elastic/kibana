/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { OSQUERY_INTEGRATION_NAME } from '../../common';
import { buildIndexNamesWithNamespaces } from './build_index_name_with_namespace';
import { prefixIndexPatternsWithCcs } from './ccs_utils';

/**
 * Resolves the osquery results index targets for exports.
 *
 * Shared by the export factory DSL (which sets `index` on the search body for
 * client routing) and the export route handler (which opens the PIT). Keeping a
 * single source of truth ensures the PIT scope matches the namespace- and
 * CCS-resolved targets the factory would otherwise use — a PIT masks the search
 * body's `index`, so keeping them aligned ensures the export reads the same targets.
 */
export const buildExportResultsIndex = ({
  integrationNamespaces,
  ccsEnabled,
}: {
  integrationNamespaces: string[] | undefined;
  ccsEnabled: boolean;
}): string[] =>
  prefixIndexPatternsWithCcs(
    buildIndexNamesWithNamespaces(
      `logs-${OSQUERY_INTEGRATION_NAME}.result*`,
      integrationNamespaces
    ),
    ccsEnabled
  );
