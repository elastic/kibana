/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';

import type { IndexTemplate, RegistryDataStream } from '../../../types';
import { appContextService } from '../../app_context';
import { dataStreamUsesOtelInput } from '../../../../common/services';
import type { PackageInfo } from '../../../../common/types';

/**
 * Returns true if any of the data stream's streams effectively use the OTel collector input
 * type AND OTel integrations are enabled. Resolves named inputs so that a stream referencing
 * an input by name (e.g. `otel_logs`) is correctly identified as OTel when its backing input
 * has `type: otelcol`.
 *
 * Shared between the namespace-scoped data stream template and ILM policy sync logic, which
 * both need to derive the same (possibly OTel-suffixed) base template name for a data stream.
 */
export function isOtelDataStream(
  dataStream: RegistryDataStream,
  packageInfo: Pick<PackageInfo, 'policy_templates'>
): boolean {
  const experimentalFeature = appContextService.getExperimentalFeatures();
  return (
    !!experimentalFeature?.enableOtelIntegrations &&
    dataStreamUsesOtelInput(packageInfo, dataStream)
  );
}

/**
 * Fetches an index template from ES and strips read-only date properties that cannot be set
 * on a subsequent PUT. Returns the cleaned template, or undefined if it does not exist.
 */
export async function fetchIndexTemplate(
  esClient: ElasticsearchClient,
  templateName: string,
  logContext: string,
  signal?: AbortSignal
): Promise<IndexTemplate | undefined> {
  const logger = appContextService.getLogger();
  let rawTemplate;
  try {
    const res = await esClient.indices.getIndexTemplate({ name: templateName }, { signal });
    rawTemplate = res.index_templates[0]?.index_template;
  } catch (err: unknown) {
    if ((err as { meta?: { statusCode?: number } })?.meta?.statusCode !== 404) {
      throw err;
    }
    logger.debug(`[${logContext}] index template ${templateName} not found, skipping`);
    return undefined;
  }

  if (!rawTemplate) {
    return undefined;
  }

  const {
    created_date: _cd,
    created_date_millis: _cdm,
    modified_date: _md,
    modified_date_millis: _mdm,
    ...indexTemplate
  } = rawTemplate as IndexTemplate;

  return indexTemplate;
}
