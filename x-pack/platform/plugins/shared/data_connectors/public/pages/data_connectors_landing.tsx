/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiCard,
  EuiConfirmModal,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiFieldSearch,
  EuiFilterButton,
  EuiFilterGroup,
  EuiFlexGrid,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPopover,
  EuiSpacer,
  EuiText,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import React, { useMemo, useState } from 'react';
import { WORKPLACE_CONNECTOR_TYPES } from '../../common';
import { DATA_CONNECTORS_FULL_TITLE } from '../../common/constants';
import { BraveLogo } from '../components/brave_logo';
import { ConnectorFlyout } from '../components/connector_flyout';
import { GoogleDriveConnectorFlyout } from '../components/google_drive_connector_flyout';
import { GoogleDriveLogo } from '../components/google_drive_logo';
import { useConnectors } from '../hooks/use_connectors';

export const DataConnectorsLandingPage = () => {
  const { services } = useKibana();
  const httpClient = services.http;

  const [isFlyoutOpen, setIsFlyoutOpen] = useState(false);
  const [selectedConnectorType, setSelectedConnectorType] = useState<string | null>(null);

  const { euiTheme } = useEuiTheme();
  const { isLoading, createConnector, deleteConnector, isConnected, connectors } =
    useConnectors(httpClient);
  const brave = useMemo(
    () => connectors.find((c) => c.type === WORKPLACE_CONNECTOR_TYPES.BRAVE_SEARCH),
    [connectors]
  );
  const googleDrive = useMemo(
    () => connectors.find((c) => c.type === WORKPLACE_CONNECTOR_TYPES.GOOGLE_DRIVE),
    [connectors]
  );
  const braveId = brave?.id;
  const googleDriveId = googleDrive?.id;
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isGoogleDriveMenuOpen, setIsGoogleDriveMenuOpen] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [connectorToDelete, setConnectorToDelete] = useState<string | null>(null);

  const handleSelectConnector = (connectorType: string) => {
    setSelectedConnectorType(connectorType);
    setIsFlyoutOpen(true);
  };

  const handleSaveBraveConnector = async (data: {
    apiKey: string;
    name?: string;
    features?: string[];
  }) => {
    if (!selectedConnectorType) return;

    await createConnector({
      name: 'Brave Search',
      type: selectedConnectorType,
      secrets: {
        api_key: data.apiKey,
      },
      config: {},
      features: data.features && data.features.length ? data.features : ['search_web'],
    });
  };

  const handleSaveGoogleDriveConnector = async (data: { features?: string[] }) => {
    if (!selectedConnectorType) return;

    await createConnector({
      name: 'Google Drive',
      type: selectedConnectorType,
      secrets: {},
      config: {},
      features: data.features && data.features.length ? data.features : ['search_files'],
    });
  };

  const handleCloseFlyout = () => {
    setIsFlyoutOpen(false);
    setSelectedConnectorType(null);
  };

  const braveConnected = isConnected(WORKPLACE_CONNECTOR_TYPES.BRAVE_SEARCH);
  const googleDriveConnected = isConnected(WORKPLACE_CONNECTOR_TYPES.GOOGLE_DRIVE);

  const closeMenu = () => setIsMenuOpen(false);
  const closeGoogleDriveMenu = () => setIsGoogleDriveMenuOpen(false);

  const onConfigure = () => {
    setSelectedConnectorType(WORKPLACE_CONNECTOR_TYPES.BRAVE_SEARCH);
    setIsFlyoutOpen(true);
    closeMenu();
  };
  const onDelete = () => {
    setConnectorToDelete(braveId || null);
    setShowDeleteModal(true);
    closeMenu();
  };

  const onConfigureGoogleDrive = () => {
    setSelectedConnectorType(WORKPLACE_CONNECTOR_TYPES.GOOGLE_DRIVE);
    setIsFlyoutOpen(true);
    closeGoogleDriveMenu();
  };
  const onDeleteGoogleDrive = () => {
    setConnectorToDelete(googleDriveId || null);
    setShowDeleteModal(true);
    closeGoogleDriveMenu();
  };

  const modalTitleId = useGeneratedHtmlId();

  return (
    <KibanaPageTemplate>
      <KibanaPageTemplate.Header
        pageTitle={DATA_CONNECTORS_FULL_TITLE}
        css={css`
          background-color: ${euiTheme.colors.backgroundBasePlain};
        `}
      >
        <EuiText>
          {i18n.translate('xpack.dataConnectors.landingPage.description', {
            defaultMessage: 'Connect to external data sources to power your agents and indices.',
          })}
        </EuiText>
      </KibanaPageTemplate.Header>
      <KibanaPageTemplate.Section>
        <EuiFlexGroup gutterSize="m" alignItems="center">
          <EuiFlexItem>
            <EuiFieldSearch fullWidth placeholder="Search" aria-label="Search connectors" />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFilterGroup>
              <EuiFilterButton hasActiveFilters={false} numFilters={1} iconType="arrowDown">
                Categories
              </EuiFilterButton>
            </EuiFilterGroup>
          </EuiFlexItem>
        </EuiFlexGroup>

        <EuiSpacer size="xl" />

        <EuiFlexGrid columns={4} gutterSize="m">
          <EuiFlexItem>
            <div style={{ position: 'relative' }}>
              <EuiCard
                icon={<BraveLogo size={48} />}
                title="Brave Search"
                description="Connect to Brave Search API for web search capabilities."
                footer={
                  <EuiFlexGroup justifyContent="center" gutterSize="xs" responsive={false}>
                    {braveConnected ? (
                      <EuiFlexItem grow={false}>
                        <EuiPopover
                          button={
                            <EuiButton
                              size="s"
                              iconType="arrowDown"
                              iconSide="right"
                              onClick={() => setIsMenuOpen((v) => !v)}
                              color="success"
                              fill
                              style={{
                                backgroundColor: '#008A5E',
                                borderColor: '#008A5E',
                                color: '#FFFFFF',
                                opacity: 1,
                              }}
                            >
                              Connected
                            </EuiButton>
                          }
                          isOpen={isMenuOpen}
                          closePopover={closeMenu}
                          panelPaddingSize="none"
                          anchorPosition="downLeft"
                        >
                          <EuiContextMenuPanel
                            items={[
                              <EuiContextMenuItem key="configure" icon="gear" onClick={onConfigure}>
                                Configure
                              </EuiContextMenuItem>,
                              <EuiContextMenuItem
                                key="delete"
                                icon="trash"
                                css={css`
                                  color: ${euiTheme.colors.textDanger};
                                `}
                                onClick={onDelete}
                              >
                                <span className="euiTextColor-danger">Delete</span>
                              </EuiContextMenuItem>,
                            ]}
                          />
                        </EuiPopover>
                      </EuiFlexItem>
                    ) : (
                      <EuiFlexItem grow={false}>
                        <EuiButton
                          size="s"
                          onClick={() =>
                            handleSelectConnector(WORKPLACE_CONNECTOR_TYPES.BRAVE_SEARCH)
                          }
                          isLoading={isLoading}
                          color="primary"
                          fill
                        >
                          Connect
                        </EuiButton>
                      </EuiFlexItem>
                    )}
                  </EuiFlexGroup>
                }
              />
            </div>
          </EuiFlexItem>

          <EuiFlexItem>
            <div style={{ position: 'relative' }}>
              <EuiCard
                icon={<GoogleDriveLogo size={48} />}
                title="Google Drive"
                description="Connect to Google Drive to search and access files using OAuth."
                footer={
                  <EuiFlexGroup justifyContent="center" gutterSize="xs" responsive={false}>
                    {googleDriveConnected ? (
                      <EuiFlexItem grow={false}>
                        <EuiPopover
                          button={
                            <EuiButton
                              size="s"
                              iconType="arrowDown"
                              iconSide="right"
                              onClick={() => setIsGoogleDriveMenuOpen((v) => !v)}
                              color="success"
                              fill
                              style={{
                                backgroundColor: '#008A5E',
                                borderColor: '#008A5E',
                                color: '#FFFFFF',
                                opacity: 1,
                              }}
                            >
                              Connected
                            </EuiButton>
                          }
                          isOpen={isGoogleDriveMenuOpen}
                          closePopover={closeGoogleDriveMenu}
                          panelPaddingSize="none"
                          anchorPosition="downLeft"
                        >
                          <EuiContextMenuPanel
                            items={[
                              <EuiContextMenuItem
                                key="configure"
                                icon="gear"
                                onClick={onConfigureGoogleDrive}
                              >
                                Configure
                              </EuiContextMenuItem>,
                              <EuiContextMenuItem
                                key="delete"
                                icon="trash"
                                css={css`
                                  color: ${euiTheme.colors.textDanger};
                                `}
                                onClick={onDeleteGoogleDrive}
                              >
                                <span className="euiTextColor-danger">Delete</span>
                              </EuiContextMenuItem>,
                            ]}
                          />
                        </EuiPopover>
                      </EuiFlexItem>
                    ) : (
                      <EuiFlexItem grow={false}>
                        <EuiButton
                          size="s"
                          onClick={() =>
                            handleSelectConnector(WORKPLACE_CONNECTOR_TYPES.GOOGLE_DRIVE)
                          }
                          isLoading={isLoading}
                          color="primary"
                          fill
                        >
                          Connect
                        </EuiButton>
                      </EuiFlexItem>
                    )}
                  </EuiFlexGroup>
                }
              />
            </div>
          </EuiFlexItem>
        </EuiFlexGrid>
      </KibanaPageTemplate.Section>

      {isFlyoutOpen &&
        selectedConnectorType &&
        selectedConnectorType === WORKPLACE_CONNECTOR_TYPES.BRAVE_SEARCH && (
          <ConnectorFlyout
            connectorType={selectedConnectorType}
            connectorName="Brave Search"
            onClose={handleCloseFlyout}
            onSave={handleSaveBraveConnector}
            isEditing={Boolean(braveConnected)}
          />
        )}

      {isFlyoutOpen &&
        selectedConnectorType &&
        selectedConnectorType === WORKPLACE_CONNECTOR_TYPES.GOOGLE_DRIVE && (
          <GoogleDriveConnectorFlyout
            onClose={handleCloseFlyout}
            isEditing={Boolean(googleDriveConnected)}
          />
        )}

      {showDeleteModal && (
        <EuiConfirmModal
          title="Delete connector?"
          aria-labelledby={modalTitleId}
          titleProps={{ id: modalTitleId }}
          onCancel={() => {
            setShowDeleteModal(false);
            setConnectorToDelete(null);
          }}
          onConfirm={async () => {
            if (connectorToDelete) {
              await deleteConnector(connectorToDelete);
            }
            setShowDeleteModal(false);
            setConnectorToDelete(null);
          }}
          cancelButtonText="Cancel"
          confirmButtonText="Delete"
          buttonColor="danger"
        />
      )}
    </KibanaPageTemplate>
  );
};
