/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, type FC, useCallback } from 'react';
import {
  EuiButton,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiOutsideClickDetector,
  EuiWindowEvent,
  keys,
  useGeneratedHtmlId,
} from '@elastic/eui';

import { css } from '@emotion/css';

import type { FleetConfigType, FleetStartServices } from '../../../../plugin';
import type { UIExtensionsStorage } from '../../../../types';

import type { DetailViewPanelName } from '../../../../applications/integrations/sections/epm/screens/detail';
import { Detail } from '../../../../applications/integrations/sections/epm/screens/detail';
import { CreatePackagePolicyPage } from '../../../../applications/fleet/sections/agent_policy/create_package_policy_page';

import { EmbeddedIntegrationsFlowAppContext } from './components/app_context';

export interface EmbeddedIntegrationsFlowProps {
  startServices: FleetStartServices;
  kibanaVersion: string;
  config: FleetConfigType;
  extensions: UIExtensionsStorage;
  integrationName?: string;
  onClose?: () => void;
}

const integrationStepMap = [
  'Add integration',
  'Check fleet server requirement',
  'Add Fleet server',
  'Install Elastic Agent',
  'Confirm incoming data',
];

export const EmbeddedIntegrationsFlow: FC<EmbeddedIntegrationsFlowProps> = ({
  startServices,
  kibanaVersion,
  config,
  extensions,
  integrationName,
  onClose,
}) => {
  const modalTitleId = useGeneratedHtmlId();
  const [modalView, setModalView] = useState<'overview' | 'configure-integration' | 'add-agent'>(
    'overview'
  );
  const [integrationStep, onStepNext] = useState(0);
  const [selectedDetailsTab, setSelectedDetailsTab] = useState<DetailViewPanelName>('overview');

  /**
   * ESC key closes CustomFlyout
   */
  const handleCloseOnEscKey = (event: any) => {
    if (event.key === keys.ESCAPE) {
      event.preventDefault();
      event.stopPropagation();
      onClose?.();
    }
  };

  const handleViewAssets = useCallback(() => {
    setModalView('overview');
    setSelectedDetailsTab('assets');
  }, []);

  const onDetailsTabClick = useCallback((detailsTab: DetailViewPanelName) => {
    setSelectedDetailsTab(detailsTab);
  }, []);

  const handleAddIntegrationPolicyClick = useCallback(() => {
    setModalView('configure-integration');
  }, []);
  const handleCloseModal = useCallback(() => {
    setModalView('overview');
    setSelectedDetailsTab('overview');
    onStepNext(0);
    onClose?.();
  }, [onClose]);

  return (
    <>
      <EuiWindowEvent event="keydown" handler={handleCloseOnEscKey} />
      <EuiOutsideClickDetector onOutsideClick={handleCloseModal}>
        <EuiModal
          css={css`
            min-inline-size: initial;
            max-inline-size: initial;
            inline-size: 1083px;
            block-size: 75vh;
          `}
          aria-labelledby={modalTitleId}
          onClose={handleCloseModal}
        >
          {modalView === 'configure-integration' && (
            <EuiModalHeader>{`step indicator place holder. Integration step: ${integrationStepMap[integrationStep]}`}</EuiModalHeader>
          )}
          <EuiModalBody>
            <EmbeddedIntegrationsFlowAppContext
              startServices={startServices}
              kibanaVersion={kibanaVersion}
              config={config}
              extensions={extensions}
            >
              {modalView === 'overview' && (
                <Detail
                  onAddIntegrationPolicyClick={handleAddIntegrationPolicyClick}
                  originFrom="onboarding-hub"
                  routesEnabled={false}
                  onDetailsTabClick={onDetailsTabClick}
                  selectedDetailsTab={selectedDetailsTab}
                />
              )}
              {modalView === 'configure-integration' && (
                <CreatePackagePolicyPage
                  useMultiPageLayoutProp={true}
                  originFrom="onboarding-hub"
                  integrationName={integrationName}
                  onStepNext={onStepNext}
                  onCancel={handleCloseModal}
                  handleViewAssets={handleViewAssets}
                />
              )}
            </EmbeddedIntegrationsFlowAppContext>
          </EuiModalBody>
          {modalView === 'configure-integration' && (
            <EuiModalFooter>
              <EuiButton onClick={handleCloseModal}>Close</EuiButton>
            </EuiModalFooter>
          )}
        </EuiModal>
      </EuiOutsideClickDetector>
    </>
  );
};
