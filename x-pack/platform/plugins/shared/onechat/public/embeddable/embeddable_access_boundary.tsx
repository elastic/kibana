/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type ReactNode, useEffect, useState } from 'react';
import {
  EuiLoadingSpinner,
  EuiFlyoutHeader,
  EuiFlyoutBody,
  EuiButtonIcon,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { ONECHAT_FEATURE_ID, uiPrivileges } from '../../common/features';
import { useOnechatServices } from '../application/hooks/use_onechat_service';
import { useKibana } from '../application/hooks/use_kibana';
import { UpgradeLicensePrompt } from '../application/components/access/prompts/upgrade_license_prompt';
import { AddLlmConnectionPrompt } from '../application/components/access/prompts/add_llm_connection_prompt';
import { NoPrivilegePrompt } from '../application/components/access/prompts/no_privilege_prompt';

export interface EmbeddableAccessBoundaryProps {
  children: ReactNode;
  onClose?: () => void;
}

interface AccessState {
  isLoading: boolean;
  hasShowPrivilege: boolean;
  hasRequiredLicense: boolean;
  hasLlmConnector: boolean;
}

export const EmbeddableAccessBoundary: React.FC<EmbeddableAccessBoundaryProps> = ({
  children,
  onClose,
}) => {
  const { accessChecker } = useOnechatServices();
  const {
    services: { application },
  } = useKibana();
  const { euiTheme } = useEuiTheme();

  const [accessState, setAccessState] = useState<AccessState>({
    isLoading: true,
    hasShowPrivilege: false,
    hasRequiredLicense: false,
    hasLlmConnector: false,
  });

  useEffect(() => {
    const checkAccess = async () => {
      try {
        // Check user capabilities for 'show' privilege
        const { capabilities } = application;
        const hasShowPrivilege = Boolean(capabilities[ONECHAT_FEATURE_ID]?.[uiPrivileges.show]);

        // Initialize and get access checker results
        await accessChecker.initAccess();
        const { hasRequiredLicense, hasLlmConnector } = accessChecker.getAccess();

        setAccessState({
          isLoading: false,
          hasShowPrivilege,
          hasRequiredLicense,
          hasLlmConnector,
        });
      } catch (error) {
        // If access check fails, deny access
        setAccessState({
          isLoading: false,
          hasShowPrivilege: false,
          hasRequiredLicense: false,
          hasLlmConnector: false,
        });
      }
    };

    checkAccess();
  }, [application, accessChecker]);

  const headerHeight = `calc(${euiTheme.size.xl} * 2)`;
  const headerStyles = css`
    display: flex;
    justify-content: flex-end;
    height: ${headerHeight};
    &.euiFlyoutHeader {
      padding: ${euiTheme.size.base};
    }
  `;

  const bodyStyles = css`
    flex: 1;
    min-height: 0;
    .euiFlyoutBody__overflowContent {
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      height: 100%;
    }
  `;

  const closeButtonLabel = i18n.translate('xpack.onechat.embeddable.accessBoundary.closeButton', {
    defaultMessage: 'Close',
  });

  const renderAccessDenied = (prompt: React.ReactNode) => (
    <>
      <EuiFlyoutHeader css={headerStyles}>
        {onClose && (
          <EuiButtonIcon
            iconType="cross"
            aria-label={closeButtonLabel}
            onClick={onClose}
            data-test-subj="embeddableAccessBoundaryCloseButton"
          />
        )}
      </EuiFlyoutHeader>
      <EuiFlyoutBody css={bodyStyles}>{prompt}</EuiFlyoutBody>
    </>
  );

  if (accessState.isLoading) {
    return renderAccessDenied(<EuiLoadingSpinner size="xl" />);
  }

  if (!accessState.hasRequiredLicense) {
    return renderAccessDenied(<UpgradeLicensePrompt variant="embeddable" />);
  }

  if (!accessState.hasShowPrivilege) {
    return renderAccessDenied(<NoPrivilegePrompt variant="embeddable" />);
  }

  if (!accessState.hasLlmConnector) {
    return renderAccessDenied(<AddLlmConnectionPrompt variant="embeddable" />);
  }

  return children;
};
