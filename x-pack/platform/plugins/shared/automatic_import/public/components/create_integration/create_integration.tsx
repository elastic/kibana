/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { Redirect } from 'react-router-dom';
import { Route, Routes } from '@kbn/shared-ux-router';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import type { Services } from '../../services';
import { TelemetryContextProvider } from './telemetry';
import { CreateIntegrationLanding } from './create_integration_landing';
import { CreateIntegrationUpload } from './create_integration_upload';
import { Page, PagePath } from '../../common/constants';
import { useRoutesAuthorization } from '../../common/hooks/use_authorization';
import { useIsAvailable } from '../../common/hooks/use_availability';
import { CreateAutomaticImport } from './create_automatic_import';

interface CreateIntegrationProps {
  services: Services;
}
export const CreateIntegration = React.memo<CreateIntegrationProps>(({ services }) => (
  <KibanaContextProvider services={services}>
    <TelemetryContextProvider>
      <CreateIntegrationRouter />
    </TelemetryContextProvider>
  </KibanaContextProvider>
));
CreateIntegration.displayName = 'CreateIntegration';

const CreateIntegrationRouter = React.memo(() => {
  const { canUseAutomaticImport, canUseIntegrationUpload } = useRoutesAuthorization();
  const isAvailable = useIsAvailable();
  return (
    <Routes>
      {isAvailable && canUseAutomaticImport && (
        <Route path={PagePath[Page.assistant]} exact component={CreateAutomaticImport} />
      )}
      {isAvailable && canUseIntegrationUpload && (
        <Route path={PagePath[Page.upload]} exact component={CreateIntegrationUpload} />
      )}

      <Route path={PagePath[Page.landing]} exact component={CreateIntegrationLanding} />

      <Route render={() => <Redirect to={PagePath[Page.landing]} />} />
    </Routes>
  );
});
CreateIntegrationRouter.displayName = 'CreateIntegrationRouter';
