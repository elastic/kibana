/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment, useState } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';
import {
  EuiCallOut,
  EuiFlyout,
  EuiFlyoutHeader,
  EuiTitle,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonEmpty,
  EuiTab,
  EuiTabs,
  EuiSpacer,
  EuiPopover,
  EuiButton,
  EuiContextMenu,
} from '@elastic/eui';
import {
  UIM_TEMPLATE_DETAIL_PANEL_MAPPINGS_TAB,
  UIM_TEMPLATE_DETAIL_PANEL_SUMMARY_TAB,
  UIM_TEMPLATE_DETAIL_PANEL_SETTINGS_TAB,
  UIM_TEMPLATE_DETAIL_PANEL_ALIASES_TAB,
} from '../../../../../../common/constants';
import { Template } from '../../../../../../common/types';
import { TemplateDeleteModal, SectionLoading, SectionError, Error } from '../../../../components';
import { loadIndexTemplate } from '../../../../services/api';
import { decodePath } from '../../../../services/routing';
import { uiMetricService } from '../../../../services/ui_metric';
import { SendRequestResponse } from '../../../../../shared_imports';
import { TabSummary, TabMappings, TabSettings, TabAliases } from './tabs';

interface Props {
  templateName: Template['name'];
  onClose: () => void;
  editTemplate: (templateName: Template['name']) => void;
  cloneTemplate: (templateName: Template['name']) => void;
  reload: () => Promise<SendRequestResponse>;
}

const SUMMARY_TAB_ID = 'summary';
const MAPPINGS_TAB_ID = 'mappings';
const ALIASES_TAB_ID = 'aliases';
const SETTINGS_TAB_ID = 'settings';

const TABS = [
  {
    id: SUMMARY_TAB_ID,
    name: i18n.translate('xpack.idxMgmt.templateDetails.summaryTabTitle', {
      defaultMessage: 'Summary',
    }),
  },
  {
    id: SETTINGS_TAB_ID,
    name: i18n.translate('xpack.idxMgmt.templateDetails.settingsTabTitle', {
      defaultMessage: 'Settings',
    }),
  },
  {
    id: MAPPINGS_TAB_ID,
    name: i18n.translate('xpack.idxMgmt.templateDetails.mappingsTabTitle', {
      defaultMessage: 'Mappings',
    }),
  },
  {
    id: ALIASES_TAB_ID,
    name: i18n.translate('xpack.idxMgmt.templateDetails.aliasesTabTitle', {
      defaultMessage: 'Aliases',
    }),
  },
];

const tabToComponentMap: {
  [key: string]: React.FunctionComponent<{ templateDetails: Template }>;
} = {
  [SUMMARY_TAB_ID]: TabSummary,
  [SETTINGS_TAB_ID]: TabSettings,
  [MAPPINGS_TAB_ID]: TabMappings,
  [ALIASES_TAB_ID]: TabAliases,
};

const tabToUiMetricMap: { [key: string]: string } = {
  [SUMMARY_TAB_ID]: UIM_TEMPLATE_DETAIL_PANEL_SUMMARY_TAB,
  [SETTINGS_TAB_ID]: UIM_TEMPLATE_DETAIL_PANEL_SETTINGS_TAB,
  [MAPPINGS_TAB_ID]: UIM_TEMPLATE_DETAIL_PANEL_MAPPINGS_TAB,
  [ALIASES_TAB_ID]: UIM_TEMPLATE_DETAIL_PANEL_ALIASES_TAB,
};

