/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useEffect } from 'react';
import { Redirect, Route, Switch, RouteComponentProps } from 'react-router-dom';

import { useKibana } from '../../../../../../../src/plugins/kibana_react/public';

import { useSignalIndex } from '../../containers/detection_engine/signals/use_signal_index';
import { usePrivilegeUser } from '../../containers/detection_engine/signals/use_privilege_user';

import { CreateRuleComponent } from './rules/create';
import { DetectionEngineComponent } from './detection_engine';
import { EditRuleComponent } from './rules/edit';
import { RuleDetailsComponent } from './rules/details';
import { RulesComponent } from './rules';

const detectionEnginePath = `/:pageName(detection-engine)`;

type Props = Partial<RouteComponentProps<{}>> & { url: string };

export const DetectionEngineContainer = React.memo<Props>(() => {
  const [privilegeLoading, isAuthenticated, hasWrite] = usePrivilegeUser();
  const [
    indexNameLoading,
    isSignalIndexExists,
    signalIndexName,
    createSignalIndex,
  ] = useSignalIndex();
  const uiCapabilities = useKibana().services.application?.capabilities;
  const canUserCRUD = (uiCapabilities?.siem?.crud as boolean) ?? false;

  useEffect(() => {
    if (
      isAuthenticated &&
      hasWrite &&
      isSignalIndexExists != null &&
      !isSignalIndexExists &&
      createSignalIndex != null
    ) {
      createSignalIndex();
    }
  }, [createSignalIndex, isAuthenticated, isSignalIndexExists, hasWrite]);

  return (
    <Switch>
      <Route exact path={detectionEnginePath} strict>
        <DetectionEngineComponent
          canUserCRUD={canUserCRUD}
          loading={indexNameLoading || privilegeLoading}
          isSignalIndexExists={isSignalIndexExists}
          isUserAuthenticated={isAuthenticated}
          signalsIndex={signalIndexName}
        />
      </Route>
      {isSignalIndexExists && isAuthenticated && (
        <>
          <Route exact path={`${detectionEnginePath}/rules`}>
            <RulesComponent canUserCRUD={canUserCRUD} />
          </Route>
          {canUserCRUD && (
            <Route path={`${detectionEnginePath}/rules/create`}>
              <CreateRuleComponent />
            </Route>
          )}
          <Route exact path={`${detectionEnginePath}/rules/:ruleId`}>
            <RuleDetailsComponent signalsIndex={signalIndexName} canUserCRUD={canUserCRUD} />
          </Route>
          {canUserCRUD && (
            <Route path={`${detectionEnginePath}/rules/:ruleId/edit`}>
              <EditRuleComponent />
            </Route>
          )}
        </>
      )}

      <Route
        path="/detection-engine/"
        render={({ location: { search = '' } }) => (
          <Redirect from="/detection-engine/" to={`/detection-engine${search}`} />
        )}
      />
    </Switch>
  );
});
DetectionEngineContainer.displayName = 'DetectionEngineContainer';
