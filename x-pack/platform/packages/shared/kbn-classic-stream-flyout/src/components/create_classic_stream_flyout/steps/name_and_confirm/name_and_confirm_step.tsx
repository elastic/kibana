/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup } from '@elastic/eui';
import type { TemplateDeserialized } from '@kbn/index-management-plugin/common/types';
import type { ValidationErrorType } from '../../../../utils';
import { NameStreamSection } from './name_stream_section';

export type { ValidationErrorType };

interface NameAndConfirmStepProps {
  template: TemplateDeserialized;
  selectedIndexPattern: string;
  streamNameParts: string[];
  onIndexPatternChange: (pattern: string) => void;
  onStreamNamePartsChange: (parts: string[]) => void;
  validationError: ValidationErrorType;
  conflictingIndexPattern?: string;
}

export const NameAndConfirmStep = ({
  template,
  selectedIndexPattern,
  streamNameParts,
  onIndexPatternChange,
  onStreamNamePartsChange,
  validationError = null,
  conflictingIndexPattern,
}: NameAndConfirmStepProps) => {
  const indexPatterns = template.indexPatterns ?? [];

  return (
    <EuiFlexGroup data-test-subj="nameAndConfirmStep" direction="column" gutterSize="none">
      <NameStreamSection
        indexPatterns={indexPatterns}
        selectedIndexPattern={selectedIndexPattern}
        streamNameParts={streamNameParts}
        onIndexPatternChange={onIndexPatternChange}
        onStreamNamePartsChange={onStreamNamePartsChange}
        validationError={validationError}
        conflictingIndexPattern={conflictingIndexPattern}
      />
    </EuiFlexGroup>
  );
};
