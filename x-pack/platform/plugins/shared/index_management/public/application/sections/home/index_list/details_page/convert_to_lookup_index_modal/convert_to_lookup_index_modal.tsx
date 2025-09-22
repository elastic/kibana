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
  EuiFieldText,
  EuiFormRow,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
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

interface Props {
  onCloseModal: () => void;
  onConvert: (lookupIndexName: string) => void;
  sourceIndexName: string;
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

export const ConvertToLookupIndexModal = ({ onCloseModal, onConvert, sourceIndexName }: Props) => {
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
  const disableSubmit = formHasErrors || form.isValid === false;

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
        <Form form={form} data-test-subj="convertToLookupIndexForm">
          <EuiFormRow
            label={i18n.translate('xpack.idxMgmt.convertToLookupIndexModal.sourceIndexLabel', {
              defaultMessage: 'Source index',
            })}
          >
            <EuiFieldText
              defaultValue={sourceIndexName}
              disabled
              data-test-subj="sourceIndexName"
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
            }}
          />
        </Form>
      </EuiModalBody>

      <EuiModalFooter>
        <EuiButtonEmpty data-test-subj="cancelButton" onClick={() => onCloseModal()}>
          <FormattedMessage
            id="xpack.idxMgmt.convertToLookupIndexModal.cancelButton"
            defaultMessage="Cancel"
          />
        </EuiButtonEmpty>

        <EuiButton
          fill
          type="submit"
          isLoading={false}
          data-test-subj="convertButton"
          onClick={onSubmitForm}
          disabled={disableSubmit}
        >
          <FormattedMessage
            id="xpack.idxMgmt.convertToLookupIndexModal.convertButton"
            defaultMessage="Convert"
          />
        </EuiButton>
      </EuiModalFooter>
    </EuiModal>
  );
};
