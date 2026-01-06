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
  EuiCallOut,
  EuiFieldText,
  EuiFormRow,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiSpacer,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';

import type { FormSchema } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import {
  useForm,
  FIELD_TYPES,
  Form,
  UseField,
} from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';

import { TextField } from '@kbn/es-ui-shared-plugin/static/forms/components';

export interface ConvertToLookupIndexModalProps {
  onCloseModal: () => void;
  onConvert: (lookupIndexName: string) => void;
  sourceIndexName: string;
  isConverting?: boolean;
  errorMessage?: string;
}

const convertToLookupIndexSchema: FormSchema = {
  lookupIndexName: {
    type: FIELD_TYPES.TEXT,
    validations: [
      {
        validator: ({ value }) => {
          if (!value) {
            return {
              message: i18n.translate(
                'xpack.idxMgmt.convertToLookupIndexModal.lookupIndexNameRequired',
                {
                  defaultMessage: 'Lookup index name is required',
                }
              ),
            };
          }
        },
      },
    ],
  },
};

export const ConvertToLookupIndexModal = ({
  onCloseModal,
  onConvert,
  sourceIndexName,
  isConverting = false,
  errorMessage,
}: ConvertToLookupIndexModalProps) => {
  const modalTitleId = useGeneratedHtmlId();

  const onSubmitForm = async () => {
    const { isValid, data } = await form.submit();

    if (isValid) {
      onConvert(data.lookupIndexName);
    }
  };

  const { form } = useForm({
    defaultValue: {
      lookupIndexName: `lookup-${sourceIndexName}`,
    },
    schema: convertToLookupIndexSchema,
    id: 'convertToLookupIndexForm',
  });

  const formHasErrors = form.getErrors().length > 0;
  const disableSubmit = formHasErrors || form.isValid === false || isConverting;

  return (
    <EuiModal
      onClose={() => onCloseModal()}
      data-test-subj="convertToLookupIndexModal"
      aria-labelledby={modalTitleId}
    >
      <EuiModalHeader>
        <EuiModalHeaderTitle id={modalTitleId}>
          <FormattedMessage
            id="xpack.idxMgmt.convertToLookupIndexModal.modalHeaderTitle"
            defaultMessage="Convert index to lookup"
          />
        </EuiModalHeaderTitle>
      </EuiModalHeader>

      <EuiModalBody>
        <FormattedMessage
          id="xpack.idxMgmt.convertToLookupIndexModal.modalBodyDescription"
          defaultMessage="A new lookup index will be created, and the original index will still exist as before."
        />
        <EuiSpacer />
        <Form form={form} data-test-subj="convertToLookupIndexForm">
          <EuiFormRow
            label={i18n.translate('xpack.idxMgmt.convertToLookupIndexModal.sourceIndexLabel', {
              defaultMessage: 'Source index',
            })}
            fullWidth
          >
            <EuiFieldText
              defaultValue={sourceIndexName}
              disabled
              data-test-subj="sourceIndexName"
              fullWidth
            />
          </EuiFormRow>

          <UseField
            path="lookupIndexName"
            component={TextField}
            label={i18n.translate('xpack.idxMgmt.convertToLookupIndexModal.lookupIndexNameLabel', {
              defaultMessage: 'Lookup index name',
            })}
            euiFieldProps={{
              'data-test-subj': 'lookupIndexName',
              disabled: isConverting,
            }}
          />
          {errorMessage && (
            <EuiFormRow fullWidth>
              <EuiCallOut
                title={i18n.translate('xpack.idxMgmt.convertToLookupIndexModal.errorCalloutTitle', {
                  defaultMessage: 'An error has occurred',
                })}
                color="danger"
                iconType="error"
                data-test-subj="errorCallout"
              >
                {errorMessage}
              </EuiCallOut>
            </EuiFormRow>
          )}
        </Form>
      </EuiModalBody>

      <EuiModalFooter>
        <EuiButtonEmpty
          data-test-subj="cancelButton"
          onClick={() => onCloseModal()}
          disabled={isConverting}
        >
          <FormattedMessage
            id="xpack.idxMgmt.convertToLookupIndexModal.cancelButton"
            defaultMessage="Cancel"
          />
        </EuiButtonEmpty>

        <EuiButton
          fill
          type="submit"
          isLoading={isConverting}
          data-test-subj="convertButton"
          onClick={onSubmitForm}
          disabled={disableSubmit}
        >
          {isConverting ? (
            <FormattedMessage
              id="xpack.idxMgmt.convertToLookupIndexModal.convertingButton"
              defaultMessage="Converting..."
            />
          ) : (
            <FormattedMessage
              id="xpack.idxMgmt.convertToLookupIndexModal.convertButton"
              defaultMessage="Convert"
            />
          )}
        </EuiButton>
      </EuiModalFooter>
    </EuiModal>
  );
};
