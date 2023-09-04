/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import ReactDOM from 'react-dom';
import { AppMountParameters, CoreStart } from '@kbn/core/public';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { GenAiStreamingResponseExampleApp } from './gen_ai_streaming_response_example';
import { GenAiStreamingResponseExamplePublicStartDeps } from './plugin';

export const renderApp = (
  core: CoreStart,
  deps: GenAiStreamingResponseExamplePublicStartDeps,
  { element }: AppMountParameters
) => {
  const { http } = core;
  ReactDOM.render(
    <KibanaContextProvider services={{ ...core, ...deps }}>
      <GenAiStreamingResponseExampleApp http={http} triggersActionsUi={deps.triggersActionsUi} />
    </KibanaContextProvider>,
    element
  );

  return () => ReactDOM.unmountComponentAtNode(element);
};
