/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MappingProperty, SearchHit } from '@elastic/elasticsearch/lib/api/types';
import { IconType } from '@elastic/eui';

export interface ResultFieldProps {
  fieldName: string;
  fieldType: string;
  fieldValue: string;
  iconType?: IconType;
  isExpanded?: boolean;
}
export interface MetaDataProps {
  id: string;
  onDocumentDelete?: Function;
  title?: string;
  score?: SearchHit['_score'];
  showScore?: boolean;
  hasDeleteDocumentsPrivilege?: boolean;
}

export interface FieldProps {
  fieldName: string;
  fieldType: Exclude<MappingProperty['type'], undefined>;
  fieldValue: string;
}
