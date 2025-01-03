/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';

import {
  EuiButton,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiButtonEmpty,
  EuiText,
  EuiLink,
  EuiRadioGroup,
  EuiSpacer,
  EuiCode,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { Legacy } from '../legacy_shims';
import { useAlertsModal } from '../application/hooks/use_alerts_modal';

interface Props {
  alerts: {};
}

export const EnableAlertsModal: React.FC<Props> = ({ alerts }: Props) => {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [promptForMigration, setPromptForMigration] = useState(false);
  const alertsEnableModalProvider = useAlertsModal();

  useEffect(() => {
    if (alertsEnableModalProvider.shouldShowAlertsModal(alerts)) {
      setIsModalVisible(true);
    }
  }, [alertsEnableModalProvider, alerts]);

  const closeModal = () => {
    setIsModalVisible(false);
    alertsEnableModalProvider.hideModalForSession();
  };

  const continueButtonClick = (radioIdSelected: string) => {
    if (radioIdSelected === 'create-alerts') {
      setPromptForMigration(true);
    } else {
      alertsEnableModalProvider.notAskAgain();
      closeModal();
    }
  };

  const createButtonClick = () => {
    alertsEnableModalProvider.enableAlerts();
    closeModal();
  };

  const remindLaterClick = () => {
    alertsEnableModalProvider.hideModalForSession();
    closeModal();
  };

  if (!isModalVisible) {
    return null;
  }

  return promptForMigration ? (
    <WatcherMigrationStep closeModal={closeModal} createButtonClick={createButtonClick} />
  ) : (
    <OptIntoRulesStep
      closeModal={closeModal}
      remindLaterClick={remindLaterClick}
      continueButtonClick={continueButtonClick}
    />
  );
};

function OptIntoRulesStep({
  closeModal,
  remindLaterClick,
  continueButtonClick,
}: {
  closeModal: () => void;
  remindLaterClick: () => void;
  continueButtonClick: (buttonId: string) => void;
}) {
  const [radioIdSelected, setRadioIdSelected] = useState('create-alerts');

  const onChange = (optionId: string) => {
    setRadioIdSelected(optionId);
  };

  const radios = [
    {
      id: 'create-alerts',
      label: i18n.translate('xpack.monitoring.alerts.modal.yesOption', {
        defaultMessage: 'Yes (Recommended)',
      }),
    },
    {
      id: 'not-create-alerts',
      label: i18n.translate('xpack.monitoring.alerts.modal.noOption', {
        defaultMessage: 'No',
      }),
    },
  ];

  return (
    <EuiModal onClose={closeModal}>
      <EuiModalHeader>
        <EuiModalHeaderTitle>
          <FormattedMessage
            id="xpack.monitoring.alerts.modal.title"
            defaultMessage="Create rules"
          />
        </EuiModalHeaderTitle>
      </EuiModalHeader>

      <EuiModalBody>
        <EuiText>
          <p>
            <FormattedMessage
              id="xpack.monitoring.alerts.modal.description"
              defaultMessage="Stack monitoring comes with many out-of-the box rules to notify you about issues
            around cluster health, resource utilization and errors. {learnMoreLink}"
              values={{
                learnMoreLink: (
                  <EuiLink
                    href={Legacy.shims.docLinks.links.monitoring.alertsKibana}
                    target="_blank"
                  >
                    <FormattedMessage
                      id="xpack.monitoring.alerts.modal.description.link"
                      defaultMessage="Learn more"
                    />
                  </EuiLink>
                ),
              }}
            />
          </p>
          <div>
            <FormattedMessage
              id="xpack.monitoring.alerts.modal.createDescription"
              defaultMessage="Create these out-of-the box rules in this Kibana space?"
            />

            <EuiSpacer size="xs" />

            <EuiRadioGroup
              options={radios}
              idSelected={radioIdSelected}
              onChange={(id) => onChange(id)}
              name="radio group"
            />
          </div>
        </EuiText>
      </EuiModalBody>

      <EuiModalFooter>
        <EuiButtonEmpty
          onClick={remindLaterClick}
          data-test-subj="alerts-modal-remind-later-button"
        >
          <FormattedMessage
            id="xpack.monitoring.alerts.modal.remindLater"
            defaultMessage="Remind me later"
          />
        </EuiButtonEmpty>

        <EuiButton
          onClick={() => continueButtonClick(radioIdSelected)}
          fill
          data-test-subj="alerts-modal-button"
        >
          <FormattedMessage id="xpack.monitoring.alerts.modal.confirm" defaultMessage="Continue" />
        </EuiButton>
      </EuiModalFooter>
    </EuiModal>
  );
}

export function WatcherMigrationStep({
  closeModal,
  createButtonClick,
}: {
  closeModal: () => void;
  createButtonClick: () => void;
}) {
  return (
    <EuiModal onClose={closeModal}>
      <EuiModalHeader>
        <EuiModalHeaderTitle>
          <FormattedMessage
            id="xpack.monitoring.alerts.modal.migration.title"
            defaultMessage="Migrate Elasticsearch Watches before continuing"
          />
        </EuiModalHeaderTitle>
      </EuiModalHeader>

      <EuiModalBody>
        <EuiText>
          <p>
            <FormattedMessage
              id="xpack.monitoring.alerts.modal.migration.description.one"
              defaultMessage="If you've used Internal Collection in the past, you'll have a few Elasticsearch Watches configured for your monitoring data."
            />
          </p>

          <p>
            <FormattedMessage
              id="xpack.monitoring.alerts.modal.migration.description.two"
              defaultMessage="To avoid duplication of work, it will be best to disable those before you create the Kibana rules."
            />
          </p>

          <p>
            <FormattedMessage
              id="xpack.monitoring.alerts.modal.migration.description.three"
              defaultMessage="To disable the Watches, you'll need to invoke the below API on each cluster where Internal Collection has been enabled in the past."
            />
          </p>

          <p>
            <EuiCode>POST /_monitoring/migrate/alerts</EuiCode>
          </p>

          <p>
            <FormattedMessage
              id="xpack.monitoring.alerts.modal.migration.description.four"
              defaultMessage="Once all monitoring Watches have been disabled, click Create to create the Kibana rules."
            />
          </p>
        </EuiText>
      </EuiModalBody>

      <EuiModalFooter>
        <EuiButtonEmpty onClick={closeModal} data-test-subj="alerts-modal-cancel-button">
          <FormattedMessage
            id="xpack.monitoring.alerts.modal.migration.cancelButton.label"
            defaultMessage="Cancel"
          />
        </EuiButtonEmpty>

        <EuiButton onClick={createButtonClick} fill data-test-subj="alerts-modal-create-button">
          <FormattedMessage
            id="xpack.monitoring.alerts.modal.migration.confirmButton.label"
            defaultMessage="Create"
          />
        </EuiButton>
      </EuiModalFooter>
    </EuiModal>
  );
}
