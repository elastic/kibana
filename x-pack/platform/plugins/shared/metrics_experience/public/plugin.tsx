/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import ReactDOM from 'react-dom';
import { AppMountParameters, CoreSetup, CoreStart, Plugin } from '@kbn/core/public';
import { dynamic } from '@kbn/shared-ux-utility';

const MetricsExperienceApplication = dynamic(() =>
  import('./application').then((mod) => ({ default: mod.Application }))
);

export class MetricsExperiencePlugin implements Plugin {
  public setup(core: CoreSetup) {
    // Register app
    core.application.register({
      id: 'metricsExperience',
      title: 'Metrics Experience',
      async mount(appMountParameters: AppMountParameters) {
        const { element } = appMountParameters;
        const [coreStart] = await core.getStartServices();
        ReactDOM.render(
          coreStart.rendering.addContext(
            <MetricsExperienceApplication
              coreStart={coreStart}
              appMountParameters={appMountParameters}
            />
          ),
          element
        );
        return () => ReactDOM.unmountComponentAtNode(element);
      },
    });
  }

  public start(_core: CoreStart) {
    return {};
  }

  public stop() {}
}
