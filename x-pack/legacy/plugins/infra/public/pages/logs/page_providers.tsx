/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { SourceConfigurationFlyoutState } from '../../components/source_configuration';
import { LogFlyout } from '../../containers/logs/log_flyout';
import { LogViewConfiguration } from '../../containers/logs/log_view_configuration';
import { LogHighlightsState } from '../../containers/logs/log_highlights/log_highlights';
import { Source, useSource } from '../../containers/source';
import { useSourceId } from '../../containers/source_id';

export const LogsPageProviders: React.FunctionComponent = ({ children }) => {
  const [sourceId] = useSourceId();
  const source = useSource({ sourceId });

  return (
    <Source.Context.Provider value={source}>
      <SourceConfigurationFlyoutState.Provider>
        <LogViewConfiguration.Provider>
          <LogFlyout.Provider>
            <LogHighlightsState.Provider sourceId={sourceId} sourceVersion={source.version}>
              {children}
            </LogHighlightsState.Provider>
          </LogFlyout.Provider>
        </LogViewConfiguration.Provider>
      </SourceConfigurationFlyoutState.Provider>
    </Source.Context.Provider>
  );
};
