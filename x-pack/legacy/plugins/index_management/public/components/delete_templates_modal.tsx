/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiConfirmModal, EuiOverlayMask, EuiCallOut, EuiCheckbox } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import React, { Fragment, useState } from 'react';
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
  const [isDeleteConfirmed, setIsDeleteConfirmed] = useState<boolean>(false);

  const numTemplatesToDelete = templatesToDelete.length;

  const hasSystemTemplate = Boolean(
    templatesToDelete.find(templateName => templateName.startsWith('.'))
  );

  const handleDeleteTemplates = () => {
    deleteTemplates(templatesToDelete).then(({ data: { templatesDeleted, errors }, error }) => {
      const hasDeletedTemplates = templatesDeleted && templatesDeleted.length;

      if (hasDeletedTemplates) {
        const successMessage = i18n.translate(
          'xpack.idxMgmt.deleteTemplatesModal.successNotificationMessageText',
          {
            defaultMessage: 'Deleted {numSuccesses, plural, one {# template} other {# templates}}',
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

  const handleOnCancel = () => {
    setIsDeleteConfirmed(false);
    callback();
  };

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
        onCancel={handleOnCancel}
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
        confirmButtonDisabled={hasSystemTemplate ? !isDeleteConfirmed : false}
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
              <li key={template}>
                {template}
                {template.startsWith('.') ? (
                  <Fragment>
                    {' '}
                    <FormattedMessage
                      id="xpack.idxMgmt.deleteTemplatesModal.systemTemplateLabel"
                      defaultMessage="(System template)"
                    />
                  </Fragment>
                ) : null}
              </li>
            ))}
          </ul>
          {hasSystemTemplate && (
            <EuiCallOut
              title={
                <FormattedMessage
                  id="xpack.idxMgmt.deleteTemplatesModal.proceedWithCautionCallOutTitle"
                  defaultMessage="Deleting a system template can break Kibana"
                />
              }
              color="danger"
              iconType="alert"
              data-test-subj="deleteSystemTemplateCallOut"
            >
              <p>
                <FormattedMessage
                  id="xpack.idxMgmt.deleteTemplatesModal.proceedWithCautionCallOutDescription"
                  defaultMessage="System templates are critical for internal operations.
                Deleting a template cannot be undone."
                />
              </p>
              <EuiCheckbox
                id="confirmDeleteTemplatesCheckbox"
                label={
                  <FormattedMessage
                    id="xpack.idxMgmt.deleteTemplatesModal.confirmDeleteCheckboxLabel"
                    defaultMessage="I understand the consequences of deleting a system template"
                  />
                }
                checked={isDeleteConfirmed}
                onChange={e => setIsDeleteConfirmed(e.target.checked)}
              />
            </EuiCallOut>
          )}
        </Fragment>
      </EuiConfirmModal>
    </EuiOverlayMask>
  );
};
