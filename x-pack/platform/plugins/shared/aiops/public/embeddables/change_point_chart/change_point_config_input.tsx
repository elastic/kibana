/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { CoreStart } from '@kbn/core/public';
import { AiopsAppContext } from '../../hooks/use_aiops_app_context';
import type { AiopsPluginStartDeps } from '../../types';
import { ChangePointChartInitializer } from './change_point_chart_initializer';
import type { ChangePointEmbeddableState } from '../../../common/embeddables/change_point_chart/types';

export function EmbeddableChangePointUserInput({
  coreStart,
  pluginStart,
  onConfirm,
  onCancel,
  input,
}: {
  coreStart: CoreStart;
  pluginStart: AiopsPluginStartDeps;
  onConfirm: (state: ChangePointEmbeddableState) => void;
  onCancel: () => void;
  input?: ChangePointEmbeddableState;
}) {
  return (
    <AiopsAppContext.Provider
      value={{
        embeddingOrigin: 'flyout',
        ...coreStart,
        ...pluginStart,
      }}
    >
      <ChangePointChartInitializer initialInput={input} onCreate={onConfirm} onCancel={onCancel} />
    </AiopsAppContext.Provider>
  );
}
