/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import type { Logger } from '@kbn/logging';

export async function verifyIndexTemplates({
  esClient,
  logger,
  patterns,
}: {
  esClient: Client;
  logger: Logger;
  patterns: string[];
}): Promise<void> {
  logger.debug(`Verifying index templates exist for patterns: ${patterns.join(', ')}`);

  const missingTemplates: string[] = [];

  for (const pattern of patterns) {
    try {
      const response = await esClient.indices.getIndexTemplate({ name: pattern });
      const templates = response.index_templates ?? [];

      if (templates.length === 0) {
        missingTemplates.push(pattern);
      } else {
        logger.debug(`Found templates for ${pattern}: ${templates.map((t) => t.name).join(', ')}`);
      }
    } catch (error) {
      const statusCode = (error as { meta?: { statusCode?: number } })?.meta?.statusCode;
      if (statusCode === 404) {
        missingTemplates.push(pattern);
      } else {
        throw error;
      }
    }
  }

  if (missingTemplates.length > 0) {
    throw new Error(
      `Missing index templates for patterns: ${missingTemplates.join(', ')}. ` +
        `Ensure Fleet is installed or the required integrations are set up in Kibana.`
    );
  }

  logger.info('All required index templates are present');
}
