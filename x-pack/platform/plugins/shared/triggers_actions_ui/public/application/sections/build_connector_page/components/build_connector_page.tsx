/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  EuiFormErrorText,
  EuiPageTemplate,
  EuiSpacer,
  EuiSteps,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import type { EuiStepsProps, EuiStepStatus } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { AppHeader } from '@kbn/app-header';
import { FormProvider } from 'react-hook-form';
import type { CreateConnectorTypeRequest } from '@kbn/actions-plugin/common';
import type { DynamicConnectorType } from '../../../lib/action_connector_api/dynamic_connector_types';
import {
  fetchDynamicConnectorTypeDefinition,
  fetchDynamicConnectorTypes,
  updateDynamicConnectorTypeEditable,
} from '../../../lib/action_connector_api';
import { useKibana } from '../../../../common/lib/kibana';
import { routeToConnectors } from '../../../constants';
import { getAlertingSectionBreadcrumb } from '../../../lib/breadcrumb';
import { getCurrentDocTitle } from '../../../lib/doc_title';
import { ActionListEditor } from './action_list_editor';
import { CreateConnectorTypeErrorCallout } from './create_connector_type_error_callout';
import { ConfigFieldListEditor } from './config_field_list_editor';
import { ConnectionTestEditor } from './connection_test_editor';
import { ConnectorDetailsFields } from './connector_details_fields';
import { BuildConnectorStart } from './build_connector_start';
import { ConnectorTypeReadOnlyContext } from './connector_type_read_only_context';
import { useBuildConnectorForm } from '../hooks/use_build_connector_form';
import { formDataToRequest, getEmptyFormData, requestToFormData } from '../lib/form_serializers';

/** Router state the connectors list passes along when a draft was handed off from chat. */
export interface BuildConnectorPageLocationState {
  initialDefinition?: CreateConnectorTypeRequest & { logoUrl?: string };
}

const TITLE = i18n.translate('xpack.triggersActionsUI.sections.buildConnectorPage.title', {
  defaultMessage: 'Connector type builder',
});

const STEP_TITLES = {
  details: i18n.translate('xpack.triggersActionsUI.sections.buildConnectorPage.detailsStepTitle', {
    defaultMessage: 'Connector details',
  }),
  config: i18n.translate('xpack.triggersActionsUI.sections.buildConnectorPage.configStepTitle', {
    defaultMessage: 'Configuration fields',
  }),
  actions: i18n.translate('xpack.triggersActionsUI.sections.buildConnectorPage.actionsStepTitle', {
    defaultMessage: 'Actions',
  }),
  test: i18n.translate('xpack.triggersActionsUI.sections.buildConnectorPage.testStepTitle', {
    defaultMessage: 'Connection test',
  }),
};

