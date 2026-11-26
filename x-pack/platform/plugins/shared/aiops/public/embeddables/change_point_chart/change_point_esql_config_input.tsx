/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type FC } from 'react';
import type { CoreStart } from '@kbn/core/public';
import { AiopsAppContext } from '../../hooks/use_aiops_app_context';
import type { AiopsPluginStartDeps } from '../../types';
import {
  ChangePointEsqlInitializer,
  type ChangePointEsqlInitializerProps,
} from './change_point_esql_initializer';

export interface EmbeddableChangePointEsqlUserInputProps extends ChangePointEsqlInitializerProps {
  readonly coreStart: CoreStart;
  readonly pluginStart: AiopsPluginStartDeps;
}

export const EmbeddableChangePointEsqlUserInput: FC<EmbeddableChangePointEsqlUserInputProps> = ({
  coreStart,
  pluginStart,
  ...initializerProps
}) => {
  return (
    <AiopsAppContext.Provider
      value={{
        embeddingOrigin: 'flyout',
        ...coreStart,
        ...pluginStart,
      }}
    >
      <ChangePointEsqlInitializer {...initializerProps} />
    </AiopsAppContext.Provider>
  );
};
