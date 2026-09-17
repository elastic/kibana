/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UseEuiTheme } from '@elastic/eui';
import { EuiButton, EuiButtonIcon, EuiContextMenuItem, EuiPopover, EuiToolTip } from '@elastic/eui';
import { css } from '@emotion/react';
import React, { useState } from 'react';

import { i18n } from '@kbn/i18n';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';

import { ServiceAccountsEmptyPrompt } from './service_accounts_empty_prompt';

const headerStyles = ({ euiTheme }: UseEuiTheme) => css`
  background-color: ${euiTheme.colors.backgroundBasePlain};
  border-block-end: ${euiTheme.border.thin};
`;

const serviceAccountsDocsUrl =
  'https://www.elastic.co/docs/deploy-manage/users-roles/cluster-or-deployment-auth/service-accounts';

export interface ServiceAccountsPageProps {
  onCreateAccount: () => void;
}

export const ServiceAccountsPage = ({ onCreateAccount }: ServiceAccountsPageProps) => {
  const [isActionsPopoverOpen, setIsActionsPopoverOpen] = useState(false);
  const moreActionsLabel = i18n.translate(
    'xpack.security.management.serviceAccounts.moreActionsButton',
    {
      defaultMessage: 'More actions',
    }
  );

  return (
    <>
      <KibanaPageTemplate.Header
        css={headerStyles}
        pageTitle={i18n.translate('xpack.security.management.serviceAccounts.pageTitle', {
          defaultMessage: 'Service accounts',
        })}
        description={i18n.translate('xpack.security.management.serviceAccounts.pageDescription', {
          defaultMessage: 'Create a dedicated identity to execute workloads.',
        })}
        rightSideItems={[
          <EuiButton
            key="createAccount"
            color="text"
            iconType="plus"
            onClick={onCreateAccount}
            size="s"
            data-test-subj="serviceAccountsPageCreateButton"
          >
            {i18n.translate('xpack.security.management.serviceAccounts.createButton', {
              defaultMessage: 'Create account',
            })}
          </EuiButton>,
          <EuiPopover
            key="moreActions"
            aria-label={moreActionsLabel}
            isOpen={isActionsPopoverOpen}
            closePopover={() => setIsActionsPopoverOpen(false)}
            panelPaddingSize="none"
            button={
              <EuiToolTip content={moreActionsLabel} disableScreenReaderOutput>
                <EuiButtonIcon
                  aria-label={moreActionsLabel}
                  color="text"
                  iconType="boxesVertical"
                  onClick={() => setIsActionsPopoverOpen((isOpen) => !isOpen)}
                  data-test-subj="serviceAccountsPageMoreActionsButton"
                />
              </EuiToolTip>
            }
          >
            <EuiContextMenuItem
              href={serviceAccountsDocsUrl}
              target="_blank"
              onClick={() => setIsActionsPopoverOpen(false)}
            >
              {i18n.translate('xpack.security.management.serviceAccounts.moreActionsDocsLink', {
                defaultMessage: 'Learn more in docs',
              })}
            </EuiContextMenuItem>
          </EuiPopover>,
        ]}
      />
      <KibanaPageTemplate.Section alignment="center" grow>
        <ServiceAccountsEmptyPrompt
          docsUrl={serviceAccountsDocsUrl}
          onCreateAccount={onCreateAccount}
        />
      </KibanaPageTemplate.Section>
    </>
  );
};
