/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup } from '@elastic/eui';
import { NameStreamSection } from './name_stream_section';
import type { NameAndConfirmStepProps } from './types';

export const NameAndConfirmStep = ({
  template,
  selectedIndexPattern,
  onIndexPatternChange,
  onStreamNameChange,
  validationError = null,
  conflictingIndexPattern,
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
    </EuiFlexGroup>
  );
};
