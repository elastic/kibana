/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * There are index templates like this metrics-apm.service_transaction.10m@template which exists.
 * Hence this @ needs to be removed to derive the custom component template name.
 */
export function getComponentTemplatePrefixFromIndexTemplate(indexTemplate: string) {
  if (indexTemplate.includes('@')) {
    return indexTemplate.split('@')[0];
  }

  return indexTemplate;
}
