/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonEmpty, useEuiTheme } from '@elastic/eui';
import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { AGENT_BUILDER_UI_EBT } from '@kbn/agent-builder-common';
import { getEbtProps } from '@kbn/ebt-click';
import type { PromptLayoutVariant } from '../../common/prompt/layout';
import { useAgentBuilderServices } from '../../../hooks/use_agent_builder_service';
import { useAssetBasePath } from '../../../hooks/use_asset_base_path';
import { ErrorPrompt } from '../../common/prompt/error_prompt';

export interface NoPrivilegePromptProps {
  variant?: PromptLayoutVariant;
}

export const NoPrivilegePrompt: React.FC<NoPrivilegePromptProps> = ({ variant }) => {
  const { colorMode } = useEuiTheme();
  const assetBasePath = useAssetBasePath();
  const { docLinksService } = useAgentBuilderServices();

  const learnMoreButton = (
    <EuiButtonEmpty
      href={docLinksService.agentBuilder}
      target="_blank"
      iconType="external"
      iconSide="right"
      {...getEbtProps({
        element: AGENT_BUILDER_UI_EBT.element.pageContent,
        action: AGENT_BUILDER_UI_EBT.action.access.LEARN_MORE_DOCS,
        detail: AGENT_BUILDER_UI_EBT.entity.AGENT,
      })}
    >
      <FormattedMessage
        id="xpack.agentBuilder.access.prompt.noPrivilege.actions.docsLink"
        defaultMessage="Learn more"
      />
    </EuiButtonEmpty>
  );

  return (
    <ErrorPrompt
      variant={variant}
      errorType="MISSING_PRIVILEGES"
      imageSrc={
        colorMode === 'LIGHT' ? `${assetBasePath}/lock_light.svg` : `${assetBasePath}/lock_dark.svg`
      }
      primaryButton={learnMoreButton}
    />
  );
};
