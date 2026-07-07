/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Fs from 'fs/promises';
import Path from 'path';
import type { ToolingLog } from '@kbn/tooling-log';
import type { OpenAPIV3 } from 'openapi-types';

const ELASTICSEARCH_SPEC_URL = 'https://www.elastic.co/docs/api/doc/elasticsearch.json';
const KIBANA_SPEC_URL = 'https://www.elastic.co/docs/api/doc/kibana.json';

export interface DownloadedSpecs {
  elasticsearch: OpenAPIV3.Document;
  kibana: OpenAPIV3.Document;
}

export const downloadOpenAPISpecs = async ({
  log,
  buildFolder,
}: {
  log: ToolingLog;
  buildFolder: string;
}): Promise<DownloadedSpecs> => {
  log.info('Downloading OpenAPI specs from URLs');

  await Fs.mkdir(buildFolder, { recursive: true });

  // Download Elasticsearch spec
  log.info(`Downloading Elasticsearch spec from ${ELASTICSEARCH_SPEC_URL}`);
  const esResponse = await fetch(ELASTICSEARCH_SPEC_URL);
  if (!esResponse.ok) {
    throw new Error(
      `Failed to download Elasticsearch spec: ${esResponse.status} ${esResponse.statusText}`
    );
  }
  const esSpec: OpenAPIV3.Document = await esResponse.json();
  const esSpecPath = Path.join(buildFolder, 'elasticsearch.json');
  await Fs.writeFile(esSpecPath, JSON.stringify(esSpec, null, 2), 'utf-8');
  log.info(`Saved Elasticsearch spec to ${esSpecPath}`);

  // Download Kibana spec
  log.info(`Downloading Kibana spec from ${KIBANA_SPEC_URL}`);
  const kibanaResponse = await fetch(KIBANA_SPEC_URL);
  if (!kibanaResponse.ok) {
    throw new Error(
      `Failed to download Kibana spec: ${kibanaResponse.status} ${kibanaResponse.statusText}`
    );
  }
  const kibanaSpec: OpenAPIV3.Document = await kibanaResponse.json();
  const kibanaSpecPath = Path.join(buildFolder, 'kibana.json');
  await Fs.writeFile(kibanaSpecPath, JSON.stringify(kibanaSpec, null, 2), 'utf-8');
  log.info(`Saved Kibana spec to ${kibanaSpecPath}`);

  log.info('Finished downloading OpenAPI specs');

  return {
    elasticsearch: esSpec,
    kibana: kibanaSpec,
  };
};
