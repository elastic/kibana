/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useBreadcrumbs } from '../../../../hooks';

export const IntegrationBreadcrumb: React.FunctionComponent<{
  pkgTitle: string;
  pkgkey: string;
  integration?: string;
}> = ({ pkgTitle, pkgkey, integration }) => {
  useBreadcrumbs('add_integration_to_policy', {
    pkgTitle,
    pkgkey,
    ...(integration ? { integration } : {}),
  });
  return null;
};
