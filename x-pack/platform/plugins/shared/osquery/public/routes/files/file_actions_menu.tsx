/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
  EuiButtonIcon,
  EuiPopover,
  EuiContextMenuPanel,
  EuiContextMenuItem,
  EuiToolTip,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { FileActionsAuthz } from './use_file_actions_authz';
import { useFileActions } from './use_file_actions';
import { FileHashesFlyout } from './file_hashes_flyout';
import { RunScriptModal } from './run_script_modal';

interface FileActionsMenuProps {
  agentId: string;
  endpointId: string;
  path: string;
  authz: FileActionsAuthz;
}

const ARIA_LABEL = i18n.translate('xpack.osquery.fileSystem.actionsMenu.ariaLabel', {
  defaultMessage: 'File actions',
});

const TOOLTIP_NO_CAPABILITY = i18n.translate(
  'xpack.osquery.fileSystem.actionsMenu.tooltipNoCapability',
  { defaultMessage: 'Elastic Defend is not installed on this host' }
);

const TOOLTIP_NO_LICENSE = i18n.translate('xpack.osquery.fileSystem.actionsMenu.tooltipNoLicense', {
  defaultMessage: 'Requires an Enterprise license',
});

const TOOLTIP_NO_RBAC = i18n.translate('xpack.osquery.fileSystem.actionsMenu.tooltipNoRbac', {
  defaultMessage: 'You do not have permission to perform this action',
});

const resolveDisabledTooltip = (authz: FileActionsAuthz): string | undefined => {
  if (!authz.capability) return TOOLTIP_NO_CAPABILITY;
  if (!authz.license) return TOOLTIP_NO_LICENSE;
  if (!authz.rbac) return TOOLTIP_NO_RBAC;

  return undefined;
};

export const FileActionsMenu: React.FC<FileActionsMenuProps> = ({
  agentId,
  endpointId,
  path,
  authz,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [showHashesFlyout, setShowHashesFlyout] = useState(false);
  const [showRunScriptModal, setShowRunScriptModal] = useState(false);

  const { getFile, runScript } = useFileActions({ endpointId, agentId });

  const openMenu = useCallback(() => setIsOpen(true), []);
  const closeMenu = useCallback(() => setIsOpen(false), []);
  const closeHashesFlyout = useCallback(() => setShowHashesFlyout(false), []);
  const closeRunScriptModal = useCallback(() => setShowRunScriptModal(false), []);

  const handleGetFile = useCallback(async () => {
    closeMenu();
    await getFile(path);
  }, [closeMenu, getFile, path]);

  const handleRunScriptRequest = useCallback(() => {
    closeMenu();
    setShowRunScriptModal(true);
  }, [closeMenu]);

  const handleRunScriptConfirm = useCallback(async () => {
    setShowRunScriptModal(false);
    await runScript(path);
  }, [runScript, path]);

  const handleShowHashes = useCallback(() => {
    closeMenu();
    setShowHashesFlyout(true);
  }, [closeMenu]);

  const disabledTooltip = resolveDisabledTooltip(authz);
  const actVerbsDisabled = !!disabledTooltip;

  const button = (
    <EuiButtonIcon
      iconType="boxesHorizontal"
      aria-label={ARIA_LABEL}
      onClick={openMenu}
      size="xs"
      data-test-subj={`fileActionsMenuButton-${path}`}
    />
  );

  const getFileItem = (
    <EuiContextMenuItem
      key="get_file"
      icon="download"
      disabled={actVerbsDisabled}
      onClick={handleGetFile}
      data-test-subj="fileActionGetFile"
    >
      <FormattedMessage
        id="xpack.osquery.fileSystem.actionsMenu.getFile"
        defaultMessage="Get file"
      />
    </EuiContextMenuItem>
  );

  const runScriptItem = (
    <EuiContextMenuItem
      key="run_script"
      icon="play"
      disabled={actVerbsDisabled}
      onClick={handleRunScriptRequest}
      data-test-subj="fileActionRunScript"
    >
      <FormattedMessage
        id="xpack.osquery.fileSystem.actionsMenu.runScript"
        defaultMessage="Run script"
      />
    </EuiContextMenuItem>
  );

  const viewHashesItem = (
    <EuiContextMenuItem
      key="hashes"
      icon="inspect"
      onClick={handleShowHashes}
      data-test-subj="fileActionViewHashes"
    >
      <FormattedMessage
        id="xpack.osquery.fileSystem.actionsMenu.viewHashes"
        defaultMessage="View hashes"
      />
    </EuiContextMenuItem>
  );

  const wrapWithTooltipIfDisabled = useCallback(
    (item: React.ReactElement) => {
      if (!actVerbsDisabled || !disabledTooltip) return item;

      return (
        <EuiToolTip content={disabledTooltip} key={item.key ?? undefined}>
          <span>{item}</span>
        </EuiToolTip>
      );
    },
    [actVerbsDisabled, disabledTooltip]
  );

  const menuItems = useMemo(
    () => [
      wrapWithTooltipIfDisabled(getFileItem),
      wrapWithTooltipIfDisabled(runScriptItem),
      viewHashesItem,
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [actVerbsDisabled, disabledTooltip, handleGetFile, handleRunScriptRequest, handleShowHashes]
  );

  return (
    <>
      <EuiPopover
        button={button}
        isOpen={isOpen}
        closePopover={closeMenu}
        panelPaddingSize="none"
        anchorPosition="downRight"
      >
        <EuiContextMenuPanel items={menuItems} />
      </EuiPopover>

      {showHashesFlyout && (
        <FileHashesFlyout agentId={agentId} path={path} onClose={closeHashesFlyout} />
      )}

      {showRunScriptModal && (
        <RunScriptModal
          path={path}
          onConfirm={handleRunScriptConfirm}
          onCancel={closeRunScriptModal}
        />
      )}
    </>
  );
};
