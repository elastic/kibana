/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type FC } from 'react';

import { EuiButton } from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { getErrorMessage } from '../../../../../common/utils/errors';

import { useUpdateTransform } from '../../../hooks';

import {
  useEditTransformFlyoutActions,
  useEditTransformFlyoutContext,
} from '../state_management/edit_transform_flyout_state';
import { useIsFormTouched } from '../state_management/selectors/is_form_touched';
import { useIsFormValid } from '../state_management/selectors/is_form_valid';
import { useUpdatedTransformConfig } from '../state_management/selectors/updated_transform_config';

interface EditTransformUpdateButtonProps {
  closeFlyout: () => void;
}

export const EditTransformUpdateButton: FC<EditTransformUpdateButtonProps> = ({ closeFlyout }) => {
  const { config } = useEditTransformFlyoutContext();
  const isFormValid = useIsFormValid();
  const isFormTouched = useIsFormTouched();
  const requestConfig = useUpdatedTransformConfig();
  const isUpdateButtonDisabled = !isFormValid || !isFormTouched;

  const { setApiError } = useEditTransformFlyoutActions();

  const updateTransfrom = useUpdateTransform(config.id, requestConfig);

  async function submitFormHandler() {
    setApiError(undefined);

    updateTransfrom(undefined, {
      onError: (error) => setApiError(getErrorMessage(error)),
      onSuccess: () => closeFlyout(),
    });
  }

  return (
    <EuiButton
      data-test-subj="transformEditFlyoutUpdateButton"
      onClick={submitFormHandler}
      fill
      isDisabled={isUpdateButtonDisabled}
    >
      {i18n.translate('xpack.transform.transformList.editFlyoutUpdateButtonText', {
        defaultMessage: 'Update',
      })}
    </EuiButton>
  );
};
