/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useContext } from 'react';
import { EuiButton } from '@elastic/eui';

import { useFormContext } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import * as i18n from './translations';
import { TemplateFieldsValidationContext } from './template_fields_validation_context';

export interface SubmitCaseButtonComponentProps {
  isSubmitting: boolean;
}

const SubmitCaseButtonComponent: React.FC<SubmitCaseButtonComponentProps> = ({ isSubmitting }) => {
  const { submit } = useFormContext();
  const triggerRef = useContext(TemplateFieldsValidationContext);

  const handleClick = useCallback(async () => {
    if (triggerRef.current) {
      const isValid = await triggerRef.current();
      if (!isValid) return;
    }
    submit();
  }, [submit, triggerRef]);

  return (
    <EuiButton
      tour-step="create-case-submit"
      data-test-subj="create-case-submit"
      fill
      iconType="plusCircle"
      isDisabled={isSubmitting}
      isLoading={isSubmitting}
      onClick={handleClick}
    >
      {i18n.CREATE_CASE}
    </EuiButton>
  );
};
SubmitCaseButtonComponent.displayName = 'SubmitCaseButton';

export const SubmitCaseButton = memo(SubmitCaseButtonComponent);
