/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable complexity */

import React, { useCallback, useState } from 'react';
import {
  EuiButton,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiSpacer,
  EuiText,
  EuiTitle,
  EuiToolTip,
} from '@elastic/eui';
import { isEmpty } from 'lodash/fp';

import type { CaseUI, CaseConnectors } from '../../../common/ui/types';
import type {
  ActionConnector,
  CaseConnector,
  ExternalSyncSettings,
} from '../../../common/types/domain';
import { ExperimentalBadge } from '../experimental_badge/experimental_badge';
import * as i18n from './translations';
import { getConnectorById } from '../utils';
import { usePushToService } from '../use_push_to_service';
import { useApplicationCapabilities } from '../../common/lib/kibana';
import { useIsExternalSyncEnabled } from '../../common/use_is_external_sync_enabled';
import { usePostSyncCase } from '../../containers/use_post_sync_case';
import { PushButton } from './push_button';
import { PushCallouts } from './push_callouts';
import { SyncButton } from './sync_button';
import { SyncSettings } from './sync_settings';
import { ConnectorsForm } from './connectors_form';
import { ConnectorFieldsPreviewForm } from '../connectors/fields_preview_form';
import { useCasesContext } from '../cases_context/use_cases_context';

export interface EditConnectorProps {
  caseData: CaseUI;
  caseConnectors: CaseConnectors;
  supportedActionConnectors: ActionConnector[];
  isLoading: boolean;
  onSubmit: (connector: CaseConnector) => void;
  /** Saves `settings.externalSync`; the sync controls are hidden when absent. */
  onUpdateSettings?: (settings: CaseUI['settings']) => void;
  showHeader?: boolean;
  /**
   * `icon` (default) matches the legacy pencil-icon-in-the-header look. `outlined`
   * renders the edit action as a labelled, bordered button alongside the push
   * button, matching the action buttons in the redesigned case header.
   */
  actionsVariant?: 'icon' | 'outlined';
}

