/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useContext, useMemo } from 'react';
import { Redirect, Route, Switch, RouteComponentProps } from 'react-router-dom';

import { MlCapabilitiesContext } from '../../components/ml/permissions/ml_capabilities_provider';
import { hasMlUserPermissions } from '../../components/ml/permissions/has_ml_user_permissions';

import { IPDetails } from './ip_details';
import { Network } from './network';
import { GlobalTime } from '../../containers/global_time';
import { SiemPageName } from '../home/types';
import { getNetworkRoutePath } from './navigation';
import { NetworkRouteType } from './navigation/types';

type Props = Partial<RouteComponentProps<{}>> & { url: string };

const networkPagePath = `/:pageName(${SiemPageName.network})`;
const ipDetailsPagePath = `${networkPagePath}/ip/:detailName`;

export const NetworkContainer = React.memo<Props>(() => {
  const capabilities = useContext(MlCapabilitiesContext);
  const capabilitiesFetched = capabilities.capabilitiesFetched;
  const userHasMlUserPermissions = useMemo(() => hasMlUserPermissions(capabilities), [
    capabilities,
  ]);
  const networkRoutePath = useMemo(
    () => getNetworkRoutePath(networkPagePath, capabilitiesFetched, userHasMlUserPermissions),
    [capabilitiesFetched, userHasMlUserPermissions]
  );

  return (
    <GlobalTime>
      {({ to, from, setQuery, deleteQuery, isInitializing }) => (
        <Switch>
          <Route
            strict
            path={networkRoutePath}
            render={() => (
              <Network
                networkPagePath={networkPagePath}
                to={to}
                from={from}
                setQuery={setQuery}
                deleteQuery={deleteQuery}
                isInitializing={isInitializing}
                capabilitiesFetched={capabilities.capabilitiesFetched}
                hasMlUserPermissions={userHasMlUserPermissions}
              />
            )}
          />
          <Route
            path={ipDetailsPagePath}
            render={({
              match: {
                params: { detailName },
              },
            }) => (
              <IPDetails
                detailName={detailName}
                to={to}
                from={from}
                setQuery={setQuery}
                deleteQuery={deleteQuery}
                isInitializing={isInitializing}
              />
            )}
          />
          <Route
            path={`/${SiemPageName.network}/`}
            render={({ location: { search = '' } }) => (
              <Redirect to={`/${SiemPageName.network}/${NetworkRouteType.flows}${search}`} />
            )}
          />
        </Switch>
      )}
    </GlobalTime>
  );
});

NetworkContainer.displayName = 'NetworkContainer';
