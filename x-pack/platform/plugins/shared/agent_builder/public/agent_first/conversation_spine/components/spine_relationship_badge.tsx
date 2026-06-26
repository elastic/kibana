/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBadge, useEuiTheme } from '@elastic/eui';
import React from 'react';
import { useIsAgentWorkspaceMount } from '../../../application/hooks/use_navigation';
import { useOptionalConversationSpineContext } from '../conversation_spine_context';
import { formatSpineDisplayLabel } from '../hooks/use_spine_display_label';
import { getSpineTypeConfig } from '../spine_type_config';
import type { SpineType } from '../types';

export interface SpineRelationshipBadgeProps {
  type: SpineType;
  identifier: string;
}

export const SpineRelationshipBadge: React.FC<SpineRelationshipBadgeProps> = ({ type, identifier }) => {
  const { euiTheme } = useEuiTheme();
  const label = formatSpineDisplayLabel(type, identifier);
  const { iconType, getBadgeStyles } = getSpineTypeConfig(type);

  return (
    <EuiBadge
      iconType={iconType}
      css={getBadgeStyles(euiTheme)}
      color="subdued"
      aria-label={label}
      data-test-subj="agentBuilderConversationSpineRelationshipBadge"
    >
      {label}
    </EuiBadge>
  );
};

export const ActiveSpineRelationshipBadge: React.FC = () => {
  const isAgentWorkspaceMount = useIsAgentWorkspaceMount();
  const spineContext = useOptionalConversationSpineContext();

  if (!isAgentWorkspaceMount || !spineContext?.isSpineActive || !spineContext.spineState) {
    return null;
  }

  const { type, identifier } = spineContext.spineState.record;

  return <SpineRelationshipBadge type={type} identifier={identifier} />;
};
