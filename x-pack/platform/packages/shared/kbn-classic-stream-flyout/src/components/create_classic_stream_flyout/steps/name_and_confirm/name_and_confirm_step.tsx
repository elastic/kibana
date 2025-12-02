/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup } from '@elastic/eui';
import type { TemplateDeserialized } from '@kbn/index-management-plugin/common/types';
import type { ValidationErrorType } from './stream_name_input';
import type { IlmPolicyFetcher } from '../../../../utils';
import { NameStreamSection } from './name_stream_section';
import { ConfirmTemplateDetailsSection } from './confirm_template_details_section';

export type { ValidationErrorType };

interface NameAndConfirmStepProps {
  template: TemplateDeserialized;
  selectedIndexPattern: string;
  onIndexPatternChange: (pattern: string) => void;
  onStreamNameChange: (streamName: string) => void;
  validationError: ValidationErrorType;
  conflictingIndexPattern?: string;
  getIlmPolicy?: IlmPolicyFetcher;
}

export const NameAndConfirmStep = ({
  template,
  selectedIndexPattern,
  onIndexPatternChange,
  onStreamNameChange,
  validationError = null,
  conflictingIndexPattern,
  getIlmPolicy,
}: NameAndConfirmStepProps) => {
  const indexPatterns = template.indexPatterns ?? [];

  return (
    <EuiFlexGroup data-test-subj="nameAndConfirmStep" direction="column" gutterSize="none">
      <NameStreamSection
        indexPatterns={indexPatterns}
        selectedIndexPattern={selectedIndexPattern}
        onIndexPatternChange={onIndexPatternChange}
        onStreamNameChange={onStreamNameChange}
        validationError={validationError}
        conflictingIndexPattern={conflictingIndexPattern}
      />

      <ConfirmTemplateDetailsSection template={template} getIlmPolicy={getIlmPolicy} />
    </EuiFlexGroup>
  );
};
