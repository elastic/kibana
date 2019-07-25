/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiButton, EuiCallOut, EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import { FormattedMessage, injectI18n, InjectedIntl } from '@kbn/i18n/react';
import React, { useCallback, useContext, useMemo } from 'react';

import { Source } from '../../containers/source';
import { FieldsConfigurationPanel } from './fields_configuration_panel';
import { IndicesConfigurationPanel } from './indices_configuration_panel';
import { NameConfigurationPanel } from './name_configuration_panel';
import { LogColumnsConfigurationPanel } from './log_columns_configuration_panel';
import { useSourceConfigurationFormState } from './source_configuration_form_state';

interface SourceConfigurationSettingsProps {
  intl: InjectedIntl;
  shouldAllowEdit: boolean;
}

export const SourceConfigurationSettings = injectI18n(
  ({ intl, shouldAllowEdit }: SourceConfigurationSettingsProps) => {
    const {
      createSourceConfiguration,
      source,
      sourceExists,
      isLoading,
      updateSourceConfiguration,
    } = useContext(Source.Context);

    const availableFields = useMemo(
      () => (source && source.status ? source.status.indexFields.map(field => field.name) : []),
      [source]
    );

    const {
      addLogColumn,
      moveLogColumn,
      indicesConfigurationProps,
      logColumnConfigurationProps,
      errors,
      resetForm,
      isFormDirty,
      isFormValid,
      formState,
      formStateChanges,
    } = useSourceConfigurationFormState(source && source.configuration);

    const persistUpdates = useCallback(async () => {
      if (sourceExists) {
        await updateSourceConfiguration(formStateChanges);
      } else {
        await createSourceConfiguration(formState);
      }
      resetForm();
    }, [
      sourceExists,
      updateSourceConfiguration,
      createSourceConfiguration,
      resetForm,
      formState,
      formStateChanges,
    ]);

    const isWriteable = useMemo(() => shouldAllowEdit && source && source.origin !== 'internal', [
      shouldAllowEdit,
      source,
    ]);

    if (!source || !source.configuration) {
      return null;
    }

    return (
      <>
        <NameConfigurationPanel
          isLoading={isLoading}
          nameFieldProps={indicesConfigurationProps.name}
          readOnly={!isWriteable}
        />
        <EuiSpacer />
        <IndicesConfigurationPanel
          isLoading={isLoading}
          logAliasFieldProps={indicesConfigurationProps.logAlias}
          metricAliasFieldProps={indicesConfigurationProps.metricAlias}
          readOnly={!isWriteable}
        />
        <EuiSpacer />
        <FieldsConfigurationPanel
          containerFieldProps={indicesConfigurationProps.containerField}
          hostFieldProps={indicesConfigurationProps.hostField}
          isLoading={isLoading}
          podFieldProps={indicesConfigurationProps.podField}
          readOnly={!isWriteable}
          tiebreakerFieldProps={indicesConfigurationProps.tiebreakerField}
          timestampFieldProps={indicesConfigurationProps.timestampField}
        />
        <EuiSpacer />
        <LogColumnsConfigurationPanel
          addLogColumn={addLogColumn}
          moveLogColumn={moveLogColumn}
          availableFields={availableFields}
          isLoading={isLoading}
          logColumnConfiguration={logColumnConfigurationProps}
        />

        {errors.length > 0 ? (
          <>
            <EuiCallOut color="danger">
              <ul>
                {errors.map((error, errorIndex) => (
                  <li key={errorIndex}>{error}</li>
                ))}
              </ul>
            </EuiCallOut>
            <EuiSpacer size="m" />
          </>
        ) : null}

        <EuiFlexGroup>
          <EuiFlexItem />
          {isWriteable && (
            <EuiFlexItem grow={false}>
              {isLoading ? (
                <EuiButton color="primary" isLoading fill>
                  Loading
                </EuiButton>
              ) : (
                <EuiButton
                  data-test-subj="updateSourceConfigurationButton"
                  color="primary"
                  isDisabled={!isFormDirty || !isFormValid}
                  fill
                  onClick={persistUpdates}
                >
                  <FormattedMessage
                    id="xpack.infra.sourceConfiguration.updateSourceConfigurationButtonLabel"
                    defaultMessage="Update Source"
                  />
                </EuiButton>
              )}
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      </>
    );
  }
);
