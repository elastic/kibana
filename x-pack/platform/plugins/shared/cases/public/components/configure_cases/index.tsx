/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable complexity */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { css } from '@emotion/react';

import { FormattedMessage } from '@kbn/i18n-react';
import type { EuiThemeComputed } from '@elastic/eui';
import {
  EuiCallOut,
  EuiFlexItem,
  EuiLink,
  EuiPageBody,
  EuiPageSection,
  EuiSpacer,
  useEuiTheme,
} from '@elastic/eui';

import type { ActionConnectorTableItem } from '@kbn/triggers-actions-ui-plugin/public/types';
import { CasesConnectorFeatureId } from '@kbn/actions-plugin/common';
import type {
  CustomFieldConfiguration,
  TemplateConfiguration,
  CustomFieldTypes,
  ActionConnector,
} from '../../../common/types/domain';
import { useKibana } from '../../common/lib/kibana';
import { useGetActionTypes } from '../../containers/configure/use_action_types';
import { useGetCaseConfiguration } from '../../containers/configure/use_get_case_configuration';

import type { ClosureType } from '../../containers/configure/types';
import { Connectors } from './connectors';
import { ClosureOptions } from './closure_options';
import { getNoneConnector, normalizeActionConnector, normalizeCaseConnector } from './utils';
import * as i18n from './translations';
import { getConnectorById, addOrReplaceField } from '../utils';
import { HeaderPage } from '../header_page';
import { useCasesContext } from '../cases_context/use_cases_context';
import { useCasesBreadcrumbs } from '../use_breadcrumbs';
import { CasesDeepLinkId } from '../../common/navigation';
import { CustomFields } from '../custom_fields';
import { CommonFlyout } from './flyout';
import { useGetSupportedActionConnectors } from '../../containers/configure/use_get_supported_action_connectors';
import { usePersistConfiguration } from '../../containers/configure/use_persist_configuration';
import { useLicense } from '../../common/use_license';
import { Templates } from '../templates';
import type { TemplateFormProps } from '../templates/types';
import { CustomFieldsForm } from '../custom_fields/form';
import { TemplateForm } from '../templates/form';
import type { CasesConfigurationUI, CaseUI } from '../../containers/types';
import { builderMap as customFieldsBuilderMap } from '../custom_fields/builder';

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

