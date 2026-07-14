/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import { css } from '@emotion/react';

import type { EuiThemeComputed } from '@elastic/eui';
import {
  EuiButtonEmpty,
  EuiCallOut,
  EuiFlexItem,
  EuiLink,
  EuiPageBody,
  EuiPageSection,
  EuiSpacer,
  useEuiTheme,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

import type {
  CustomFieldConfiguration,
  TemplateConfiguration,
  CustomFieldTypes,
} from '../../../common/types/domain';
import { Connectors } from './connectors';
import { ClosureOptions } from './closure_options';
import * as i18n from './translations';
import { addOrReplaceField } from '../utils';
import { HeaderPage } from '../header_page';
import { useCasesBreadcrumbs } from '../use_breadcrumbs';
import { CasesDeepLinkId } from '../../common/navigation';
import { useAllCasesNavigation } from '../../common/navigation/hooks';
import { CustomFields } from '../custom_fields';
import { CommonFlyout } from './flyout';
import { Templates } from '../templates';
import type { TemplateFormProps } from '../templates/types';
import { CustomFieldsForm } from '../custom_fields/form';
import { TemplateForm } from '../templates/form';
import type { CasesConfigurationUI, CaseUI } from '../../containers/types';
import { builderMap as customFieldsBuilderMap } from '../custom_fields/builder';
import { ObservableTypes } from '../observable_types';
import { KibanaServices, useKibana } from '../../common/lib/kibana';
import { useGetCaseConfiguration } from '../../containers/configure/use_get_case_configuration';
import { useCasesContext } from '../cases_context/use_cases_context';
import { useConfigureCasesController } from './use_configure_cases_controller';

const sectionWrapperCss = css`
  box-sizing: content-box;
  max-width: 1175px;
  width: 100%;
`;

const getFormWrapperCss = (euiTheme: EuiThemeComputed<{}>) => css`
  padding-top: ${euiTheme.size.xl};
  padding-bottom: ${euiTheme.size.xl};
  .euiFlyout {
    z-index: ${Number(euiTheme.levels.navigation) + 1};
  }
`;

type LegacyFlyoutType = 'customField' | 'template';

const addNewCustomFieldToTemplates = ({
  templates,
  customFields,
}: Pick<CasesConfigurationUI, 'templates' | 'customFields'>) => {
  return templates.map((template) => {
    const templateCustomFields = template.caseFields?.customFields ?? [];

    customFields.forEach((field) => {
      if (
        !templateCustomFields.length ||
        !templateCustomFields.find((templateCustomField) => templateCustomField.key === field.key)
      ) {
        const customFieldFactory = customFieldsBuilderMap[field.type];
        const { getDefaultValue } = customFieldFactory();
        const value = getDefaultValue?.() ?? null;

        templateCustomFields.push({
          key: field.key,
          type: field.type as CustomFieldTypes,
          value: field.defaultValue ?? value,
        } as CaseUI['customFields'][number]);
      }
    });

    return {
      ...template,
      caseFields: {
        ...template.caseFields,
        customFields: [...templateCustomFields],
      },
    };
  });
};

export const ConfigureCases: React.FC = React.memo(() => {
  useCasesBreadcrumbs(CasesDeepLinkId.casesConfigure);
  const { navigateToAllCases } = useAllCasesNavigation();
  const isTemplatesEnabled = KibanaServices.getConfig()?.templates?.enabled ?? false;
  const [customFieldToEdit, setCustomFieldToEdit] = useState<CustomFieldConfiguration | null>(null);
  const [templateToEdit, setTemplateToEdit] = useState<TemplateConfiguration | null>(null);
  const { euiTheme } = useEuiTheme();
  const { permissions } = useCasesContext();
  const { docLinks } = useKibana().services;
  // Only the legacy templates section needs the full configuration object; the shared
  // hook already exposes the individual fields it needs for the connector/closure/
  // observable-types logic.
  const { data: currentConfiguration } = useGetCaseConfiguration();

  const {
    hasMinimumLicensePermissions,
    hasMinimumLicensePermissionsForObservables,
    isObservablesFeatureEnabled,
    configurationId,
    configurationVersion,
    closureType,
    connector,
    mappings,
    customFields,
    templates,
    observableTypes,
    isPersistingConfiguration,
    isLoadingCaseConfiguration,
    isLoadingConnectors,
    connectors,
    actionTypes,
    isLoadingAny,
    connectorIsValid,
    updateConnectorDisabled,
    flyOutVisibility,
    setFlyOutVisibility,
    persistCaseConfigure,
    onClickUpdateConnector,
    onAddNewConnector,
    onChangeConnector,
    onChangeClosureType,
    ConnectorAddFlyout,
    ConnectorEditFlyout,
    onEditObservableType,
    onDeleteObservableType,
    AddOrEditObservableTypeFlyout,
  } = useConfigureCasesController<LegacyFlyoutType>();

  const onDeleteCustomField = useCallback(
    (key: string) => {
      const remainingCustomFields = customFields.filter((field) => field.key !== key);

      // delete the same custom field from each template as well
      const templatesWithRemainingCustomFields = templates.map((template) => {
        const templateCustomFields =
          template.caseFields?.customFields?.filter((field) => field.key !== key) ?? [];

        return {
          ...template,
          caseFields: {
            ...template.caseFields,
            customFields: [...templateCustomFields],
          },
        };
      });

      persistCaseConfigure({
        connector,
        customFields: [...remainingCustomFields],
        templates: [...templatesWithRemainingCustomFields],
        id: configurationId,
        version: configurationVersion,
        closureType,
      });
    },
    [
      closureType,
      configurationId,
      configurationVersion,
      connector,
      customFields,
      templates,
      persistCaseConfigure,
    ]
  );

  const onEditCustomField = useCallback(
    (key: string) => {
      const selectedCustomField = customFields.find((item) => item.key === key);

      if (selectedCustomField) {
        setCustomFieldToEdit(selectedCustomField);
      }
      setFlyOutVisibility({ type: 'customField', visible: true });
    },
    [customFields, setFlyOutVisibility]
  );

  const onCloseCustomFieldFlyout = useCallback(() => {
    setFlyOutVisibility({ type: 'customField', visible: false });
    setCustomFieldToEdit(null);
  }, [setFlyOutVisibility]);

  const onCustomFieldSave = useCallback(
    (data: CustomFieldConfiguration) => {
      const updatedCustomFields = addOrReplaceField(customFields, data);

      // add the new custom field to each template as well
      const updatedTemplates = addNewCustomFieldToTemplates({
        templates,
        customFields: updatedCustomFields,
      });

      persistCaseConfigure({
        connector,
        customFields: updatedCustomFields,
        templates: updatedTemplates,
        id: configurationId,
        version: configurationVersion,
        closureType,
      });

      setFlyOutVisibility({ type: 'customField', visible: false });
      setCustomFieldToEdit(null);
    },
    [
      closureType,
      configurationId,
      configurationVersion,
      connector,
      customFields,
      templates,
      persistCaseConfigure,
      setFlyOutVisibility,
    ]
  );

  const onDeleteTemplate = useCallback(
    (key: string) => {
      const remainingTemplates = templates.filter((field) => field.key !== key);

      persistCaseConfigure({
        connector,
        customFields,
        templates: [...remainingTemplates],
        id: configurationId,
        version: configurationVersion,
        closureType,
      });
    },
    [
      closureType,
      configurationId,
      configurationVersion,
      connector,
      customFields,
      templates,
      persistCaseConfigure,
    ]
  );

  const onEditTemplate = useCallback(
    (key: string) => {
      const selectedTemplate = templates.find((item) => item.key === key);

      if (selectedTemplate) {
        setTemplateToEdit(selectedTemplate);
      }
      setFlyOutVisibility({ type: 'template', visible: true });
    },
    [templates, setFlyOutVisibility]
  );

  const onCloseTemplateFlyout = useCallback(() => {
    setFlyOutVisibility({ type: 'template', visible: false });
    setTemplateToEdit(null);
  }, [setFlyOutVisibility]);

  const onTemplateSave = useCallback(
    (data: TemplateConfiguration) => {
      const updatedTemplates = addOrReplaceField(templates, data);

      persistCaseConfigure({
        connector,
        customFields,
        templates: updatedTemplates,
        id: configurationId,
        version: configurationVersion,
        closureType,
      });

      setFlyOutVisibility({ type: 'template', visible: false });
      setTemplateToEdit(null);
    },
    [
      closureType,
      configurationId,
      configurationVersion,
      connector,
      customFields,
      templates,
      persistCaseConfigure,
      setFlyOutVisibility,
    ]
  );

  const AddOrEditCustomFieldFlyout =
    flyOutVisibility?.type === 'customField' && flyOutVisibility?.visible ? (
      <CommonFlyout<CustomFieldConfiguration>
        isLoading={isLoadingCaseConfiguration}
        disabled={!permissions.settings || isLoadingCaseConfiguration}
        onCloseFlyout={onCloseCustomFieldFlyout}
        onSaveField={onCustomFieldSave}
        renderHeader={() => (
          <span>{customFieldToEdit ? i18n.EDIT_CUSTOM_FIELD : i18n.ADD_CUSTOM_FIELD} </span>
        )}
      >
        {({ onChange }) => (
          <CustomFieldsForm onChange={onChange} initialValue={customFieldToEdit} />
        )}
      </CommonFlyout>
    ) : null;

  const AddOrEditTemplateFlyout =
    flyOutVisibility?.type === 'template' && flyOutVisibility?.visible ? (
      <CommonFlyout<TemplateFormProps, TemplateConfiguration>
        isLoading={isLoadingCaseConfiguration}
        disabled={!permissions.settings || isLoadingCaseConfiguration}
        onCloseFlyout={onCloseTemplateFlyout}
        onSaveField={onTemplateSave}
        renderHeader={() => (
          <span>{templateToEdit ? i18n.EDIT_TEMPLATE : i18n.CREATE_TEMPLATE}</span>
        )}
      >
        {({ onChange }) => (
          <TemplateForm
            initialValue={templateToEdit}
            connectors={connectors ?? []}
            currentConfiguration={currentConfiguration}
            isEditMode={Boolean(templateToEdit)}
            onChange={onChange}
          />
        )}
      </CommonFlyout>
    ) : null;

  return (
    <EuiPageSection paddingSize="none">
      {isTemplatesEnabled && (
        <EuiButtonEmpty
          iconType="sortLeft"
          size="xs"
          flush="left"
          onClick={navigateToAllCases}
          data-test-subj="configure-cases-back-to-cases"
        >
          {i18n.BACK_TO_ALL}
        </EuiButtonEmpty>
      )}
      <HeaderPage data-test-subj="case-configure-title" title={i18n.CONFIGURE_CASES_PAGE_TITLE} />
      <EuiPageBody restrictWidth={false}>
        <div css={getFormWrapperCss(euiTheme)}>
          {hasMinimumLicensePermissions && (
            <>
              {!connectorIsValid && (
                <>
                  <div css={sectionWrapperCss}>
                    <EuiCallOut
                      announceOnMount
                      title={i18n.WARNING_NO_CONNECTOR_TITLE}
                      color="warning"
                      iconType="question"
                      data-test-subj="configure-cases-warning-callout"
                    >
                      <FormattedMessage
                        defaultMessage="The selected connector has been deleted or you do not have the {appropriateLicense} to use it. Either select a different connector or create a new one."
                        id="xpack.cases.configure.connectorDeletedOrLicenseWarning"
                        values={{
                          appropriateLicense: (
                            <EuiLink href={docLinks.links.subscriptions} target="_blank">
                              {i18n.LINK_APPROPRIATE_LICENSE}
                            </EuiLink>
                          ),
                        }}
                      />
                    </EuiCallOut>
                  </div>
                  <EuiSpacer size="xl" />
                </>
              )}
              <div css={sectionWrapperCss}>
                <ClosureOptions
                  closureTypeSelected={closureType}
                  disabled={
                    isPersistingConfiguration || isLoadingConnectors || !permissions.settings
                  }
                  onChangeClosureType={onChangeClosureType}
                />
              </div>
              <EuiSpacer size="xl" />
              <div css={sectionWrapperCss}>
                <Connectors
                  actionTypes={actionTypes}
                  connectors={connectors ?? []}
                  disabled={
                    isPersistingConfiguration || isLoadingConnectors || !permissions.settings
                  }
                  handleShowEditFlyout={onClickUpdateConnector}
                  isLoading={isLoadingAny}
                  mappings={mappings}
                  onChangeConnector={onChangeConnector}
                  selectedConnector={connector}
                  updateConnectorDisabled={updateConnectorDisabled || !permissions.settings}
                  onAddNewConnector={onAddNewConnector}
                />
              </div>
              <EuiSpacer size="xl" />
            </>
          )}
          <div css={sectionWrapperCss}>
            <EuiFlexItem grow={false}>
              <CustomFields
                customFields={customFields}
                isLoading={isLoadingCaseConfiguration}
                disabled={isLoadingCaseConfiguration}
                handleAddCustomField={() =>
                  setFlyOutVisibility({ type: 'customField', visible: true })
                }
                handleDeleteCustomField={onDeleteCustomField}
                handleEditCustomField={onEditCustomField}
              />
            </EuiFlexItem>
          </div>

          <EuiSpacer size="xl" />

          <div css={sectionWrapperCss}>
            <EuiFlexItem grow={false}>
              <Templates
                templates={templates}
                isLoading={isLoadingCaseConfiguration}
                disabled={isLoadingCaseConfiguration}
                onAddTemplate={() => setFlyOutVisibility({ type: 'template', visible: true })}
                onEditTemplate={onEditTemplate}
                onDeleteTemplate={onDeleteTemplate}
              />
            </EuiFlexItem>
          </div>

          {hasMinimumLicensePermissionsForObservables && isObservablesFeatureEnabled && (
            <>
              <EuiSpacer size="xl" />

              <div css={sectionWrapperCss}>
                <EuiFlexItem grow={false}>
                  <ObservableTypes
                    observableTypes={observableTypes}
                    isLoading={isLoadingCaseConfiguration}
                    disabled={isLoadingCaseConfiguration}
                    handleAddObservableType={() =>
                      setFlyOutVisibility({ type: 'observableTypes', visible: true })
                    }
                    handleDeleteObservableType={onDeleteObservableType}
                    handleEditObservableType={onEditObservableType}
                  />
                </EuiFlexItem>
              </div>
            </>
          )}

          <EuiSpacer size="xl" />

          {ConnectorAddFlyout}
          {ConnectorEditFlyout}
          {AddOrEditCustomFieldFlyout}
          {AddOrEditTemplateFlyout}
          {AddOrEditObservableTypeFlyout}
        </div>
      </EuiPageBody>
    </EuiPageSection>
  );
});

ConfigureCases.displayName = 'ConfigureCases';
