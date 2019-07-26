/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSpacer,
  EuiPage,
  EuiPageBody,
  EuiPageContent,
  EuiPageContentBody,
} from '@elastic/eui';
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
        <EuiPage>
          <EuiPageBody>
            <EuiPageContent verticalPosition="center" horizontalPosition="center">
              <EuiPageContentBody>
                <EuiPanel paddingSize="l">
                  <NameConfigurationPanel
                    isLoading={isLoading}
                    nameFieldProps={indicesConfigurationProps.name}
                    readOnly={!isWriteable}
                  />
                </EuiPanel>
                <EuiSpacer />
                <EuiPanel paddingSize="l">
                  <IndicesConfigurationPanel
                    isLoading={isLoading}
                    logAliasFieldProps={indicesConfigurationProps.logAlias}
                    metricAliasFieldProps={indicesConfigurationProps.metricAlias}
                    readOnly={!isWriteable}
                  />
                </EuiPanel>
                <EuiSpacer />
                <EuiPanel paddingSize="l">
                  <FieldsConfigurationPanel
                    containerFieldProps={indicesConfigurationProps.containerField}
                    hostFieldProps={indicesConfigurationProps.hostField}
                    isLoading={isLoading}
                    podFieldProps={indicesConfigurationProps.podField}
                    readOnly={!isWriteable}
                    tiebreakerFieldProps={indicesConfigurationProps.tiebreakerField}
                    timestampFieldProps={indicesConfigurationProps.timestampField}
                  />
                </EuiPanel>
                <EuiSpacer />
                <EuiPanel paddingSize="l">
                  <LogColumnsConfigurationPanel
                    addLogColumn={addLogColumn}
                    moveLogColumn={moveLogColumn}
                    availableFields={availableFields}
                    isLoading={isLoading}
                    logColumnConfiguration={logColumnConfigurationProps}
                  />
                </EuiPanel>
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
                <EuiSpacer size="m" />
                <EuiFlexGroup>
                  {isWriteable && (
                    <EuiFlexItem grow={false}>
                      {isLoading ? (
                        <EuiButton color="primary" isLoading fill>
                          Loading
                        </EuiButton>
                      ) : (
                        <>
                          <EuiButton
                            data-test-subj="discardSettingsButton"
                            color="danger"
                            iconType="cross"
                            isDisabled={isLoading || !isFormDirty}
                            onClick={() => {
                              resetForm();
                            }}
                          >
                            <FormattedMessage
                              id="xpack.infra.sourceConfiguration.discardSettingsButtonLabel"
                              defaultMessage="Discard"
                            />
                          </EuiButton>
                          <EuiButton
                            data-test-subj="applySettingsButton"
                            color="primary"
                            isDisabled={!isFormDirty || !isFormValid}
                            fill
                            onClick={persistUpdates}
                          >
                            <FormattedMessage
                              id="xpack.infra.sourceConfiguration.applySettingsButtonLabel"
                              defaultMessage="Apply"
                            />
                          </EuiButton>
                        </>
                      )}
                    </EuiFlexItem>
                  )}
                </EuiFlexGroup>
              </EuiPageContentBody>
            </EuiPageContent>
          </EuiPageBody>
        </EuiPage>
      </>
    );
  }
);
