/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiConfirmModal, EuiOverlayMask } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import React, { Fragment } from 'react';
import { toastNotifications } from 'ui/notify';
import { deleteTemplates } from '../services/api';
import { Template } from '../../common/types';

export const DeleteTemplatesModal = ({
  templatesToDelete,
  callback,
}: {
  templatesToDelete: Array<Template['name']>;
  callback: (data?: { hasDeletedTemplates: boolean }) => void;
}) => {
  const numTemplatesToDelete = templatesToDelete.length;

  const handleDeleteTemplates = async () => {
    deleteTemplates(templatesToDelete).then(({ data: { templatesDeleted, errors }, error }) => {
      const hasDeletedTemplates = templatesDeleted && templatesDeleted.length;

      if (hasDeletedTemplates) {
        const successMessage = i18n.translate(
          'xpack.idxMgmt.deleteTemplatesModal.successNotificationMessageText',
          {
            defaultMessage:
              'Deleted {numSuccesses, number} {numSuccesses, plural, one {template} other {templates}}',
            values: { numSuccesses: templatesDeleted.length },
          }
        );

        callback({ hasDeletedTemplates });
        toastNotifications.addSuccess(successMessage);
      }

      if (error || (errors && errors.length)) {
        const hasMultipleErrors =
          (errors && errors.length > 1) || (error && templatesToDelete.length > 1);
        const errorMessage = hasMultipleErrors
          ? i18n.translate(
              'xpack.idxMgmt.deleteTemplatesModal.multipleErrorsNotificationMessageText',
              {
                defaultMessage: 'Error deleting {count} templates',
                values: {
                  count: (errors && errors.length) || templatesToDelete.length,
                },
              }
            )
          : i18n.translate('xpack.idxMgmt.deleteTemplatesModal.errorNotificationMessageText', {
              defaultMessage: "Error deleting template '{name}'",
              values: { name: (errors && errors[0].name) || templatesToDelete[0] },
            });
        toastNotifications.addDanger(errorMessage);
      }
    });
  };

  if (!numTemplatesToDelete) {
    return null;
  }

  return (
    <EuiOverlayMask>
      <EuiConfirmModal
        buttonColor="danger"
        data-test-subj="deleteTemplatesConfirmation"
        title={
          <FormattedMessage
            id="xpack.idxMgmt.deleteTemplatesModal.modalTitleText"
            defaultMessage="Delete {numTemplatesToDelete, plural, one {template} other {# templates}}"
            values={{ numTemplatesToDelete }}
          />
        }
        onCancel={callback}
        onConfirm={handleDeleteTemplates}
        cancelButtonText={
          <FormattedMessage
            id="xpack.idxMgmt.deleteTemplatesModal.cancelButtonLabel"
            defaultMessage="Cancel"
          />
        }
        confirmButtonText={
          <FormattedMessage
            id="xpack.idxMgmt.deleteTemplatesModal.confirmButtonLabel"
            defaultMessage="Delete {numTemplatesToDelete, plural, one {template} other {templates} }"
            values={{ numTemplatesToDelete }}
          />
        }
      >
        <Fragment>
          <p>
            <FormattedMessage
              id="xpack.idxMgmt.deleteTemplatesModal.deleteDescription"
              defaultMessage="You are about to delete {numTemplatesToDelete, plural, one {this template} other {these templates} }:"
              values={{ numTemplatesToDelete }}
            />
          </p>

          <ul>
            {templatesToDelete.map(template => (
              <li key={template}>{template}</li>
            ))}
          </ul>
        </Fragment>
      </EuiConfirmModal>
    </EuiOverlayMask>
  );
};
