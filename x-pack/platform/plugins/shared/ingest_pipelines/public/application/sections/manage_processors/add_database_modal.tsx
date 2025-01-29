/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiFieldText,
  EuiForm,
  EuiFormRow,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiSelect,
  EuiSpacer,
} from '@elastic/eui';
import React, { useMemo, useState } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { css } from '@emotion/react';
import type { GeoipDatabase } from '../../../../common/types';
import { useKibana } from '../../../shared_imports';
import {
  ADD_DATABASE_MODAL_TITLE_ID,
  ADD_DATABASE_MODAL_FORM_ID,
  DATABASE_TYPE_OPTIONS,
  GEOIP_NAME_OPTIONS,
  IPINFO_NAME_OPTIONS,
  getAddDatabaseSuccessMessage,
  addDatabaseErrorTitle,
} from './constants';

export const AddDatabaseModal = ({
  closeModal,
  reloadDatabases,
  databases,
}: {
  closeModal: () => void;
  reloadDatabases: () => void;
  databases: GeoipDatabase[];
}) => {
  const [databaseType, setDatabaseType] = useState<string | undefined>(undefined);
  const [maxmind, setMaxmind] = useState('');
  const [databaseName, setDatabaseName] = useState('');
  const [nameExistsError, setNameExistsError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const existingDatabaseNames = useMemo(
    () => databases.map((database) => database.name),
    [databases]
  );
  const { services } = useKibana();
  const onDatabaseNameChange = (value: string) => {
    setDatabaseName(value);
    setNameExistsError(existingDatabaseNames.includes(value));
  };
  const isFormValid = (): boolean => {
    if (!databaseType || nameExistsError) {
      return false;
    }
    if (databaseType === 'maxmind') {
      return Boolean(maxmind) && Boolean(databaseName);
    }
    return Boolean(databaseName);
  };
  const onDatabaseTypeChange = (value: string) => {
    setDatabaseType(value);
  };
  const onAddDatabase = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isFormValid()) {
      return;
    }
    setIsLoading(true);
    try {
      const { error } = await services.api.createDatabase({
        databaseType: databaseType!,
        databaseName,
        maxmind,
      });
      setIsLoading(false);
      if (error) {
        services.notifications.toasts.addError(error, {
          title: addDatabaseErrorTitle,
        });
      } else {
        services.notifications.toasts.addSuccess(getAddDatabaseSuccessMessage(databaseName));
        await reloadDatabases();
        closeModal();
      }
    } catch (e) {
      setIsLoading(false);
      services.notifications.toasts.addError(e, {
        title: addDatabaseErrorTitle,
      });
    }
  };

  return (
    <EuiModal
      css={css`
        width: 500px;
      `}
      aria-labelledby={ADD_DATABASE_MODAL_TITLE_ID}
      onClose={closeModal}
      initialFocus={'[data-test-subj="databaseTypeSelect"]'}
    >
      <EuiModalHeader>
        <EuiModalHeaderTitle id={ADD_DATABASE_MODAL_TITLE_ID}>
          <FormattedMessage
            id="xpack.ingestPipelines.manageProcessors.geoip.addDatabaseModalTitle"
            defaultMessage="Add database"
          />
        </EuiModalHeaderTitle>
      </EuiModalHeader>

      <EuiModalBody>
        <EuiForm
          fullWidth={true}
          id={ADD_DATABASE_MODAL_FORM_ID}
          component="form"
          onSubmit={(event) => onAddDatabase(event)}
          data-test-subj="addGeoipDatabaseForm"
        >
          <EuiFormRow
            label={
              <FormattedMessage
                id="xpack.ingestPipelines.manageProcessors.geoip.addDatabaseForm.databaseTypeSelectLabel"
                defaultMessage="Type"
              />
            }
            helpText={
              <FormattedMessage
                id="xpack.ingestPipelines.manageProcessors.geoip.addDatabaseForm.databaseTypeSelectHelpText"
                defaultMessage="Select the provider you want to use."
              />
            }
          >
            <EuiSelect
              options={DATABASE_TYPE_OPTIONS}
              hasNoInitialSelection={true}
              value={databaseType}
              onChange={(e) => onDatabaseTypeChange(e.target.value)}
              data-test-subj="databaseTypeSelect"
            />
          </EuiFormRow>
          {databaseType === 'maxmind' && (
            <>
              <EuiSpacer />
              <EuiCallOut
                title={
                  <FormattedMessage
                    id="xpack.ingestPipelines.manageProcessors.geoip.licenseCalloutTitle"
                    defaultMessage="Add your MaxMind license token to the keystore"
                  />
                }
                iconType="iInCircle"
              >
                <p>
                  <FormattedMessage
                    id="xpack.ingestPipelines.manageProcessors.geoip.licenseCalloutText"
                    defaultMessage="The processor needs the license key to connect to the database."
                  />
                </p>
              </EuiCallOut>
              <EuiSpacer />
            </>
          )}
          {databaseType === 'ipinfo' && (
            <>
              <EuiSpacer />
              <EuiCallOut
                title={
                  <FormattedMessage
                    id="xpack.ingestPipelines.manageProcessors.geoip.licenseCalloutTitle"
                    defaultMessage="Add your IP Info license token to the keystore"
                  />
                }
                iconType="iInCircle"
              >
                <p>
                  <FormattedMessage
                    id="xpack.ingestPipelines.manageProcessors.geoip.licenseCalloutText"
                    defaultMessage="The processor needs the license key to connect to the database."
                  />
                </p>
              </EuiCallOut>
              <EuiSpacer />
            </>
          )}

          {databaseType === 'maxmind' && (
            <EuiFormRow
              label={
                <FormattedMessage
                  id="xpack.ingestPipelines.manageProcessors.geoip.addDatabaseForm.maxMindInputLabel"
                  defaultMessage="MaxMind Account ID"
                />
              }
            >
              <EuiFieldText
                value={maxmind}
                onChange={(e) => setMaxmind(e.target.value)}
                data-test-subj="maxmindField"
              />
            </EuiFormRow>
          )}
          {databaseType && (
            <EuiFormRow
              label={
                <FormattedMessage
                  id="xpack.ingestPipelines.manageProcessors.geoip.addDatabaseForm.databaseNameSelectLabel"
                  defaultMessage="Database name"
                />
              }
            >
              <EuiSelect
                options={databaseType === 'maxmind' ? GEOIP_NAME_OPTIONS : IPINFO_NAME_OPTIONS}
                hasNoInitialSelection={true}
                value={databaseName}
                onChange={(e) => onDatabaseNameChange(e.target.value)}
                data-test-subj="databaseNameSelect"
              />
            </EuiFormRow>
          )}
        </EuiForm>

        {nameExistsError && (
          <>
            <EuiSpacer />
            <EuiCallOut
              color="danger"
              title={
                <FormattedMessage
                  id="xpack.ingestPipelines.manageProcessors.geoip.nameExistsErrorTitle"
                  defaultMessage="Database already exists"
                />
              }
              iconType="warning"
            >
              <p>
                <FormattedMessage
                  id="xpack.ingestPipelines.manageProcessors.geoip.nameExistsErrorText"
                  defaultMessage="A database needs to be added only once in order to be available."
                />
              </p>
            </EuiCallOut>
          </>
        )}
      </EuiModalBody>

      <EuiModalFooter>
        <EuiButtonEmpty onClick={closeModal}>
          <FormattedMessage
            id="xpack.ingestPipelines.manageProcessors.geoip.addModalCancelButtonLabel"
            defaultMessage="Cancel"
          />
        </EuiButtonEmpty>

        <EuiButton
          fill
          type="submit"
          form={ADD_DATABASE_MODAL_FORM_ID}
          disabled={isLoading || !isFormValid()}
          data-test-subj="addGeoipDatabaseSubmit"
        >
          <FormattedMessage
            id="xpack.ingestPipelines.manageProcessors.geoip.addModalConfirmButtonLabel"
            defaultMessage="Add database"
          />
        </EuiButton>
      </EuiModalFooter>
    </EuiModal>
  );
};
