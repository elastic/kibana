/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';

export const DataCatalog = () => {
  return (
    <KibanaPageTemplate>
      <KibanaPageTemplate.Header pageTitle="Data Catalog" />
      <KibanaPageTemplate.Section />
    </KibanaPageTemplate>
  );
};