/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiButtonEmpty,
  EuiButton,
  EuiSpacer,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { configureFailureStoreFormSchema } from './schema';
import {
  useForm,
  useFormIsModified,
  Form,
  UseField,
  ToggleField,
} from '../../../../../shared_imports';

import { DataStream } from '../../../../../../common';
import { useAppContext } from '../../../../app_context';
import { updateDSFailureStore } from '../../../../services/api';

interface Props {
  dataStreams: DataStream[];
  ilmPolicyName?: string;
  ilmPolicyLink?: string;
  onClose: (data?: { hasUpdatedFailureStore: boolean }) => void;
}

export const ConfigureFailureStoreModal: React.FunctionComponent<Props> = ({
  dataStreams,
  onClose,
}) => {
  // We will support multiple data streams in the future, but for now we only support one.
  const dataStream = dataStreams[0];

  const {
    services: { notificationService },
  } = useAppContext();

  const { form } = useForm({
    defaultValue: {
      dsFailureStore: dataStream?.failureStoreEnabled ?? false,
    },
    schema: configureFailureStoreFormSchema,
    id: 'configureFailureStoreForm',
  });
  const isDirty = useFormIsModified({ form });

  const formHasErrors = form.getErrors().length > 0;
  const disableSubmit = formHasErrors || !isDirty || form.isValid === false;

  const onSubmitForm = async () => {
    const { isValid, data } = await form.submit();

    if (!isValid) {
      return;
    }

    return updateDSFailureStore([dataStream.name], data).then(({ data: responseData, error }) => {
      if (responseData) {
        if (responseData.warning) {
          notificationService.showWarningToast(responseData.warning);
          return onClose({ hasUpdatedFailureStore: true });
        }

        const successMessage = i18n.translate(
          'xpack.idxMgmt.dataStreams.configureFailureStoreModal.successFailureStoreNotification',
          {
            defaultMessage:
              'Failure store {disabledFailureStore, plural, one { disabled } other { enabled } }',
            values: { disabledFailureStore: !data.dsFailureStore ? 1 : 0 },
          }
        );

        notificationService.showSuccessToast(successMessage);

        return onClose({ hasUpdatedFailureStore: true });
      }

      if (error) {
        const errorMessage = i18n.translate(
          'xpack.idxMgmt.dataStreams.configureFailureStoreModal.errorFailureStoreNotification',
          {
            defaultMessage: "Error configuring failure store: ''{error}''",
            values: { error: error.message },
          }
        );
        notificationService.showDangerToast(errorMessage);
      }

      onClose();
    });
  };

  return (
    <EuiModal
      onClose={() => onClose()}
      data-test-subj="configureFailureStoreModal"
      css={{ width: 650 }}
    >
      <Form form={form} data-test-subj="configureFailureStoreForm">
        <EuiModalHeader>
          <EuiModalHeaderTitle>
            <FormattedMessage
              id="xpack.idxMgmt.dataStreams.configureFailureStoreModal.modalTitleText"
              defaultMessage="Configure failure store"
            />
          </EuiModalHeaderTitle>
        </EuiModalHeader>

        <EuiModalBody>
          <FormattedMessage
            id="xpack.idxMgmt.dataStreams.configureFailureStoreModal.modalDescriptionText"
            defaultMessage="A failure store is a secondary index within a data stream, used to store failed documents."
          />
          <EuiSpacer />

          <UseField
            path="dsFailureStore"
            component={ToggleField}
            data-test-subj="enableDataStreamFailureStoreToggle"
            euiFieldProps={{
              label: i18n.translate(
                'xpack.idxMgmt.dataStreams.configureFailureStoreModal.infiniteRetentionPeriodField',
                {
                  defaultMessage: 'Enable data stream failure store',
                }
              ),
            }}
          />

          <EuiSpacer />
        </EuiModalBody>

        <EuiModalFooter>
          <EuiButtonEmpty data-test-subj="cancelButton" onClick={() => onClose()}>
            <FormattedMessage
              id="xpack.idxMgmt.dataStreams.configureFailureStoreModal.cancelButtonLabel"
              defaultMessage="Cancel"
            />
          </EuiButtonEmpty>

          <EuiButton
            fill
            type="submit"
            isLoading={false}
            disabled={disableSubmit}
            data-test-subj="saveButton"
            onClick={onSubmitForm}
          >
            <FormattedMessage
              id="xpack.idxMgmt.dataStreams.configureFailureStoreModal.saveButtonLabel"
              defaultMessage="Save"
            />
          </EuiButton>
        </EuiModalFooter>
      </Form>
    </EuiModal>
  );
};
