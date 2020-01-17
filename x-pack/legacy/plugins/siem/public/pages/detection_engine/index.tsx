/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { Redirect, Route, Switch, RouteComponentProps } from 'react-router-dom';

import { ManageUserInfo } from './components/user_info';
import { CreateRuleComponent } from './rules/create';
import { DetectionEngine } from './detection_engine';
import { EditRuleComponent } from './rules/edit';
import { RuleDetails } from './rules/details';
import { RulesComponent } from './rules';
import { DetectionEngineTab } from './types';

const detectionEnginePath = `/:pageName(detection-engine)`;

type Props = Partial<RouteComponentProps<{}>> & { url: string };

export const DetectionEngineContainer = React.memo<Props>(() => (
  <ManageUserInfo>
    <Switch>
      <Route
        exact
        path={`${detectionEnginePath}/:tabName(${DetectionEngineTab.signals}|${DetectionEngineTab.alerts})`}
        strict
      >
        <DetectionEngine />
      </Route>
      <Route exact path={`${detectionEnginePath}/rules`}>
        <RulesComponent />
      </Route>
      <Route exact path={`${detectionEnginePath}/rules/create`}>
        <CreateRuleComponent />
      </Route>
      <Route exact path={`${detectionEnginePath}/rules/id/:ruleId/`}>
        <RuleDetails />
      </Route>
      <Route exact path={`${detectionEnginePath}/rules/id/:ruleId/edit`}>
        <EditRuleComponent />
      </Route>
      <Route
        path="/detection-engine/"
        render={({ location: { search = '' } }) => (
          <Redirect
            from="/detection-engine/"
            to={`/detection-engine/${DetectionEngineTab.signals}${search}`}
          />
        )}
      />
    </Switch>
  </ManageUserInfo>
));
DetectionEngineContainer.displayName = 'DetectionEngineContainer';
