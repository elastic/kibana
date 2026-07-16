/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiScreenReaderOnly,
  EuiSpacer,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import React, { useCallback, useMemo } from 'react';
import type { CaseUI } from '../../../../../../common';
import type { CaseConnector } from '../../../../../../common/types/domain';
import * as i18n from '../../../../case_view/translations';
import { AttributesFields } from './attributes_fields';
import { EditConnector } from '../../../../edit_connector';
import { CustomFields } from '../../../../case_view/components/custom_fields';
import { TemplateFields } from '../../../../case_view/components/template_fields';
import * as redesignI18n from '../../../translations';
import { SidebarAccordionSection } from './sidebar_accordion_section';
import { TemplateSettingsPopover } from './template_settings_popover';
import { ConnectorSettingsPopover } from './connector_settings_popover';
import { useSidebarAccordionsState } from './hooks/use_sidebar_accordions_state';
import { useTemplateFieldsActions } from './hooks/use_template_fields_actions';
import { useOnUpdateField } from '../../../../case_view/use_on_update_field';
import { isFieldUpdating } from './utils/sidebar_helpers';
import { useCasesContext } from '../../../../cases_context/use_cases_context';
import { useCasesFeatures } from '../../../../../common/use_cases_features';
import { useGetCaseConnectors } from '../../../../../containers/use_get_case_connectors';
import { useGetCaseConfiguration } from '../../../../../containers/configure/use_get_case_configuration';
import { useGetSupportedActionConnectors } from '../../../../../containers/configure/use_get_supported_action_connectors';
import { useGetTemplate } from '../../../../templates_v2/hooks/use_get_template';
import { KibanaServices } from '../../../../../common/lib/kibana';

export const CaseViewSidebar = ({ caseData }: { caseData: CaseUI }) => {
  const { euiTheme } = useEuiTheme();
  const fieldsGroupStyles = useMemo(() => css({ gap: euiTheme.size.m }), [euiTheme]);

  const { isOpen, onToggle } = useSidebarAccordionsState();

  const { permissions } = useCasesContext();
  const { pushToServiceAuthorized } = useCasesFeatures();
  const { data: caseConnectors } = useGetCaseConnectors(caseData.id);
  const { data: casesConfiguration } = useGetCaseConfiguration();
  const { isLoading: isLoadingAllAvailableConnectors, data: supportedActionConnectors } =
    useGetSupportedActionConnectors();
  const isTemplatesV2Enabled = KibanaServices.getConfig()?.templates?.enabled ?? false;

  const { data: templateData } = useGetTemplate(caseData.template?.id, caseData.template?.version);
  const templateFieldsTitle = templateData?.name ?? redesignI18n.TEMPLATE_FIELDS_TITLE;

  const { onUpdateField, onSubmitCustomField, isCustomFieldsLoading } = useTemplateFieldsActions({
    caseData,
  });

  const {
    onUpdateField: onUpdateConnectorField,
    isLoading: isConnectorFieldUpdating,
    loadingKey: connectorLoadingKey,
  } = useOnUpdateField({ caseData });

  const onSubmitConnector = useCallback(
    (connector: CaseConnector) => onUpdateConnectorField({ key: 'connector', value: connector }),
    [onUpdateConnectorField]
  );

  const isConnectorLoading = useMemo(
    () =>
      isLoadingAllAvailableConnectors ||
      isFieldUpdating(isConnectorFieldUpdating, connectorLoadingKey, 'connector'),
    [isLoadingAllAvailableConnectors, isConnectorFieldUpdating, connectorLoadingKey]
  );

  return (
    <EuiFlexItem grow={2}>
      <EuiSpacer size="s" />
      <EuiPanel
        data-test-subj="case-view-page-sidebar"
        hasShadow={false}
        hasBorder={true}
        paddingSize="l"
        grow={false}
      >
        <EuiScreenReaderOnly>
          <h2>{i18n.CASE_SETTINGS}</h2>
        </EuiScreenReaderOnly>
        <SidebarAccordionSection
          id="attributes"
          title={redesignI18n.ATTRIBUTES_TITLE}
          isOpen={isOpen('attributes')}
          onToggle={onToggle}
          data-test-subj="case-view-sidebar-attributes"
        >
          <AttributesFields caseData={caseData} />
        </SidebarAccordionSection>
        {isTemplatesV2Enabled ? (
          <>
            <EuiSpacer size="m" />
            <SidebarAccordionSection
              id="templateFields"
              title={templateFieldsTitle}
              extraAction={
                permissions.update ? (
                  <TemplateSettingsPopover
                    caseData={caseData}
                    data-test-subj="case-view-sidebar-template-fields-settings"
                  />
                ) : undefined
              }
              isOpen={isOpen('templateFields')}
              onToggle={onToggle}
              data-test-subj="case-view-sidebar-template-fields"
            >
              <EuiFlexGroup direction="column" responsive={false} css={fieldsGroupStyles}>
                <CustomFields
                  isLoading={isCustomFieldsLoading}
                  customFields={caseData.customFields}
                  customFieldsConfiguration={casesConfiguration.customFields}
                  onSubmit={onSubmitCustomField}
                />
                {caseData.template?.id ? (
                  <TemplateFields
                    caseData={caseData}
                    onUpdateField={onUpdateField}
                    showHeader={false}
                  />
                ) : (
                  <EuiText
                    size="s"
                    color="subdued"
                    data-test-subj="case-view-sidebar-no-template-selected"
                  >
                    {redesignI18n.NO_TEMPLATE_SELECTED}
                  </EuiText>
                )}
              </EuiFlexGroup>
            </SidebarAccordionSection>
          </>
        ) : null}
        {pushToServiceAuthorized && caseConnectors && supportedActionConnectors ? (
          <>
            <EuiSpacer size="m" />
            <SidebarAccordionSection
              id="connectors"
              title={redesignI18n.CONNECTORS_TITLE}
              extraAction={
                permissions.settings ? (
                  <ConnectorSettingsPopover data-test-subj="case-view-sidebar-connectors-settings" />
                ) : undefined
              }
              isOpen={isOpen('connectors')}
              onToggle={onToggle}
              data-test-subj="case-view-sidebar-connectors"
            >
              <EditConnector
                caseData={caseData}
                caseConnectors={caseConnectors}
                supportedActionConnectors={supportedActionConnectors}
                isLoading={isConnectorLoading}
                onSubmit={onSubmitConnector}
                showHeader={false}
                actionsVariant="outlined"
                // ConnectorsForm's `useForm` only reads `caseData.connector` as its
                // `defaultValue` on mount, so remount on connector id change to pick up
                // the committed connector/fields once the update round-trips through the
                // server. Matches the equivalent key on the non-redesigned sidebar
                // (case_view_activity.tsx).
                key={caseData.connector.id}
              />
            </SidebarAccordionSection>
          </>
        ) : null}
      </EuiPanel>
    </EuiFlexItem>
  );
};
CaseViewSidebar.displayName = 'CaseViewSidebar';
