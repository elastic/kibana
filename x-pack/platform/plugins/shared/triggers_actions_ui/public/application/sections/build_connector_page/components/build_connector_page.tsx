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
import { useBuildConnectorForm } from '../hooks/use_build_connector_form';
import { getEmptyFormData } from '../lib/form_serializers';

/** Router state the connectors list passes along when a draft was handed off from chat. */
export interface BuildConnectorPageLocationState {
  initialDefinition?: CreateConnectorTypeRequest;
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

  useEffect(() => {
    setBreadcrumbs([
      getAlertingSectionBreadcrumb('connectors', true),
      getAlertingSectionBreadcrumb('buildConnector'),
    ]);
    chrome.docTitle.change(getCurrentDocTitle('buildConnector'));
  }, [chrome, setBreadcrumbs]);

  const goToConnectors = useCallback(() => history.push(routeToConnectors), [history]);
  const { methods, isSaving, isSubmitting, createConnectorTypeError, onApplyDefinition, submit } =
    useBuildConnectorForm({
      onCreated: goToConnectors,
      initialDefinition: state?.initialDefinition,
    });
  const { errors, isSubmitted } = methods.formState;

  const openEditorWithDefinition = useCallback(
    (definition: Partial<CreateConnectorTypeRequest>) => {
      onApplyDefinition(definition);
      setHasPrefilledDefinition(true);
      setShowEditor(true);
    },
    [onApplyDefinition]
  );

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
          <ConnectorDetailsFields />
        </>
      ),
    },
    {
      title: STEP_TITLES.config,
      status: stepStatus(stepErrors[1]),
      'data-test-subj': 'build-connector-page-step-config',
      children: <ConfigFieldListEditor />,
    },
    {
      title: STEP_TITLES.actions,
      status: stepStatus(stepErrors[2]),
      'data-test-subj': 'build-connector-page-step-actions',
      children: <ActionListEditor />,
    },
    {
      title: STEP_TITLES.test,
      status: stepStatus(stepErrors[3]),
      'data-test-subj': 'build-connector-page-step-test',
      children: <ConnectionTestEditor />,
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
          href: history.createHref({ pathname: routeToConnectors }),
          label: i18n.translate('xpack.triggersActionsUI.sections.buildConnectorPage.backLabel', {
            defaultMessage: 'Connectors',
          }),
        }}
        spacing="bleed"
      />
      <EuiSpacer size="l" />
      {showEditor ? (
        <>
          <EuiPageTemplate.Section grow={false} paddingSize="none" restrictWidth>
            <EuiButtonEmpty
              onClick={backToStart}
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
              <EuiForm data-test-subj="build-connector-form">
                <EuiSteps headingElement="h2" steps={steps} />
              </EuiForm>
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
              {invalidStepCount > 0 && (
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
                  onClick={goToConnectors}
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
                  isLoading={isSaving || isSubmitting}
                  onClick={submit}
                  data-test-subj="build-connector-page-save-btn"
                >
                  <FormattedMessage
                    id="xpack.triggersActionsUI.sections.buildConnectorPage.saveButtonLabel"
                    defaultMessage="Save"
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
        />
      )}
    </>
  );
};
