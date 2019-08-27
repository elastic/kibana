/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useContext } from 'react';

import { LogFlyout } from '../../../containers/logs/log_flyout';
import { LogViewConfiguration } from '../../../containers/logs/log_view_configuration';
import { LogHighlightsState } from '../../../containers/logs/log_highlights/log_highlights';
import { Source } from '../../../containers/source';

export const LogsPageProviders: React.FunctionComponent = ({ children }) => {
  const { sourceId, version } = useContext(Source.Context);

  return (
    <LogViewConfiguration.Provider>
      <LogFlyout.Provider>
        <LogHighlightsState.Provider sourceId={sourceId} sourceVersion={version}>
          {children}
        </LogHighlightsState.Provider>
      </LogFlyout.Provider>
    </LogViewConfiguration.Provider>
  );
};
