/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiForm,
  EuiModalBody,
  EuiModalFooter,
  EuiProgress,
} from '@elastic/eui';
import * as i18n from '../translations';

export interface AddFormProps {
  recordId: string;
  /** Closes the modal after the evidence was added. */
  onDone: () => void;
  onBack: () => void;
}

export interface AddFormLayoutProps {
  formId: string;
  children: React.ReactNode;
  onBack: () => void;
  onSubmit: () => void;
  isLoading: boolean;
  submitLabel?: string;
  isSubmitDisabled?: boolean;
  /** Replaces the submit button, for example with "Close" after an import. */
  hideSubmit?: boolean;
  /** A form-level error, shown above the fields. */
  error?: React.ReactNode;
}

/** The scrolling body and the Back / Add buttons of one step-2 form. */
export const AddFormLayout: React.FC<AddFormLayoutProps> = ({
  formId,
  children,
  onBack,
  onSubmit,
  isLoading,
  submitLabel = i18n.ADD_EVIDENCE,
  isSubmitDisabled = false,
  hideSubmit = false,
  error,
}) => (
  <>
    <EuiModalBody>
      {isLoading ? <EuiProgress size="xs" color="primary" position="absolute" /> : null}
      <EuiForm
        component="form"
        id={formId}
        invalidCallout="none"
        isInvalid={Boolean(error)}
        error={error}
        noValidate
        onSubmit={(event: React.FormEvent) => {
          event.preventDefault();
          onSubmit();
        }}
        data-test-subj={`${formId}`}
      >
        {children}
      </EuiForm>
    </EuiModalBody>
    <EuiModalFooter>
      <EuiButtonEmpty
        onClick={onBack}
        isDisabled={isLoading}
        data-test-subj="investigationEvidenceAddBack"
      >
        {i18n.BACK}
      </EuiButtonEmpty>
      {hideSubmit ? null : (
        <EuiButton
          fill
          type="submit"
          form={formId}
          isLoading={isLoading}
          isDisabled={isSubmitDisabled}
          data-test-subj="investigationEvidenceAddSubmit"
        >
          {submitLabel}
        </EuiButton>
      )}
    </EuiModalFooter>
  </>
);
AddFormLayout.displayName = 'AddFormLayout';
