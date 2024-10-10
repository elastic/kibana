/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ProductName } from './product';

// TODO: proper structure (e.g. semantic field
export interface ProductDocumentationAttributes {
  content_title: string;
  content_body: string;
  product_name: ProductName;
  root_type: string;
  slug: string;
  url: string;
  version: string;
  ai_subtitle: string;
  ai_summary: string;
  ai_questions_answered: string[];
  ai_tags: string[];
}
