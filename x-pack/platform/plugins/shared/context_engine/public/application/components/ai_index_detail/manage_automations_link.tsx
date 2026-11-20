/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiLink } from '@elastic/eui';
import { getEbtProps } from '@kbn/ebt-click';
import { FormattedMessage } from '@kbn/i18n-react';
import { getRouterLinkProps } from '@kbn/router-utils';
import React from 'react';
import { CONTEXT_ENGINE_UI_EBT } from '../../../../common/telemetry';
import { useNavigation } from '../../hooks/use_navigation';
import { getAiIndexSettingsPath } from '../../paths';

interface ManageAutomationsLinkProps {
  aiIndexId: string;
}

/** Links from the Overview Automations panel to the Settings tab, where automations are added. */
export const ManageAutomationsLink = ({ aiIndexId }: ManageAutomationsLinkProps) => {
  const { createContextEngineUrl, navigateToContextEngine } = useNavigation();
  const settingsPath = getAiIndexSettingsPath(aiIndexId);
  const { href, onClick } = getRouterLinkProps({
    href: createContextEngineUrl(settingsPath),
    onClick: () => navigateToContextEngine(settingsPath),
  });

  return (
    <EuiLink
      href={href}
      onClick={onClick}
      data-test-subj="contextAutomationsManageInSettingsLink"
      {...getEbtProps({
        element: CONTEXT_ENGINE_UI_EBT.element.aiIndexDetailPageAutomationsPanel,
        action: CONTEXT_ENGINE_UI_EBT.action.automations.MANAGE_IN_SETTINGS,
      })}
    >
      <FormattedMessage
        id="xpack.contextEngine.aiIndexDetail.automations.manageInSettingsLink"
        defaultMessage="Manage in Settings"
      />
    </EuiLink>
  );
};
