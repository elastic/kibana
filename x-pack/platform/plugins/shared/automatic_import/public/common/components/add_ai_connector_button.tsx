/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Suspense, useCallback, useState } from 'react';
import { EuiButtonEmpty, EuiToolTip } from '@elastic/eui';
import { useAuthorization } from '../hooks/use_authorization';
import { useAiConnectors } from '../hooks/use_ai_connectors';
import { ConnectorSetup } from './connector_setup';
import * as i18n from './translations';

export const AddAiConnectorButton: React.FC = () => {
  const { canCreateConnectors } = useAuthorization();
  const { refetch } = useAiConnectors();
  const [isSetupVisible, setIsSetupVisible] = useState(false);

  const openSetup = useCallback(() => setIsSetupVisible(true), []);
  const closeSetup = useCallback(() => setIsSetupVisible(false), []);
  const handleConnectorCreated = useCallback(() => {
    setIsSetupVisible(false);
    refetch();
  }, [refetch]);

  const button = (
    <EuiButtonEmpty
      color="primary"
      size="s"
      iconType="plusCircle"
      isDisabled={!canCreateConnectors}
      onClick={openSetup}
      data-test-subj={
        canCreateConnectors ? 'addNewConnectorButton' : 'addNewConnectorButtonDisabled'
      }
    >
      {i18n.ADD_AI_CONNECTOR_BUTTON_LABEL}
    </EuiButtonEmpty>
  );

  return (
    <>
      {canCreateConnectors ? (
        button
      ) : (
        <EuiToolTip content={i18n.ADD_CONNECTOR_NO_PERMISSION_TOOLTIP}>
          <span css={{ display: 'inline-block' }} tabIndex={0}>
            {button}
          </span>
        </EuiToolTip>
      )}

      {isSetupVisible && (
        <Suspense fallback={null}>
          <ConnectorSetup onClose={closeSetup} onConnectorCreated={handleConnectorCreated} />
        </Suspense>
      )}
    </>
  );
};

AddAiConnectorButton.displayName = 'AddAiConnectorButton';
