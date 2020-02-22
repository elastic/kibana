/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { Redirect, Route, Switch, RouteComponentProps } from 'react-router-dom';

import { ManageUserInfo } from './components/user_info';
import { CreateRulePage } from './rules/create';
import { DetectionEnginePage } from './detection_engine';
import { EditRulePage } from './rules/edit';
import { RuleDetailsPage } from './rules/details';
import { RulesPage } from './rules';
import { DetectionEngineTab } from './types';

const detectionEnginePath = `/:pageName(detections)`;

type Props = Partial<RouteComponentProps<{}>> & { url: string };

const DetectionEngineContainerComponent: React.FC<Props> = () => (
  <ManageUserInfo>
    <Switch>
      <Route
        exact
        path={`${detectionEnginePath}/:tabName(${DetectionEngineTab.signals}|${DetectionEngineTab.alerts})`}
        strict
      >
        <DetectionEnginePage />
      </Route>
      <Route exact path={`${detectionEnginePath}/rules`}>
        <RulesPage />
      </Route>
      <Route exact path={`${detectionEnginePath}/rules/create`}>
        <CreateRulePage />
      </Route>
      <Route exact path={`${detectionEnginePath}/rules/id/:detailName`}>
        <RuleDetailsPage />
      </Route>
      <Route exact path={`${detectionEnginePath}/rules/id/:detailName/edit`}>
        <EditRulePage />
      </Route>
      <Route
        path="/detections/"
        render={({ location: { search = '' } }) => (
          <Redirect from="/detections/" to={`/detections/${DetectionEngineTab.signals}${search}`} />
        )}
      />
    </Switch>
  </ManageUserInfo>
);

export const DetectionEngineContainer = React.memo(DetectionEngineContainerComponent);