export const BuildConnectorPage: React.FC = () => {
  const { chrome, setBreadcrumbs, overlays } = useKibana().services;
  const history = useHistory();
  const { euiTheme } = useEuiTheme();
  const { state } = useLocation<BuildConnectorPageLocationState | undefined>();
  const [showEditor, setShowEditor] = useState(Boolean(state?.initialDefinition));
  const [hasPrefilledDefinition, setHasPrefilledDefinition] = useState(
    Boolean(state?.initialDefinition)
  );
  const [dynamicConnectorTypes, setDynamicConnectorTypes] = useState<DynamicConnectorType[]>([]);
  const [dynamicConnectorTypesLoading, setDynamicConnectorTypesLoading] = useState(true);
  const [dynamicConnectorTypesError, setDynamicConnectorTypesError] = useState<string>();
  const [editingConnectorType, setEditingConnectorType] = useState<DynamicConnectorType>();
  const [metadataSaving, setMetadataSaving] = useState(false);
  const [metadataError, setMetadataError] = useState<string>();
  const [editingDefinitionLoading, setEditingDefinitionLoading] = useState(false);
  const { http } = useKibana().services;

  const refreshDynamicTypes = useCallback(async () => {
    setDynamicConnectorTypesLoading(true);
    setDynamicConnectorTypesError(undefined);
    try {
      const connectorTypes = await fetchDynamicConnectorTypes({ http });
      setDynamicConnectorTypes(Array.isArray(connectorTypes) ? connectorTypes : []);
    } catch {
      setDynamicConnectorTypesError(
        i18n.translate('xpack.triggersActionsUI.sections.buildConnectorPage.loadTypesError', {
          defaultMessage: 'Unable to load created connector types.',
        })
      );
    } finally {
      setDynamicConnectorTypesLoading(false);
    }
  }, [http]);

  useEffect(() => {
    void refreshDynamicTypes();
  }, [refreshDynamicTypes]);

  useEffect(() => {
    setBreadcrumbs([
      getAlertingSectionBreadcrumb('connectors', true),
      getAlertingSectionBreadcrumb('buildConnector'),
    ]);
    chrome.docTitle.change(getCurrentDocTitle('buildConnector'));
  }, [chrome, setBreadcrumbs]);

  const goToConnectors = useCallback(() => history.push(routeToConnectors), [history]);
  const {
    methods,
    isSaving,
    isSubmitting,
    createConnectorTypeError,
    onApplyDefinition,
    submit,
    loadPendingLogo,
  } = useBuildConnectorForm({
    onCreated: async () => {
      await refreshDynamicTypes();
      goToConnectors();
    },
    initialDefinition: state?.initialDefinition,
  });
  const { errors, isSubmitted } = methods.formState;
  const isEditMode = Boolean(editingConnectorType);

  const openEditorWithDefinition = useCallback(
    (definition: Partial<CreateConnectorTypeRequest> & { logoUrl?: string }) => {
      onApplyDefinition(definition);
      setHasPrefilledDefinition(true);
      setShowEditor(true);
    },
    [onApplyDefinition]
  );

  const openMetadataEditor = useCallback(
    async (connectorType: DynamicConnectorType) => {
      setEditingDefinitionLoading(true);
      setMetadataError(undefined);
      try {
        const definition = await fetchDynamicConnectorTypeDefinition({
          http,
          id: connectorType.id,
        });
        methods.reset(requestToFormData(definition));
        setEditingConnectorType(connectorType);
        setHasPrefilledDefinition(true);
        setShowEditor(true);
      } catch {
        setDynamicConnectorTypesError(
          i18n.translate(
            'xpack.triggersActionsUI.sections.buildConnectorPage.loadDefinitionError',
            {
              defaultMessage: 'Unable to load this connector type definition.',
            }
          )
        );
      } finally {
        setEditingDefinitionLoading(false);
      }
    },
    [http, methods]
  );

  const saveMetadata = useCallback(async () => {
    if (!editingConnectorType) return;
    setMetadataSaving(true);
    setMetadataError(undefined);
    try {
      if (!(await loadPendingLogo(false))) return;
      const { displayName, description, icon } = methods.getValues();
      if (!displayName.trim() || displayName.length > 512 || description.length > 1000) {
        setMetadataError(
          i18n.translate('xpack.triggersActionsUI.sections.buildConnectorPage.invalidMetadata', {
            defaultMessage:
              'Name is required and must be at most 512 characters. Description must be at most 1000 characters.',
          })
        );
        return;
      }
      await updateDynamicConnectorTypeEditable({
        http,
        id: editingConnectorType.id,
        displayName,
        description,
        icon: icon || undefined,
        test: formDataToRequest(methods.getValues()).test,
      });
      setEditingConnectorType(undefined);
      await refreshDynamicTypes();
      goToConnectors();
    } catch (error) {
      setMetadataError(
        typeof error === 'object' && error !== null && 'body' in error
          ? String(
              (error as { body?: { message?: string } }).body?.message ??
                'Unable to update connector type metadata.'
            )
          : 'Unable to update connector type metadata.'
      );
    } finally {
      setMetadataSaving(false);
    }
  }, [editingConnectorType, http, goToConnectors, loadPendingLogo, methods, refreshDynamicTypes]);

  const backFromEdit = useCallback(() => {
    setEditingConnectorType(undefined);
    setShowEditor(false);
    setHasPrefilledDefinition(false);
    setMetadataError(undefined);
  }, []);

  const startFromScratch = useCallback(() => {
    methods.reset(getEmptyFormData());
    setHasPrefilledDefinition(false);
    setShowEditor(true);
  }, [methods]);

  const backToStart = useCallback(async () => {
    if (methods.formState.isDirty || hasPrefilledDefinition) {
      const confirmed = await overlays.openConfirm(
        i18n.translate('xpack.triggersActionsUI.sections.buildConnectorPage.leaveEditorMessage', {
          defaultMessage: 'Your connector type draft will be discarded.',
        }),
        {
          title: i18n.translate(
            'xpack.triggersActionsUI.sections.buildConnectorPage.leaveEditorTitle',
            { defaultMessage: 'Back to start?' }
          ),
          confirmButtonText: i18n.translate(
            'xpack.triggersActionsUI.sections.buildConnectorPage.leaveEditorConfirm',
            { defaultMessage: 'Discard draft' }
          ),
          buttonColor: 'danger',
        }
      );
      if (!confirmed) return;
    }
    setHasPrefilledDefinition(false);
    setShowEditor(false);
  }, [hasPrefilledDefinition, methods.formState.isDirty, overlays]);

  // A step is flagged once a save attempt has shown it still has errors, as the rule form does.
  const stepStatus = (hasErrors: boolean): EuiStepStatus | undefined =>
    isSubmitted && hasErrors ? 'danger' : undefined;

  const stepErrors = [
    Boolean(errors.displayName || errors.id || errors.description || errors.auth || errors.root),
    Boolean(errors.config),
    Boolean(errors.actions),
    Boolean(errors.test),
  ];
  const invalidStepCount = isSubmitted ? stepErrors.filter(Boolean).length : 0;

  const stickyFooterCss = css({
    position: 'sticky',
    bottom: 0,
    zIndex: euiTheme.levels.header,
    backgroundColor: euiTheme.colors.backgroundBasePlain,
    borderTop: euiTheme.border.thin,
    padding: `${euiTheme.size.m} 0`,
    marginTop: euiTheme.size.l,
  });

  const steps: EuiStepsProps['steps'] = [
    {
      title: STEP_TITLES.details,
      status: stepStatus(stepErrors[0]),
      'data-test-subj': 'build-connector-page-step-details',
      children: (
        <>
          {errors.root?.message && (
            <EuiFormErrorText data-test-subj="build-connector-page-definition-error">
              {errors.root.message}
            </EuiFormErrorText>
          )}
          <ConnectorDetailsFields metadataOnly={isEditMode} />
        </>
      ),
    },
    {
      title: STEP_TITLES.config,
      status: stepStatus(stepErrors[1]),
      'data-test-subj': 'build-connector-page-step-config',
      children: (
        <fieldset disabled={isEditMode} css={{ border: 0, padding: 0, margin: 0 }}>
          <ConfigFieldListEditor />
        </fieldset>
      ),
    },
    {
      title: STEP_TITLES.actions,
      status: stepStatus(stepErrors[2]),
      'data-test-subj': 'build-connector-page-step-actions',
      children: <ActionListEditor readOnly={isEditMode} />,
    },
    {
      title: STEP_TITLES.test,
      status: stepStatus(stepErrors[3]),
      'data-test-subj': 'build-connector-page-step-test',
      children: (
        <ConnectorTypeReadOnlyContext.Provider value={false}>
          <fieldset css={{ border: 0, padding: 0, margin: 0 }}>
            <ConnectionTestEditor />
          </fieldset>
        </ConnectorTypeReadOnlyContext.Provider>
      ),
    },
  ];

  return (
    <>
      <AppHeader
        title={TITLE}
        description={
          showEditor
            ? i18n.translate('xpack.triggersActionsUI.sections.buildConnectorPage.description', {
                defaultMessage:
                  'Define a custom HTTP connector type from its configuration, authentication and actions.',
              })
            : undefined
        }
        back={{
          href: history.createHref({
            pathname: showEditor ? history.location.pathname : routeToConnectors,
          }),
          label: showEditor
            ? i18n.translate(
                'xpack.triggersActionsUI.sections.buildConnectorPage.backToBuilderStartLabel',
                { defaultMessage: 'Connector type builder' }
              )
            : i18n.translate('xpack.triggersActionsUI.sections.buildConnectorPage.backLabel', {
                defaultMessage: 'Connectors',
              }),
          ...(showEditor
            ? {
                onClick: (event) => {
                  event.preventDefault();
                  if (isEditMode) backFromEdit();
                  else void backToStart();
                },
              }
            : {}),
        }}
        spacing="bleed"
      />
      <EuiSpacer size="l" />
      {showEditor ? (
        <>
          <EuiPageTemplate.Section grow={false} paddingSize="none" restrictWidth>
            <EuiButtonEmpty
              onClick={isEditMode ? backFromEdit : backToStart}
              isDisabled={isSaving}
              data-test-subj="build-connector-page-back-to-start"
            >
              {i18n.translate('xpack.triggersActionsUI.sections.buildConnectorPage.backToStart', {
                defaultMessage: 'Back to start',
              })}
            </EuiButtonEmpty>
          </EuiPageTemplate.Section>
          <EuiSpacer size="m" />
          <EuiPageTemplate.Section
            grow={false}
            paddingSize="none"
            restrictWidth
            data-test-subj="build-connector-page"
          >
            <CreateConnectorTypeErrorCallout
              createConnectorTypeError={createConnectorTypeError}
              data-test-subj="build-connector-page-api-error"
            />
            <FormProvider {...methods}>
              <ConnectorTypeReadOnlyContext.Provider value={isEditMode}>
                <EuiForm data-test-subj="build-connector-form">
                  {metadataError && <EuiFormErrorText>{metadataError}</EuiFormErrorText>}
                  {isEditMode && (
                    <EuiText size="s" color="subdued">
                      <p>
                        {i18n.translate(
                          'xpack.triggersActionsUI.sections.buildConnectorPage.readOnlyDefinitionMessage',
                          {
                            defaultMessage:
                              'The connector ID, authentication, configuration fields and actions cannot be changed after creation.',
                          }
                        )}
                      </p>
                    </EuiText>
                  )}
                  <EuiSteps headingElement="h2" steps={steps} />
                </EuiForm>
              </ConnectorTypeReadOnlyContext.Provider>
            </FormProvider>
          </EuiPageTemplate.Section>
          <EuiPageTemplate.Section
            grow={false}
            paddingSize="none"
            restrictWidth
            css={stickyFooterCss}
            data-test-subj="build-connector-page-footer"
          >
            <EuiFlexGroup
              justifyContent="flexEnd"
              alignItems="center"
              gutterSize="s"
              responsive={false}
            >
              {!isEditMode && invalidStepCount > 0 && (
                <EuiFlexItem>
                  <EuiText
                    size="s"
                    color="danger"
                    data-test-subj="build-connector-page-error-summary"
                  >
                    <FormattedMessage
                      id="xpack.triggersActionsUI.sections.buildConnectorPage.errorSummary"
                      defaultMessage="{count, plural, one {# step needs} other {# steps need}} attention before saving."
                      values={{ count: invalidStepCount }}
                    />
                  </EuiText>
                </EuiFlexItem>
              )}
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty
                  onClick={isEditMode ? backFromEdit : goToConnectors}
                  isDisabled={isSaving}
                  data-test-subj="build-connector-page-cancel-btn"
                >
                  {i18n.translate(
                    'xpack.triggersActionsUI.sections.buildConnectorPage.cancelButtonLabel',
                    { defaultMessage: 'Cancel' }
                  )}
                </EuiButtonEmpty>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButton
                  fill
                  color="primary"
                  isLoading={isEditMode ? metadataSaving || isSubmitting : isSaving || isSubmitting}
                  onClick={isEditMode ? saveMetadata : submit}
                  data-test-subj="build-connector-page-save-btn"
                >
                  <FormattedMessage
                    id="xpack.triggersActionsUI.sections.buildConnectorPage.saveButtonLabel"
                    defaultMessage="{isEditMode, select, true {Save changes} other {Save}}"
                    values={{ isEditMode: isEditMode ? 'true' : 'false' }}
                  />
                </EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiPageTemplate.Section>
        </>
      ) : (
        <BuildConnectorStart
          onApply={openEditorWithDefinition}
          onStartFromScratch={startFromScratch}
          dynamicConnectorTypes={dynamicConnectorTypes}
          dynamicConnectorTypesLoading={dynamicConnectorTypesLoading}
          dynamicConnectorTypesError={dynamicConnectorTypesError}
          onRetryDynamicConnectorTypes={refreshDynamicTypes}
          onEdit={openMetadataEditor}
          editingDefinitionLoading={editingDefinitionLoading}
        />
      )}
    </>
  );
};
