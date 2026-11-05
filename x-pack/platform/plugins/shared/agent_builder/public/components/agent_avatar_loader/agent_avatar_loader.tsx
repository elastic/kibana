/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { MotionLoader } from '@kbn/custom-content-renderer';

type AgentAvatarLoaderProps = Omit<React.ComponentProps<typeof MotionLoader>, 'scenario'>;

/** Loader shown in place of the agent avatar while a response is in progress. */
export const AgentAvatarLoader: React.FC<AgentAvatarLoaderProps> = (props) => (
  <MotionLoader scenario="agentAvatar" {...props} />
);
