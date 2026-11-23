/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { CoreStart } from '@kbn/core/public';
import type { ChangePointGridFormConfiguration } from '@kbn/discover-utils';
import type { TimeRange } from '@kbn/es-query';
import { AiopsAppContext } from '../../hooks/use_aiops_app_context';
import type { AiopsPluginStartDeps } from '../../types';
import type { ChangePointEsqlFormSubmission } from './build_change_point_panel_state';
import { ChangePointEsqlInitializer } from './change_point_esql_initializer';

export interface EmbeddableChangePointEsqlUserInputProps {
  readonly coreStart: CoreStart;
  readonly pluginStart: AiopsPluginStartDeps;
  readonly dashboardParentApi: unknown;
  readonly showTableOption?: boolean;
  readonly isEditing?: boolean;
  readonly initialMode?: 'form' | 'esql';
  readonly initialFormConfiguration?: ChangePointGridFormConfiguration;
  readonly initialEsql?: string;
  readonly previewTimeRange?: TimeRange;
  readonly onConfirm: (submission: ChangePointEsqlFormSubmission) => void;
  readonly onCancel: () => void;
}

export const EmbeddableChangePointEsqlUserInput = ({
  coreStart,
  pluginStart,
  dashboardParentApi,
  showTableOption,
  isEditing,
  initialMode,
  initialFormConfiguration,
  initialEsql,
  previewTimeRange,
  onConfirm,
  onCancel,
}: EmbeddableChangePointEsqlUserInputProps) => {
  return (
    <AiopsAppContext.Provider
      value={{
        embeddingOrigin: 'flyout',
        ...coreStart,
        ...pluginStart,
      }}
    >
      <ChangePointEsqlInitializer
        dashboardParentApi={dashboardParentApi}
        showTableOption={showTableOption}
        isEditing={isEditing}
        initialMode={initialMode}
        initialFormConfiguration={initialFormConfiguration}
        initialEsql={initialEsql}
        previewTimeRange={previewTimeRange}
        onConfirm={onConfirm}
        onCancel={onCancel}
      />
    </AiopsAppContext.Provider>
  );
};