interface Flyout {
  type: 'addConnector' | 'editConnector' | 'customField' | 'template';
  visible: boolean;
}

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
  const { permissions } = useCasesContext();
  const { triggersActionsUi } = useKibana().services;
  useCasesBreadcrumbs(CasesDeepLinkId.casesConfigure);
  const license = useLicense();
  const hasMinimumLicensePermissions = license.isAtLeastGold();

  const [connectorIsValid, setConnectorIsValid] = useState(true);
  const [flyOutVisibility, setFlyOutVisibility] = useState<Flyout | null>(null);
  const [editedConnectorItem, setEditedConnectorItem] = useState<ActionConnectorTableItem | null>(
    null
  );
  const [customFieldToEdit, setCustomFieldToEdit] = useState<CustomFieldConfiguration | null>(null);
  const [templateToEdit, setTemplateToEdit] = useState<TemplateConfiguration | null>(null);
  const { euiTheme } = useEuiTheme();

  const {
    data: currentConfiguration,
    isLoading: loadingCaseConfigure,
    refetch: refetchCaseConfigure,
  } = useGetCaseConfiguration();

  const {
    id: configurationId,
    version: configurationVersion,
    closureType,
    connector,
    mappings,
    customFields,
    templates,
  } = currentConfiguration;

  const {
    mutate: persistCaseConfigure,
    mutateAsync: persistCaseConfigureAsync,
    isLoading: isPersistingConfiguration,
  } = usePersistConfiguration();

  const isLoadingCaseConfiguration = loadingCaseConfigure || isPersistingConfiguration;
  const {
    isLoading: isLoadingConnectors,
    data: connectors = [],
    refetch: refetchConnectors,
  } = useGetSupportedActionConnectors();
  const {
    isLoading: isLoadingActionTypes,
    data: actionTypes = [],
    refetch: refetchActionTypes,
  } = useGetActionTypes();

  const onConnectorUpdated = useCallback(
    async (updatedConnector: ActionConnector) => {
      setEditedConnectorItem(updatedConnector as ActionConnectorTableItem);
      refetchConnectors();
      refetchActionTypes();
      refetchCaseConfigure();
    },
    [refetchActionTypes, refetchCaseConfigure, refetchConnectors, setEditedConnectorItem]
  );

  const onConnectorCreated = useCallback(
    async (createdConnector: ActionConnector) => {
      const caseConnector = normalizeActionConnector(createdConnector);

      await persistCaseConfigureAsync({
        connector: caseConnector,
        closureType,
        customFields,
        templates,
        id: configurationId,
        version: configurationVersion,
      });

      onConnectorUpdated(createdConnector);
    },
    [
      persistCaseConfigureAsync,
      closureType,
      customFields,
      templates,
      configurationId,
      configurationVersion,
      onConnectorUpdated,
    ]
  );

  const isLoadingAny =
    isLoadingConnectors ||
    isPersistingConfiguration ||
    loadingCaseConfigure ||
    isLoadingActionTypes;
  const updateConnectorDisabled = isLoadingAny || !connectorIsValid || connector.id === 'none';
  const onClickUpdateConnector = useCallback(() => {
    setFlyOutVisibility({ type: 'editConnector', visible: true });
  }, []);

  const onCloseAddFlyout = useCallback(
    () => setFlyOutVisibility({ type: 'addConnector', visible: false }),
    [setFlyOutVisibility]
  );

  const onCloseEditFlyout = useCallback(
    () => setFlyOutVisibility({ type: 'editConnector', visible: false }),
    []
  );

  const onAddNewConnector = useCallback(() => {
    setFlyOutVisibility({ type: 'addConnector', visible: true });
  }, []);

  const onChangeConnector = useCallback(
    (id: string) => {
      if (id === 'add-connector') {
        setFlyOutVisibility({ type: 'addConnector', visible: true });
        return;
      }

      const actionConnector = getConnectorById(id, connectors);
      const caseConnector =
        actionConnector != null ? normalizeActionConnector(actionConnector) : getNoneConnector();

      persistCaseConfigure({
        connector: caseConnector,
        closureType,
        customFields,
        templates,
        id: configurationId,
        version: configurationVersion,
      });
    },
    [
      connectors,
      persistCaseConfigure,
      closureType,
      customFields,
      templates,
      configurationId,
      configurationVersion,
    ]
  );

  const onChangeClosureType = useCallback(
    (type: ClosureType) => {
      persistCaseConfigure({
        connector,
        customFields,
        templates,
        id: configurationId,
        version: configurationVersion,
        closureType: type,
      });
    },
    [
      configurationId,
      configurationVersion,
      connector,
      customFields,
      templates,
      persistCaseConfigure,
    ]
  );

  useEffect(() => {
    if (
      !isLoadingConnectors &&
      connector.id !== 'none' &&
      !connectors.some((c) => c.id === connector.id)
    ) {
      setConnectorIsValid(false);
    } else if (
      !isLoadingConnectors &&
      (connector.id === 'none' || connectors.some((c) => c.id === connector.id))
    ) {
      setConnectorIsValid(true);
    }
  }, [connectors, connector, isLoadingConnectors]);

  useEffect(() => {
    if (!isLoadingConnectors && connector.id !== 'none') {
      setEditedConnectorItem(
        normalizeCaseConnector(connectors, connector) as ActionConnectorTableItem
      );
    }
  }, [connectors, connector, isLoadingConnectors]);

  const ConnectorAddFlyout = useMemo(
    () =>
      flyOutVisibility?.type === 'addConnector' && flyOutVisibility?.visible
        ? triggersActionsUi.getAddConnectorFlyout({
            onClose: onCloseAddFlyout,
            featureId: CasesConnectorFeatureId,
            onConnectorCreated,
          })
        : null,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [flyOutVisibility]
  );

  const ConnectorEditFlyout = useMemo(
    () =>
      editedConnectorItem && flyOutVisibility?.type === 'editConnector' && flyOutVisibility?.visible
        ? triggersActionsUi.getEditConnectorFlyout({
            connector: editedConnectorItem,
            onClose: onCloseEditFlyout,
            onConnectorUpdated,
          })
        : null,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [connector.id, editedConnectorItem, flyOutVisibility]
  );

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
    [setFlyOutVisibility, setCustomFieldToEdit, customFields]
  );

  const onCloseCustomFieldFlyout = useCallback(() => {
    setFlyOutVisibility({ type: 'customField', visible: false });
    setCustomFieldToEdit(null);
  }, [setFlyOutVisibility, setCustomFieldToEdit]);

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
    [setFlyOutVisibility, setTemplateToEdit, templates]
  );

  const onCloseTemplateFlyout = useCallback(() => {
    setFlyOutVisibility({ type: 'template', visible: false });
    setTemplateToEdit(null);
  }, [setFlyOutVisibility, setTemplateToEdit]);

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
    ]
  );

  const AddOrEditCustomFieldFlyout =
    flyOutVisibility?.type === 'customField' && flyOutVisibility?.visible ? (
      <CommonFlyout<CustomFieldConfiguration>
        isLoading={loadingCaseConfigure || isPersistingConfiguration}
        disabled={!permissions.settings || loadingCaseConfigure || isPersistingConfiguration}
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
        isLoading={loadingCaseConfigure || isPersistingConfiguration}
        disabled={!permissions.settings || loadingCaseConfigure || isPersistingConfiguration}
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
    <EuiPageSection restrictWidth={true}>
      <HeaderPage
        showBackButton={true}
        data-test-subj="case-configure-title"
        title={i18n.CONFIGURE_CASES_PAGE_TITLE}
      />
      <EuiPageBody restrictWidth={true}>
        <div css={getFormWrapperCss(euiTheme)}>
          {hasMinimumLicensePermissions && (
            <>
              {!connectorIsValid && (
                <>
                  <div css={sectionWrapperCss}>
                    <EuiCallOut
                      title={i18n.WARNING_NO_CONNECTOR_TITLE}
                      color="warning"
                      iconType="help"
                      data-test-subj="configure-cases-warning-callout"
                    >
                      <FormattedMessage
                        defaultMessage="The selected connector has been deleted or you do not have the {appropriateLicense} to use it. Either select a different connector or create a new one."
                        id="xpack.cases.configure.connectorDeletedOrLicenseWarning"
                        values={{
                          appropriateLicense: (
                            <EuiLink href="https://www.elastic.co/subscriptions" target="_blank">
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
          <EuiSpacer size="xl" />
          {ConnectorAddFlyout}
          {ConnectorEditFlyout}
          {AddOrEditCustomFieldFlyout}
          {AddOrEditTemplateFlyout}
        </div>
      </EuiPageBody>
    </EuiPageSection>
  );
});

ConfigureCases.displayName = 'ConfigureCases';
