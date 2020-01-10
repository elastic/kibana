/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useEffect } from 'react';
import { Redirect, Route, Switch, RouteComponentProps } from 'react-router-dom';

import { useSignalIndex } from '../../containers/detection_engine/signals/use_signal_index';
import { usePrivilegeUser } from '../../containers/detection_engine/signals/use_privilege_user';

import { CreateRuleComponent } from './rules/create';
import { DetectionEngine } from './detection_engine';
import { EditRuleComponent } from './rules/edit';
import { RuleDetails } from './rules/details';
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
        <DetectionEngine
          loading={indexNameLoading || privilegeLoading}
          isSignalIndexExists={isSignalIndexExists}
          isUserAuthenticated={isAuthenticated}
          signalsIndex={signalIndexName}
        />
      </Route>
      {isSignalIndexExists && isAuthenticated && (
        <>
          <Route exact path={`${detectionEnginePath}/rules`}>
            <RulesComponent />
          </Route>
          <Route exact path={`${detectionEnginePath}/rules/create`}>
            <CreateRuleComponent />
          </Route>
          <Route exact path={`${detectionEnginePath}/rules/id/:ruleId`}>
            <RuleDetails signalsIndex={signalIndexName} />
          </Route>
          <Route exact path={`${detectionEnginePath}/rules/id/:ruleId/edit`}>
            <EditRuleComponent />
          </Route>
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
