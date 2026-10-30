/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useId, useState } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiFieldText,
  EuiForm,
  EuiFormRow,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiTextArea,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { MAX_APP_DESCRIPTION_LENGTH, MAX_APP_TITLE_LENGTH } from '../../common/constants';

interface DetailsModalProps {
  /** What the modal is for: naming a new app, or changing the name of one. */
  heading: string;
  confirmLabel: string;
  initialTitle?: string;
  initialDescription?: string;
  isSaving?: boolean;
  onConfirm: (details: { title: string; description?: string }) => void;
  onCancel: () => void;
}

/** The name and the description of an app: all a person decides about one outside its editor. */
export const DetailsModal = ({
  heading,
  confirmLabel,
  initialTitle = '',
  initialDescription = '',
  isSaving = false,
  onConfirm,
  onCancel,
}: DetailsModalProps) => {
  const titleId = useId();
  const formId = useId();
  const [title, setTitle] = useState(initialTitle);
  const [description, setDescription] = useState(initialDescription);
  const trimmedTitle = title.trim();

  return (
    <EuiModal onClose={onCancel} aria-labelledby={titleId} data-test-subj="customAppDetailsModal">
      <EuiModalHeader>
        <EuiModalHeaderTitle id={titleId}>{heading}</EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody>
        <EuiForm
          id={formId}
          component="form"
          onSubmit={(event) => {
            event.preventDefault();
            if (trimmedTitle === '') return;
            onConfirm({
              title: trimmedTitle,
              ...(description.trim() === '' ? {} : { description: description.trim() }),
            });
          }}
        >
          <EuiFormRow
            id={`${formId}-title`}
            label={i18n.translate('xpack.customApp.standalone.details.title', {
              defaultMessage: 'Name',
            })}
            fullWidth
          >
            <EuiFieldText
              autoFocus
              fullWidth
              value={title}
              maxLength={MAX_APP_TITLE_LENGTH}
              onChange={(event) => setTitle(event.target.value)}
              data-test-subj="customAppDetailsTitle"
            />
          </EuiFormRow>
          <EuiFormRow
            id={`${formId}-description`}
            label={i18n.translate('xpack.customApp.standalone.details.description', {
              defaultMessage: 'Description',
            })}
            fullWidth
          >
            <EuiTextArea
              fullWidth
              rows={3}
              value={description}
              maxLength={MAX_APP_DESCRIPTION_LENGTH}
              onChange={(event) => setDescription(event.target.value)}
              data-test-subj="customAppDetailsDescription"
            />
          </EuiFormRow>
        </EuiForm>
      </EuiModalBody>
      <EuiModalFooter>
        <EuiButtonEmpty onClick={onCancel}>
          {i18n.translate('xpack.customApp.standalone.details.cancel', {
            defaultMessage: 'Cancel',
          })}
        </EuiButtonEmpty>
        <EuiButton
          fill
          type="submit"
          form={formId}
          isLoading={isSaving}
          isDisabled={trimmedTitle === ''}
          data-test-subj="customAppDetailsConfirm"
        >
          {confirmLabel}
        </EuiButton>
      </EuiModalFooter>
    </EuiModal>
  );
};
