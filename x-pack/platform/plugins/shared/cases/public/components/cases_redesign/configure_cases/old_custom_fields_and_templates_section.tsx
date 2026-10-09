/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import {
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiLink,
  EuiSpacer,
  EuiSwitch,
  EuiTitle,
  EuiToolTip,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import type {
  CustomFieldConfiguration,
  TemplateConfiguration,
  CustomFieldTypes,
  ActionConnector,
} from '../../../../common/types/domain';
import type { CasesConfigurationUI, CaseUI } from '../../../containers/types';
import { CustomFields } from '../../custom_fields';
import { Templates } from '../../templates';
import { CustomFieldsForm } from '../../custom_fields/form';
import { TemplateForm } from '../../templates/form';
import type { TemplateFormProps } from '../../templates/types';
import { CommonFlyout } from '../../configure_cases/flyout';
import { addOrReplaceField } from '../../utils';
import { builderMap as customFieldsBuilderMap } from '../../custom_fields/builder';
import { useShowLegacyCustomFields } from '../../../common/use_show_old_custom_fields';
import {
  useCasesFieldLibraryNavigation,
  useCasesTemplatesNavigation,
} from '../../../common/navigation';
import { useCasesContext } from '../../cases_context/use_cases_context';
import { useCasesConfig } from '../../../common/lib/kibana';
import { useGetCaseConfiguration } from '../../../containers/configure/use_get_case_configuration';
import type { ClosureType } from '../../../containers/configure/types';
import { SettingsSection } from './settings_section';
import * as i18n from '../../configure_cases/translations';
import * as customFieldsI18n from '../../custom_fields/translations';
import * as templatesI18n from '../../templates/translations';

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

export interface OldCustomFieldsAndTemplatesSectionProps {
  configurationId: string;
  configurationVersion: string;
  closureType: ClosureType;
  connector: CasesConfigurationUI['connector'];
  customFields: CasesConfigurationUI['customFields'];
  templates: CasesConfigurationUI['templates'];
  connectors: ActionConnector[];
  isLoadingCaseConfiguration: boolean;
  persistCaseConfigure: (params: {
    connector: CasesConfigurationUI['connector'];
    customFields: CasesConfigurationUI['customFields'];
    templates: CasesConfigurationUI['templates'];
    id: string;
    version: string;
    closureType: ClosureType;
  }) => void;
  flyOutVisibility: { type: LegacyFlyoutType | string; visible: boolean } | null;
  setFlyOutVisibility: (value: { type: LegacyFlyoutType; visible: boolean } | null) => void;
}

export const OldCustomFieldsAndTemplatesSection: React.FC<OldCustomFieldsAndTemplatesSectionProps> =
  React.memo(
    ({
      configurationId,
      configurationVersion,
      closureType,
      connector,
      customFields,
      templates,
      connectors,
      isLoadingCaseConfiguration,
      persistCaseConfigure,
      flyOutVisibility,
      setFlyOutVisibility,
    }) => {
      const { permissions } = useCasesContext();
      // When templates v2 is off, the v2 templates / field-library pages are unregistered and
      // this section is the only place to manage custom fields and templates — so it is always
      // expanded (no local-storage switch) and drops the migration copy that links to v2 pages.
      const { templatesEnabled } = useCasesConfig();
      const { showLegacyCustomFields, setShowLegacyCustomFields, canDisableSwitch } =
        useShowLegacyCustomFields(customFields);
      const { getCasesFieldLibraryUrl } = useCasesFieldLibraryNavigation();
      const { getCasesTemplatesUrl } = useCasesTemplatesNavigation();
      const { data: currentConfiguration } = useGetCaseConfiguration();
      const showSectionContent = !templatesEnabled || showLegacyCustomFields;

      const [customFieldToEdit, setCustomFieldToEdit] = useState<CustomFieldConfiguration | null>(
        null
      );
      const [templateToEdit, setTemplateToEdit] = useState<TemplateConfiguration | null>(null);

      const onDeleteCustomField = useCallback(
        (key: string) => {
          const remainingCustomFields = customFields.filter((field) => field.key !== key);

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

      const onAddCustomField = useCallback(() => {
        setCustomFieldToEdit(null);
        setFlyOutVisibility({ type: 'customField', visible: true });
      }, [setFlyOutVisibility]);

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

      const onAddTemplate = useCallback(() => {
        setTemplateToEdit(null);
        setFlyOutVisibility({ type: 'template', visible: true });
      }, [setFlyOutVisibility]);

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
        <>
          <EuiHorizontalRule margin="l" />
          <SettingsSection
            data-test-subj="cases-redesign-legacy-custom-fields-section"
            title={
              templatesEnabled
                ? i18n.LEGACY_CUSTOM_FIELDS_AND_TEMPLATES_TITLE
                : i18n.CUSTOM_FIELDS_AND_TEMPLATES_TITLE
            }
            description={
              templatesEnabled ? (
                <FormattedMessage
                  id="xpack.cases.configureCases.legacyCustomFieldsAndTemplatesDescription"
                  defaultMessage="Custom fields and templates you've created have been migrated to the new YAML-based template system. Manage them in the {templatesLink}. To view your migrated custom fields, visit the {customFieldsLink}. Your legacy configuration is kept here for reference during the transition."
                  values={{
                    templatesLink: (
                      <EuiLink
                        href={getCasesTemplatesUrl()}
                        data-test-subj="legacy-templates-view-new-link"
                      >
                        {i18n.VIEW_NEW_TEMPLATES}
                      </EuiLink>
                    ),
                    customFieldsLink: (
                      <EuiLink
                        href={getCasesFieldLibraryUrl()}
                        data-test-subj="legacy-custom-fields-view-new-link"
                      >
                        {i18n.VIEW_NEW_CUSTOM_FIELDS}
                      </EuiLink>
                    ),
                  }}
                />
              ) : (
                i18n.CUSTOM_FIELDS_AND_TEMPLATES_DESCRIPTION
              )
            }
          >
            {templatesEnabled && (
              <EuiToolTip
                content={
                  canDisableSwitch ? undefined : i18n.SHOW_LEGACY_CUSTOM_FIELDS_SWITCH_DISABLED_HELP
                }
              >
                <EuiSwitch
                  label={i18n.SHOW_LEGACY_CUSTOM_FIELDS_AND_TEMPLATES}
                  checked={showLegacyCustomFields}
                  disabled={!canDisableSwitch}
                  onChange={(e) => setShowLegacyCustomFields(e.target.checked)}
                  data-test-subj="show-legacy-custom-fields-switch"
                />
              </EuiToolTip>
            )}

            {showSectionContent ? (
              <>
                <EuiSpacer size="l" />
                <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
                  <EuiFlexItem grow={false}>
                    <EuiTitle size="xs">
                      <h3>{i18n.LEGACY_CUSTOM_FIELDS_LIST_TITLE}</h3>
                    </EuiTitle>
                  </EuiFlexItem>
                  {templatesEnabled && (
                    <EuiFlexItem grow={false}>
                      <EuiBadge
                        color="warning"
                        data-test-subj="legacy-custom-fields-deprecated-badge"
                      >
                        {i18n.DEPRECATED_BADGE}
                      </EuiBadge>
                    </EuiFlexItem>
                  )}
                </EuiFlexGroup>
                <EuiSpacer size="s" />
                <CustomFields
                  customFields={customFields}
                  isLoading={isLoadingCaseConfiguration}
                  disabled={isLoadingCaseConfiguration}
                  hideTitle
                  useLineSeparators
                  emptyStateMessage={templatesEnabled ? null : undefined}
                  addButtonLabel={
                    templatesEnabled
                      ? i18n.ADD_LEGACY_CUSTOM_FIELD
                      : customFieldsI18n.ADD_CUSTOM_FIELD
                  }
                  handleAddCustomField={onAddCustomField}
                  handleDeleteCustomField={onDeleteCustomField}
                  handleEditCustomField={onEditCustomField}
                />

                <EuiSpacer size="l" />

                <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
                  <EuiFlexItem grow={false}>
                    <EuiTitle size="xs">
                      <h3>{i18n.LEGACY_TEMPLATES_LIST_TITLE}</h3>
                    </EuiTitle>
                  </EuiFlexItem>
                  {templatesEnabled && (
                    <EuiFlexItem grow={false}>
                      <EuiBadge color="warning" data-test-subj="legacy-templates-deprecated-badge">
                        {i18n.DEPRECATED_BADGE}
                      </EuiBadge>
                    </EuiFlexItem>
                  )}
                </EuiFlexGroup>
                <EuiSpacer size="s" />
                <Templates
                  templates={templates}
                  isLoading={isLoadingCaseConfiguration}
                  disabled={isLoadingCaseConfiguration}
                  hideTitle
                  useLineSeparators
                  emptyStateMessage={templatesEnabled ? null : undefined}
                  addButtonLabel={
                    templatesEnabled ? i18n.ADD_LEGACY_TEMPLATE : templatesI18n.ADD_TEMPLATE
                  }
                  onAddTemplate={onAddTemplate}
                  onEditTemplate={onEditTemplate}
                  onDeleteTemplate={onDeleteTemplate}
                />
              </>
            ) : null}
          </SettingsSection>

          {AddOrEditCustomFieldFlyout}
          {AddOrEditTemplateFlyout}
        </>
      );
    }
  );

OldCustomFieldsAndTemplatesSection.displayName = 'OldCustomFieldsAndTemplatesSection';
