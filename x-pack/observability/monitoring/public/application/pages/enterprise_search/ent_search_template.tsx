/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { PageTemplate } from '../page_template';
import { PageTemplateProps } from '../page_template';

type EntSearchTemplateProps = PageTemplateProps;

export const EntSearchTemplate: React.FC<EntSearchTemplateProps> = (props) => {
  return <PageTemplate {...props} product="enterprise_search" />;
};
