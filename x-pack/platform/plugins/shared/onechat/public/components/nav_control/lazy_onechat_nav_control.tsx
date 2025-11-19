/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { dynamic } from '@kbn/shared-ux-utility';
import React from 'react';
import type { CoreStart } from '@kbn/core-lifecycle-browser';
import type { OnechatStartDependencies } from '../../types';
import type { OnechatPluginStart } from '../../types';

const LazyOnechatNavControlWithProvider = dynamic(() =>
  import('./onechat_nav_control_with_provider').then((m) => ({
    default: m.OnechatNavControlWithProvider,
  }))
);

interface OnechatNavControlInitiatorProps {
  coreStart: CoreStart;
  pluginsStart: OnechatStartDependencies;
  onechatService: OnechatPluginStart;
}

export const OnechatNavControlInitiator = ({
  coreStart,
  pluginsStart,
  onechatService,
}: OnechatNavControlInitiatorProps) => {
  return (
    <LazyOnechatNavControlWithProvider
      coreStart={coreStart}
      pluginsStart={pluginsStart}
      onechatService={onechatService}
    />
  );
};
