/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import {
  EuiOverlayMask,
  EuiModal,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiModalBody,
  EuiText,
  EuiSpacer,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { ActionResult } from '../../../../actions/server/types';
import { ManageEmailAction, EmailActionData } from './manage_email_action';

interface CreationActionModalProps {
  onClose: () => void;
  createEmailAction: (data: EmailActionData) => Promise<void>;
  isNew: boolean;
  editAction: ActionResult | null;
}

export const CreateActionModal: React.FC<CreationActionModalProps> = (
  props: CreationActionModalProps
) => {
  const { onClose, createEmailAction, isNew, editAction } = props;

  return (
    <EuiOverlayMask>
      <EuiModal onClose={onClose} initialFocus="[name=popswitch]">
        <EuiModalHeader>
          <EuiModalHeaderTitle>
            {i18n.translate('xpack.monitoring.alerts.migrate.createAction.title', {
              defaultMessage: 'Create email action',
            })}
          </EuiModalHeaderTitle>
        </EuiModalHeader>
        <EuiModalBody>
          <EuiText>
            <p>
              {i18n.translate('xpack.monitoring.alerts.migrate.createAction.description', {
                defaultMessage: 'Create an email action to use for Kibana alerts.',
              })}
            </p>
          </EuiText>
          <EuiSpacer />
          <ManageEmailAction
            createEmailAction={createEmailAction}
            isNew={isNew}
            action={editAction}
          />
        </EuiModalBody>
      </EuiModal>
    </EuiOverlayMask>
  );
};
