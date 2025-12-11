/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { TemplateDeserialized } from '@kbn/index-management-plugin/common/types';

import type { IlmPolicyFetcher, ValidationErrorType } from '../../../../utils';

export interface NameAndConfirmBaseProps {
  selectedIndexPattern: string;
  streamNameParts: string[];
  onIndexPatternChange: (pattern: string) => void;
  onStreamNamePartsChange: (parts: string[]) => void;
  validationError: ValidationErrorType;
  conflictingIndexPattern?: string;
}

export interface NameAndConfirmStepProps extends NameAndConfirmBaseProps {
  template: TemplateDeserialized;
  getIlmPolicy?: IlmPolicyFetcher;
}

export interface NameStreamSectionProps extends NameAndConfirmBaseProps {
  indexPatterns: string[];
}
