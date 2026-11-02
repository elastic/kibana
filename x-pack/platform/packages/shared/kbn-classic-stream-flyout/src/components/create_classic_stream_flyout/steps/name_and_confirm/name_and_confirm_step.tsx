/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { NameStreamSection } from './name_stream_section';
import type { NameAndConfirmStepProps } from './types';
import { ConfirmTemplateDetailsSection } from './confirm_template_details_section';

export const NameAndConfirmStep = ({
  template,
  selectedIndexPattern,
  streamNameParts,
  onIndexPatternChange,
  onStreamNamePartsChange,
  validationError = null,
  conflictingIndexPattern,
  getIlmPolicy,
  getSimulatedTemplate,
}: NameAndConfirmStepProps) => {
  const indexPatterns = template.indexPatterns ?? [];

  return (
    <EuiFlexGroup data-test-subj="nameAndConfirmStep" direction="column" gutterSize="none">
      <EuiFlexItem grow={false}>
        <NameStreamSection
          indexPatterns={indexPatterns}
          selectedIndexPattern={selectedIndexPattern}
          streamNameParts={streamNameParts}
          onIndexPatternChange={onIndexPatternChange}
          onStreamNamePartsChange={onStreamNamePartsChange}
          validationError={validationError}
          conflictingIndexPattern={conflictingIndexPattern}
        />
      </EuiFlexItem>

      <EuiFlexItem>
        <ConfirmTemplateDetailsSection
          template={template}
          getIlmPolicy={getIlmPolicy}
          getSimulatedTemplate={getSimulatedTemplate}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
