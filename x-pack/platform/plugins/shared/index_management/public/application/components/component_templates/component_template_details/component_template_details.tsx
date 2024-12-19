/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';

import {
  EuiFlyoutHeader,
  EuiTitle,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonEmpty,
  EuiSpacer,
  EuiCallOut,
  EuiBadge,
  EuiButton,
  EuiCode,
} from '@elastic/eui';

import {
  SectionLoading,
  TabSettings,
  TabAliases,
  TabMappings,
  attemptToURIDecode,
  reactRouterNavigate,
} from '../shared_imports';
import { useAppContext } from '../../../app_context';
import { useComponentTemplatesContext } from '../component_templates_context';
import { DeprecatedBadge } from '../components';
import { TabSummary } from './tab_summary';
import { ComponentTemplateTabs, TabType } from './tabs';
import { ManageButton, ManageAction } from './manage_button';

export interface Props {
  componentTemplateName: string;
  onClose: () => void;
  actions?: ManageAction[];
  showSummaryCallToAction?: boolean;
}

export const defaultFlyoutProps = {
  'data-test-subj': 'componentTemplateDetails',
  'aria-labelledby': 'componentTemplateDetailsFlyoutTitle',
};

// All component templates for integrations end in @custom
const isIntegrationsComponentTemplate = (name: string) => {
  return name.toLowerCase().endsWith('@custom');
};

export const ComponentTemplateDetailsFlyoutContent: React.FunctionComponent<Props> = ({
  componentTemplateName,
  onClose,
  actions,
  showSummaryCallToAction,
}) => {
  const { history } = useAppContext();
  const { api } = useComponentTemplatesContext();

  const decodedComponentTemplateName = attemptToURIDecode(componentTemplateName)!;

  const {
    data: componentTemplateDetails,
    isLoading,
    error,
  } = api.useLoadComponentTemplate(decodedComponentTemplateName);

  const [activeTab, setActiveTab] = useState<TabType>('summary');

  let content: React.ReactNode | undefined;

  if (isLoading) {
    content = (
      <SectionLoading>
        <FormattedMessage
          id="xpack.idxMgmt.componentTemplateDetails.loadingIndexTemplateDescription"
          defaultMessage="Loading component template…"
        />
      </SectionLoading>
    );
  } else if (error) {
    if (
      error?.error === 'Not Found' &&
      isIntegrationsComponentTemplate(decodedComponentTemplateName)
    ) {
      content = (
        <EuiCallOut
          title={
            <FormattedMessage
              id="xpack.idxMgmt.componentTemplateDetails.createMissingIntegrationTemplate.calloutTitle"
              defaultMessage="Custom template doesn't exist"
            />
          }
          color="warning"
          iconType="warning"
          data-test-subj="missingCustomComponentTemplate"
        >
          <p>
            <FormattedMessage
              id="xpack.idxMgmt.componentTemplateDetails.createMissingIntegrationTemplate.text"
              defaultMessage="The custom template {templateName} doesn't exist."
              values={{
                templateName: <EuiCode>{decodedComponentTemplateName}</EuiCode>,
              }}
            />
          </p>
          <EuiButton
            color="warning"
            {...reactRouterNavigate(
              history,
              `/create_component_template?name=${decodedComponentTemplateName}`
            )}
          >
            <FormattedMessage
              id="xpack.idxMgmt.componentTemplateDetails.createMissingIntegrationTemplate.button"
              defaultMessage="Create component template"
            />
          </EuiButton>
        </EuiCallOut>
      );
    } else {
      content = (
        <EuiCallOut
          title={
            <FormattedMessage
              id="xpack.idxMgmt.componentTemplateDetails.loadingErrorMessage"
              defaultMessage="Error loading component template"
            />
          }
          color="danger"
          iconType="warning"
          data-test-subj="sectionError"
        >
          <p>{error.message}</p>
        </EuiCallOut>
      );
    }
  } else if (componentTemplateDetails) {
    const {
      template: { settings, mappings, aliases },
    } = componentTemplateDetails;

    const tabToComponentMap: Record<TabType, React.ReactNode> = {
      summary: (
        <TabSummary
          componentTemplateDetails={componentTemplateDetails}
          showCallToAction={showSummaryCallToAction}
        />
      ),
      settings: <TabSettings settings={settings} />,
      mappings: <TabMappings mappings={mappings} />,
      aliases: <TabAliases aliases={aliases} />,
    };

    const tabContent = tabToComponentMap[activeTab];

    content = (
      <>
        <ComponentTemplateTabs activeTab={activeTab} setActiveTab={setActiveTab} />

        <EuiSpacer size="l" />

        {tabContent}
      </>
    );
  }

  const isManaged = componentTemplateDetails?._kbnMeta.isManaged;
  const isDeprecated = componentTemplateDetails?.deprecated;

  return (
    <>
      <EuiFlyoutHeader>
        <EuiFlexGroup alignItems="center" gutterSize="s">
          <EuiFlexItem grow={false}>
            <EuiTitle size="m">
              <h2 id="componentTemplateDetailsFlyoutTitle" data-test-subj="title">
                {decodedComponentTemplateName}
              </h2>
            </EuiTitle>
          </EuiFlexItem>

          {isDeprecated && (
            <EuiFlexItem grow={false}>
              {' '}
              <DeprecatedBadge />
            </EuiFlexItem>
          )}

          {isManaged && (
            <EuiFlexItem grow={false}>
              {' '}
              <EuiBadge color="hollow">
                <FormattedMessage
                  id="xpack.idxMgmt.componentTemplateDetails.managedBadgeLabel"
                  defaultMessage="Managed"
                />
              </EuiBadge>
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      </EuiFlyoutHeader>

      <EuiFlyoutBody data-test-subj="content">{content}</EuiFlyoutBody>

      {actions && (
        <EuiFlyoutFooter data-test-subj="footer">
          <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
            {/* "Close" link */}
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                iconType="cross"
                flush="left"
                onClick={onClose}
                data-test-subj="closeDetailsButton"
              >
                <FormattedMessage
                  id="xpack.idxMgmt.componentTemplateDetails.closeButtonLabel"
                  defaultMessage="Close"
                />
              </EuiButtonEmpty>
            </EuiFlexItem>

            {/* "Manage" context menu */}
            {componentTemplateDetails && (
              <EuiFlexItem grow={false}>
                <ManageButton
                  actions={actions}
                  componentTemplateDetails={componentTemplateDetails}
                />
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        </EuiFlyoutFooter>
      )}
    </>
  );
};
