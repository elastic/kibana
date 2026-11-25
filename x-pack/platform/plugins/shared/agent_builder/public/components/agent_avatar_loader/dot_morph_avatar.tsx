/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { agentBuilderDefaultAgentId, type AgentDefinition } from '@kbn/agent-builder-common';
import { ElasticMorphLoader, GenericMorphLoader } from '@kbn/custom-content-renderer';
import { AgentAvatar } from '../../application/components/common/agent_avatar';

/** Other agents keep their own avatar, so the generic grid matches that mark. */
const AVATAR_SIZE = 16;
/** Dot grid while a response is generating, centered in the avatar slot. */
const ELASTIC_GRID_SIZE = 16;
/** Logo the grid gathers into. Matches the 24px avatar slot. */
const ELASTIC_LOGO_SIZE = 24;

interface DotMorphAvatarProps {
  agent?: AgentDefinition | null;
  /** `true` while a response is still generating. `false` gathers the dots into the avatar. */
  isLoading: boolean;
  /** Names the progress indicator while a response is generating. */
  label: string;
  /** Called once the dots have gathered into the avatar. */
  onSettled?: () => void;
}

/**
 * Dot morph for the chat avatar. The Elastic AI Agent keeps this loader as its avatar: a 16px
 * dot grid while a response generates, gathering into a 24px logo. Every other agent swaps its
 * own avatar for the grid and back.
 */
export const DotMorphAvatar: React.FC<DotMorphAvatarProps> = ({
  agent,
  isLoading,
  label,
  onSettled,
}) => {
  if (agent?.id === agentBuilderDefaultAgentId) {
    return (
      <ElasticMorphLoader
        isLoading={isLoading}
        label={label}
        onSettled={onSettled}
        loadingSize={ELASTIC_GRID_SIZE}
        size={ELASTIC_LOGO_SIZE}
      />
    );
  }

  return (
    <GenericMorphLoader
      isLoading={isLoading}
      label={label}
      onSettled={onSettled}
      size={AVATAR_SIZE}
      avatar={agent ? <AgentAvatar agent={agent} size="s" iconSize="l" /> : undefined}
    />
  );
};