export const TemplateDetails: React.FunctionComponent<Props> = ({
  templateName,
  onClose,
  editTemplate,
  cloneTemplate,
  reload,
}) => {
  const decodedTemplateName = decodePath(templateName);
  const { error, data: templateDetails, isLoading } = loadIndexTemplate(decodedTemplateName);
  // TS complains if we use destructuring here. Fixed in 3.6.0 (https://github.com/microsoft/TypeScript/pull/31711).
  const isManaged = templateDetails ? templateDetails.isManaged : undefined;
  const [templateToDelete, setTemplateToDelete] = useState<Array<Template['name']>>([]);
  const [activeTab, setActiveTab] = useState<string>(SUMMARY_TAB_ID);
  const [isPopoverOpen, setIsPopOverOpen] = useState<boolean>(false);

  let content;

  if (isLoading) {
    content = (
      <SectionLoading>
        <FormattedMessage
          id="xpack.idxMgmt.templateDetails.loadingIndexTemplateDescription"
          defaultMessage="Loading template…"
        />
      </SectionLoading>
    );
  } else if (error) {
    content = (
      <SectionError
        title={
          <FormattedMessage
            id="xpack.idxMgmt.templateDetails.loadingIndexTemplateErrorMessage"
            defaultMessage="Error loading template"
          />
        }
        error={error as Error}
        data-test-subj="sectionError"
      />
    );
  } else if (templateDetails) {
    const Content = tabToComponentMap[activeTab];
    const managedTemplateCallout = isManaged ? (
      <Fragment>
        <EuiCallOut
          title={
            <FormattedMessage
              id="xpack.idxMgmt.templateDetails.managedTemplateInfoTitle"
              defaultMessage="Editing a managed template is not permitted"
            />
          }
          color="primary"
          size="s"
        >
          <FormattedMessage
            id="xpack.idxMgmt.templateDetails.managedTemplateInfoDescription"
            defaultMessage="Managed templates are critical for internal operations."
          />
        </EuiCallOut>
        <EuiSpacer size="m" />
      </Fragment>
    ) : null;

    content = (
      <Fragment>
        {managedTemplateCallout}

        <EuiTabs>
          {TABS.map(tab => (
            <EuiTab
              onClick={() => {
                uiMetricService.trackMetric('click', tabToUiMetricMap[tab.id]);
                setActiveTab(tab.id);
              }}
              isSelected={tab.id === activeTab}
              key={tab.id}
              data-test-subj="tab"
            >
              {tab.name}
            </EuiTab>
          ))}
        </EuiTabs>

        <EuiSpacer size="l" />

        <Content templateDetails={templateDetails} />
      </Fragment>
    );
  }

  return (
    <Fragment>
      {templateToDelete && templateToDelete.length > 0 ? (
        <TemplateDeleteModal
          callback={data => {
            if (data && data.hasDeletedTemplates) {
              reload();
            } else {
              setTemplateToDelete([]);
            }
            onClose();
          }}
          templatesToDelete={templateToDelete}
        />
      ) : null}

      <EuiFlyout
        onClose={onClose}
        data-test-subj="templateDetails"
        aria-labelledby="templateDetailsFlyoutTitle"
        size="m"
        maxWidth={500}
      >
        <EuiFlyoutHeader>
          <EuiTitle size="m">
            <h2 id="templateDetailsFlyoutTitle" data-test-subj="title">
              {decodedTemplateName}
            </h2>
          </EuiTitle>
        </EuiFlyoutHeader>

        <EuiFlyoutBody data-test-subj="content">{content}</EuiFlyoutBody>

        <EuiFlyoutFooter>
          <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                iconType="cross"
                flush="left"
                onClick={onClose}
                data-test-subj="closeDetailsButton"
              >
                <FormattedMessage
                  id="xpack.idxMgmt.templateDetails.closeButtonLabel"
                  defaultMessage="Close"
                />
              </EuiButtonEmpty>
            </EuiFlexItem>
            {templateDetails && (
              <EuiFlexItem grow={false}>
                {/* Manage templates context menu */}
                <EuiPopover
                  id="manageTemplatePanel"
                  button={
                    <EuiButton
                      fill
                      data-test-subj="manageTemplateButton"
                      iconType="arrowDown"
                      iconSide="right"
                      onClick={() => setIsPopOverOpen(prev => !prev)}
                    >
                      <FormattedMessage
                        id="xpack.idxMgmt.templateDetails.manageButtonLabel"
                        defaultMessage="Manage"
                      />
                    </EuiButton>
                  }
                  isOpen={isPopoverOpen}
                  closePopover={() => setIsPopOverOpen(false)}
                  panelPaddingSize="none"
                  withTitle
                  anchorPosition="rightUp"
                  repositionOnScroll
                >
                  <EuiContextMenu
                    initialPanelId={0}
                    panels={[
                      {
                        id: 0,
                        title: i18n.translate(
                          'xpack.idxMgmt.templateDetails.manageContextMenuPanelTitle',
                          {
                            defaultMessage: 'Template options',
                          }
                        ),
                        items: [
                          {
                            name: i18n.translate('xpack.idxMgmt.templateDetails.editButtonLabel', {
                              defaultMessage: 'Edit',
                            }),
                            icon: 'pencil',
                            onClick: () => editTemplate(decodedTemplateName),
                            disabled: isManaged,
                          },
                          {
                            name: i18n.translate('xpack.idxMgmt.templateDetails.cloneButtonLabel', {
                              defaultMessage: 'Clone',
                            }),
                            icon: 'copy',
                            onClick: () => cloneTemplate(decodedTemplateName),
                          },
                          {
                            name: i18n.translate(
                              'xpack.idxMgmt.templateDetails.deleteButtonLabel',
                              {
                                defaultMessage: 'Delete',
                              }
                            ),
                            icon: 'trash',
                            onClick: () => setTemplateToDelete([decodedTemplateName]),
                            disabled: isManaged,
                          },
                        ],
                      },
                    ]}
                  />
                </EuiPopover>
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        </EuiFlyoutFooter>
      </EuiFlyout>
    </Fragment>
  );
};
