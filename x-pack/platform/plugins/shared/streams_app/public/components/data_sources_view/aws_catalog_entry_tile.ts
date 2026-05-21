/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const ELASTIC_LOGOS = 'https://raw.githubusercontent.com/elastic/integrations/main/packages';

export interface AwsCatalogEntryTile {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly logoDomain: string;
  readonly logoUrl: string;
}

/** AWS tile branding shared by the catalog modal and full-page onboarding wizard. */
export const AWS_CATALOG_ENTRY_TILE: AwsCatalogEntryTile = {
  id: 'aws',
  name: 'Amazon Web Services',
  description: 'Collect logs and metrics from AWS services.',
  logoDomain: 'aws.amazon.com',
  logoUrl: `${ELASTIC_LOGOS}/aws/img/logo_aws.svg`,
};
