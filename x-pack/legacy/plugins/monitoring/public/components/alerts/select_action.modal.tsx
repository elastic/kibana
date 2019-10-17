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
  EuiLink,
  EuiSuperSelect,
  EuiModalFooter,
  EuiButtonEmpty,
  EuiButton,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { ActionResult } from '../../../../actions/server/types';

interface SelectActionModalProps {
  emailActions: ActionResult[];
  onClose: () => void;
  createKibanaAlerts: () => void;
  onClickEdit: (action: ActionResult) => void;
  selectedEmailActionId: string;
  setSelectedEmailActionId: (id: string) => void;
}

export const SelectActionModal: React.FC<SelectActionModalProps> = (
  props: SelectActionModalProps
) => {
  const {
    emailActions,
    onClose,
    createKibanaAlerts,
    onClickEdit,
    selectedEmailActionId,
    setSelectedEmailActionId,
  } = props;

  const options = emailActions.map(action => {
    const actionLabel = i18n.translate(
      'xpack.monitoring.alerts.migrate.selectAction.inputDisplay',
      {
        defaultMessage: '{service} from {from}',
        values: {
          service: action.config.service,
          from: action.config.from,
        },
      }
    );

    return {
      value: action.id,
      inputDisplay: (
        <EuiText>
          {actionLabel}
          &nbsp;
          <EuiLink onClick={() => onClickEdit(action)}>
            {i18n.translate('xpack.monitoring.alerts.migrate.selectAction.editLink', {
              defaultMessage: 'edit',
            })}
          </EuiLink>
        </EuiText>
      ),
      dropdownDisplay: <EuiText>{actionLabel}</EuiText>,
    };
  });

  return (
    <EuiOverlayMask>
      <EuiModal onClose={onClose} initialFocus="[name=popswitch]">
        <EuiModalHeader>
          <EuiModalHeaderTitle>
            {i18n.translate('xpack.monitoring.alerts.migrate.selectAction.title', {
              defaultMessage: 'Select email action',
            })}
          </EuiModalHeaderTitle>
        </EuiModalHeader>

        <EuiModalBody>
          <EuiText>
            <p>
              {i18n.translate('xpack.monitoring.alerts.migrate.selectAction.description', {
                defaultMessage: 'Select a configured email action to use for Kibana alerts.',
              })}
            </p>
          </EuiText>
          <EuiSpacer />
          <EuiSuperSelect
            options={options}
            valueOfSelected={selectedEmailActionId}
            onChange={id => setSelectedEmailActionId(id)}
          />
        </EuiModalBody>

        <EuiModalFooter>
          <EuiButtonEmpty onClick={onClose}>
            {i18n.translate('xpack.monitoring.alerts.migrate.selectAction.cancelLabel', {
              defaultMessage: 'Cancel',
            })}
          </EuiButtonEmpty>
          <EuiButton
            onClick={() => {
              onClose();
              if (selectedEmailActionId) {
                createKibanaAlerts();
              }
            }}
            fill
          >
            {i18n.translate('xpack.monitoring.alerts.migrate.selectAction.useLabel', {
              defaultMessage: 'Use',
            })}
          </EuiButton>
        </EuiModalFooter>
      </EuiModal>
    </EuiOverlayMask>
  );
};
