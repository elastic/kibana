/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import {
  EuiButton,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiPopover,
  EuiText,
} from '@elastic/eui';
import useToggle from 'react-use/lib/useToggle';
import { AGENT_BUILDER_UI_EBT } from '@kbn/agent-builder-common';
import { getEbtProps } from '@kbn/ebt-click';
import { labels } from '../../utils/i18n';
import { InstallFromUrlModal } from './install_from_url_modal';
import { UploadPluginModal } from './upload_plugin_modal';

type ModalType = 'url' | 'upload' | null;

export const InstallPluginButton: React.FC = () => {
  const [isPopoverOpen, togglePopover] = useToggle(false);
  const [openModal, setOpenModal] = useState<ModalType>(null);

  const closePopover = useCallback(() => togglePopover(false), [togglePopover]);

  const handleOpenUrlModal = useCallback(() => {
    closePopover();
    setOpenModal('url');
  }, [closePopover]);

  const handleOpenUploadModal = useCallback(() => {
    closePopover();
    setOpenModal('upload');
  }, [closePopover]);

  const handleCloseModal = useCallback(() => {
    setOpenModal(null);
  }, []);

  return (
    <>
      <EuiPopover
        button={
          <EuiButton
            fill
            iconType="plusInCircle"
            iconSide="left"
            onClick={togglePopover}
            data-test-subj="agentBuilderInstallPluginButton"
            {...getEbtProps({
              element: AGENT_BUILDER_UI_EBT.element.pageContent,
              action: AGENT_BUILDER_UI_EBT.action.globalManagement.INSTALL_PLUGIN,
              detail: AGENT_BUILDER_UI_EBT.entity.PLUGIN,
            })}
          >
            <EuiText size="s">{labels.plugins.installPluginButton}</EuiText>
          </EuiButton>
        }
        isOpen={isPopoverOpen}
        closePopover={closePopover}
        anchorPosition="downLeft"
        panelPaddingSize="none"
      >
        <EuiContextMenuPanel
          items={[
            <EuiContextMenuItem
              key="installFromUrl"
              icon="link"
              onClick={handleOpenUrlModal}
              data-test-subj="agentBuilderInstallFromUrlMenuItem"
              {...getEbtProps({
                element: AGENT_BUILDER_UI_EBT.element.pageContent,
                action: AGENT_BUILDER_UI_EBT.action.globalManagement.INSTALL_FROM_URL,
                detail: AGENT_BUILDER_UI_EBT.entity.PLUGIN,
              })}
            >
              {labels.plugins.installFromUrlMenuItem}
            </EuiContextMenuItem>,
            <EuiContextMenuItem
              key="uploadZip"
              icon="exportAction"
              onClick={handleOpenUploadModal}
              data-test-subj="agentBuilderUploadPluginMenuItem"
              {...getEbtProps({
                element: AGENT_BUILDER_UI_EBT.element.pageContent,
                action: AGENT_BUILDER_UI_EBT.action.globalManagement.UPLOAD_PLUGIN,
                detail: AGENT_BUILDER_UI_EBT.entity.PLUGIN,
              })}
            >
              {labels.plugins.uploadMenuItem}
            </EuiContextMenuItem>,
          ]}
        />
      </EuiPopover>
      {openModal === 'url' && <InstallFromUrlModal onClose={handleCloseModal} />}
      {openModal === 'upload' && <UploadPluginModal onClose={handleCloseModal} />}
    </>
  );
};
