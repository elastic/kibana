/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButton } from '@elastic/eui';

import { useFormContext } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import * as i18n from '../translations';

interface SubmitButtonProps {
  isLoading: boolean;
  editMode?: boolean;
}

export const SubmitButton: React.FC<SubmitButtonProps> = React.memo(({ isLoading, editMode }) => {
  const { submit, isSubmitting } = useFormContext();

  return (
    <EuiButton
      data-test-subj="create-submit"
      fill
      isDisabled={isLoading || isSubmitting}
      isLoading={isLoading || isSubmitting}
      onClick={submit}
    >
      {editMode ? i18n.SAVE_MAINTENANCE_WINDOW : i18n.CREATE_MAINTENANCE_WINDOW}
    </EuiButton>
  );
});
SubmitButton.displayName = 'SubmitButton';