export const EditConnector = React.memo(
  ({
    caseData,
    caseConnectors,
    supportedActionConnectors,
    isLoading,
    onSubmit,
    onUpdateSettings,
    showHeader = true,
    actionsVariant = 'icon',
  }: EditConnectorProps) => {
    const caseConnectorFields = caseData.connector.fields;
    const caseActionConnector = getConnectorById(caseData.connector.id, supportedActionConnectors);
    const isValidConnector = !!caseActionConnector;

    const [isEdit, setIsEdit] = useState(false);

    const { actions } = useApplicationCapabilities();
    const { permissions } = useCasesContext();
    const canUseConnectors = permissions.connectors && actions.read;
    const isExternalSyncEnabled = useIsExternalSyncEnabled();
    const { isLoading: isSyncing, mutate: syncFromExternalService } = usePostSyncCase();

    const onEditClick = useCallback(() => setIsEdit(true), []);
    const onCancelConnector = useCallback(() => setIsEdit(false), []);

    const onSubmitConnector = useCallback(
      (connector: CaseConnector) => {
        onSubmit(connector);
        setIsEdit(false);
      },
      [onSubmit]
    );

    const connectorWithName = {
      ...caseData.connector,
      name: isEmpty(caseActionConnector?.name)
        ? caseData.connector.name
        : caseActionConnector?.name ?? '',
    };

    const {
      errorsMsg,
      needsToBePushed,
      hasBeenPushed,
      isLoading: isLoadingPushToService,
      hasPushPermissions,
      hasErrorMessages,
      hasLicenseError,
      handlePushToService,
    } = usePushToService({
      connector: connectorWithName,
      caseConnectors,
      caseId: caseData.id,
      caseStatus: caseData.status,
      isValidConnector,
    });

    const disablePushButton =
      isLoadingPushToService ||
      errorsMsg.length > 0 ||
      !hasPushPermissions ||
      !isValidConnector ||
      !needsToBePushed;

    const isOutlined = actionsVariant === 'outlined';
    const showEditAction = !isLoading && !isEdit && hasPushPermissions && canUseConnectors;
    // In the outlined (side panel) presentation there's no preview content to edit
    // when no connector has been selected yet, so the edit action is hidden until
    // one is chosen (e.g. via the settings popover's "Add connector" action).
    const showOutlinedEditAction = showEditAction && isValidConnector;
    const showPushAction =
      !hasErrorMessages && !isLoading && !isEdit && hasPushPermissions && canUseConnectors;
    // Nothing renders in the header row when there's no header and the edit action has
    // moved down next to the push button, so skip the divider below it too instead of
    // showing a stray line with an empty row above it.
    const showHeaderDivider = showHeader || (showEditAction && !isOutlined);
    // Sync needs a saved connector on the case and the same privilege as push.
    const showSyncControls =
      isExternalSyncEnabled &&
      showPushAction &&
      isValidConnector &&
      permissions.update &&
      onUpdateSettings != null;

    const connectorName = connectorWithName.name;
    const handleSync = useCallback(
      () => syncFromExternalService({ caseId: caseData.id, connectorName }),
      [caseData.id, connectorName, syncFromExternalService]
    );
    const caseSettings = caseData.settings;
    const handleSyncSettingsChange = useCallback(
      (externalSync: ExternalSyncSettings) => onUpdateSettings?.({ ...caseSettings, externalSync }),
      [caseSettings, onUpdateSettings]
    );

    const syncButton = showSyncControls ? (
      <SyncButton
        hasBeenPushed={hasBeenPushed}
        disabled={!hasBeenPushed || isSyncing || isLoadingPushToService}
        isLoading={isSyncing}
        connectorName={connectorName}
        onSync={handleSync}
        variant={isOutlined ? 'outlined' : 'empty'}
      />
    ) : null;

    return (
      <EuiFlexItem grow={false} data-test-subj="sidebar-connectors">
        <EuiFlexGroup
          alignItems="center"
          gutterSize="xs"
          justifyContent={showHeader ? 'spaceBetween' : 'flexEnd'}
          responsive={false}
          data-test-subj="case-view-edit-connector"
        >
          {showHeader ? (
            <EuiFlexItem grow={false} data-test-subj="connector-edit-header">
              <EuiTitle size="xs">
                <h3>{i18n.CONNECTORS}</h3>
              </EuiTitle>
            </EuiFlexItem>
          ) : null}
          {showEditAction && !isOutlined ? (
            <EuiFlexItem data-test-subj="connector-edit" grow={false}>
              <EuiToolTip content={i18n.EDIT_CONNECTOR_ARIA} disableScreenReaderOutput>
                <EuiButtonIcon
                  data-test-subj="connector-edit-button"
                  aria-label={i18n.EDIT_CONNECTOR_ARIA}
                  iconType="pencil"
                  onClick={onEditClick}
                />
              </EuiToolTip>
            </EuiFlexItem>
          ) : null}
        </EuiFlexGroup>
        {showHeaderDivider ? <EuiHorizontalRule margin="xs" /> : null}
        <EuiFlexGroup data-test-subj="edit-connectors" direction="column" alignItems="stretch">
          {!isLoading && !isEdit && hasErrorMessages && canUseConnectors && (
            <EuiFlexItem data-test-subj="push-callouts">
              <PushCallouts
                errorsMsg={errorsMsg}
                hasLicenseError={hasLicenseError}
                hasConnectors={supportedActionConnectors.length > 0}
                onEditClick={onEditClick}
              />
            </EuiFlexItem>
          )}
          {!canUseConnectors && (
            <EuiText data-test-subj="edit-connector-permissions-error-msg" size="s">
              <span>{i18n.READ_ACTIONS_PERMISSIONS_ERROR_MSG}</span>
            </EuiText>
          )}
          {canUseConnectors && !isEdit && (
            <ConnectorFieldsPreviewForm
              connector={caseActionConnector}
              fields={caseConnectorFields}
            />
          )}
          {showSyncControls ? (
            <EuiFlexItem grow={false}>
              <EuiFlexGroup alignItems="center" gutterSize="none" responsive={false}>
                <EuiFlexItem grow={false}>
                  <EuiText size="xs">
                    <h4>{i18n.SYNC_TITLE}</h4>
                  </EuiText>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <ExperimentalBadge compact data-test-subj="connector-sync-tech-preview-badge" />
                </EuiFlexItem>
              </EuiFlexGroup>
              <EuiSpacer size="s" />
              <SyncSettings
                compressed
                value={caseSettings.externalSync}
                disabled={isLoading}
                onChange={handleSyncSettingsChange}
              />
            </EuiFlexItem>
          ) : null}
          {canUseConnectors && isEdit && (
            <ConnectorsForm
              caseData={caseData}
              caseConnectors={caseConnectors}
              supportedActionConnectors={supportedActionConnectors}
              isLoading={isLoading}
              onCancel={onCancelConnector}
              onSubmit={onSubmitConnector}
            />
          )}
          {isOutlined
            ? (showOutlinedEditAction || showPushAction) && (
                <EuiFlexItem grow={false}>
                  <EuiFlexGroup
                    gutterSize="s"
                    responsive={false}
                    data-test-subj="connector-outlined-actions"
                  >
                    {showOutlinedEditAction ? (
                      <EuiFlexItem grow={false}>
                        <EuiButton
                          data-test-subj="connector-edit-button"
                          size="s"
                          color="text"
                          iconType="pencil"
                          onClick={onEditClick}
                        >
                          {i18n.EDIT}
                        </EuiButton>
                      </EuiFlexItem>
                    ) : null}
                    {showPushAction ? (
                      <EuiFlexItem grow={false}>
                        <span>
                          <PushButton
                            hasBeenPushed={hasBeenPushed}
                            disabled={disablePushButton}
                            isLoading={isLoadingPushToService}
                            pushToService={handlePushToService}
                            errorsMsg={errorsMsg}
                            showTooltip={
                              errorsMsg.length > 0 || !needsToBePushed || !hasPushPermissions
                            }
                            connectorName={connectorWithName.name}
                            variant="outlined"
                          />
                        </span>
                      </EuiFlexItem>
                    ) : null}
                    {syncButton ? (
                      <EuiFlexItem grow={false}>
                        <span>{syncButton}</span>
                      </EuiFlexItem>
                    ) : null}
                  </EuiFlexGroup>
                </EuiFlexItem>
              )
            : showPushAction && (
                <EuiFlexItem grow={false}>
                  <span>
                    <PushButton
                      hasBeenPushed={hasBeenPushed}
                      disabled={disablePushButton}
                      isLoading={isLoadingPushToService}
                      pushToService={handlePushToService}
                      errorsMsg={errorsMsg}
                      showTooltip={errorsMsg.length > 0 || !needsToBePushed || !hasPushPermissions}
                      connectorName={connectorWithName.name}
                    />
                    {syncButton}
                  </span>
                </EuiFlexItem>
              )}
        </EuiFlexGroup>
      </EuiFlexItem>
    );
  }
);

EditConnector.displayName = 'EditConnector';
