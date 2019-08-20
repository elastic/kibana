/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment, useState } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';
import {
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
  EuiContextMenuPanel,
  EuiContextMenuItem,
  EuiText,
  EuiIcon,
} from '@elastic/eui';
import {
  UIM_TEMPLATE_DETAIL_PANEL_MAPPINGS_TAB,
  UIM_TEMPLATE_DETAIL_PANEL_SUMMARY_TAB,
  UIM_TEMPLATE_DETAIL_PANEL_SETTINGS_TAB,
  UIM_TEMPLATE_DETAIL_PANEL_ALIASES_TAB,
} from '../../../../../common/constants';
import { Template } from '../../../../../common/types';
import { TemplateDeleteModal, SectionLoading, SectionError } from '../../../../components';
import { loadIndexTemplate } from '../../../../services/api';
import { trackUiMetric, METRIC_TYPE } from '../../../../services/track_ui_metric';
import { TabSummary, TabMappings, TabSettings, TabAliases } from './tabs';

interface Props {
  templateName: Template['name'];
  onClose: () => void;
  editTemplate: (templateName: Template['name']) => void;
  cloneTemplate: (templateName: Template['name']) => void;
  reload: () => Promise<void>;
}

const SUMMARY_TAB_ID = 'summary';
const MAPPINGS_TAB_ID = 'mappings';
const ALIASES_TAB_ID = 'aliases';
const SETTINGS_TAB_ID = 'settings';

const TABS = [
  {
    id: SUMMARY_TAB_ID,
    name: (
      <FormattedMessage
        id="xpack.idxMgmt.templateDetails.summaryTabTitle"
        defaultMessage="Summary"
      />
    ),
  },
  {
    id: SETTINGS_TAB_ID,
    name: (
      <FormattedMessage
        id="xpack.idxMgmt.templateDetails.settingsTabTitle"
        defaultMessage="Settings"
      />
    ),
  },
  {
    id: MAPPINGS_TAB_ID,
    name: (
      <FormattedMessage
        id="xpack.idxMgmt.templateDetails.mappingsTabTitle"
        defaultMessage="Mappings"
      />
    ),
  },
  {
    id: ALIASES_TAB_ID,
    name: (
      <FormattedMessage
        id="xpack.idxMgmt.templateDetails.aliasesTabTitle"
        defaultMessage="Aliases"
      />
    ),
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
  const { error, data: templateDetails, isLoading } = loadIndexTemplate(templateName);

  const [templateToDelete, setTemplateToDelete] = useState<Array<Template['name']>>([]);
  const [activeTab, setActiveTab] = useState<string>(SUMMARY_TAB_ID);
  const [isPopoverOpen, setIsPopOverOpen] = useState<boolean>(false);

  const contextMenuItems = [
    {
      type: 'edit',
      label: (
        <FormattedMessage
          id="xpack.idxMgmt.templateDetails.editButtonLabel"
          defaultMessage="Edit"
        />
      ),
      icon: <EuiIcon type="pencil" />,
      handleClick: () => editTemplate(templateName),
    },
    {
      type: 'clone',
      icon: <EuiIcon type="copy" />,
      label: (
        <FormattedMessage
          id="xpack.idxMgmt.templateDetails.cloneButtonLabel"
          defaultMessage="Clone"
        />
      ),
      handleClick: () => cloneTemplate(templateName),
    },
    {
      type: 'delete',
      icon: <EuiIcon type="trash" />,
      label: (
        <FormattedMessage
          id="xpack.idxMgmt.templateDetails.deleteButtonLabel"
          defaultMessage="Delete"
        />
      ),
      handleClick: () => setTemplateToDelete([templateName]),
    },
  ];

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
        error={error}
        data-test-subj="sectionError"
      />
    );
  } else if (templateDetails) {
    const Content = tabToComponentMap[activeTab];

    content = (
      <Fragment>
        <EuiTabs>
          {TABS.map(tab => (
            <EuiTab
              onClick={() => {
                trackUiMetric(METRIC_TYPE.CLICK, tabToUiMetricMap[tab.id]);
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
              {templateName}
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
                  anchorPosition="downCenter"
                >
                  <EuiContextMenuPanel
                    title={i18n.translate(
                      'xpack.idxMgmt.templateDetails.manageContextMenuPanelTitle',
                      {
                        defaultMessage: 'Template options',
                      }
                    )}
                    items={contextMenuItems.map(({ type, handleClick, label, icon }) => {
                      return (
                        <EuiContextMenuItem
                          key={type}
                          data-test-subj={`${type}TemplateLink`}
                          onClick={() => {
                            setIsPopOverOpen(false);
                            handleClick();
                          }}
                        >
                          <EuiFlexGroup alignItems="center">
                            <EuiFlexItem grow={false}>{icon}</EuiFlexItem>
                            <EuiFlexItem grow={false}>
                              <EuiText size="m">
                                <span>{label}</span>
                              </EuiText>
                            </EuiFlexItem>
                          </EuiFlexGroup>
                        </EuiContextMenuItem>
                      );
                    })}
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
