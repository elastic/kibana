/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ProductName } from './product';

// don't need to define the other props
interface SemanticTextField {
  text: string;
}

interface SemanticTextArrayField {
  text: string[];
}

export interface ProductDocumentationAttributes {
  content_title: string;
  content_body: SemanticTextField;
  product_name: ProductName;
  root_type: string;
  slug: string;
  url: string;
  version: string;
  ai_subtitle: string;
  ai_summary: SemanticTextField;
  ai_questions_answered: SemanticTextArrayField;
  ai_tags: string[];
}
