/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IndicesGetIndexTemplateIndexTemplateItem } from '@elastic/elasticsearch/lib/api/types';

export function getApmIndexTemplateNames() {
  const indexTemplateNames = [
    'logs-apm.app',
    'logs-apm.error',
    'metrics-apm.app',
    'metrics-apm.internal',
    'traces-apm.rum',
    'traces-apm.sampled',
    'traces-apm',
  ];

  const rollupIndexTemplateNames = ['1m', '10m', '60m'].flatMap((interval) => {
    return [
      'metrics-apm.service_destination',
      'metrics-apm.service_summary',
      'metrics-apm.service_transaction',
      'metrics-apm.transaction',
    ].map((ds) => `${ds}.${interval}`);
  });

  return [...indexTemplateNames, ...rollupIndexTemplateNames];
}

export function getApmIndexTemplates(
  existingIndexTemplates: IndicesGetIndexTemplateIndexTemplateItem[]
) {
  const apmIndexTemplateNames = getApmIndexTemplateNames();
  const standardIndexTemplates = apmIndexTemplateNames.map((templateName) => {
    const matchingTemplate = existingIndexTemplates.find(
      ({ name }) => name === templateName
    );

    return {
      name: templateName,
      exists: Boolean(matchingTemplate),
      isNonStandard: false,
    };
  });

  const nonStandardIndexTemplates = existingIndexTemplates
    .filter(
      (indexTemplate) =>
        standardIndexTemplates.some(
          ({ name }) => name === indexTemplate.name
        ) === false
    )
    .map((indexTemplate) => ({
      name: indexTemplate.name,
      isNonStandard: true,
      exists: true,
    }));

  return [...standardIndexTemplates, ...nonStandardIndexTemplates];
}
