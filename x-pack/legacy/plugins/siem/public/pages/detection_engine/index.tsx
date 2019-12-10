/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { Redirect, Route, Switch, RouteComponentProps } from 'react-router-dom';

import { CreateRuleComponent } from './rules/create';
import { DetectionEngineComponent } from './detection_engine';
import { EditRuleComponent } from './rules/edit';
import { RuleDetailsComponent } from './rules/details';
import { RulesComponent } from './rules';

const detectionEnginePath = `/:pageName(detection-engine)`;

type Props = Partial<RouteComponentProps<{}>> & { url: string };

export const DetectionEngineContainer = React.memo<Props>(() => (
  <Switch>
    <Route exact path={detectionEnginePath} render={() => <DetectionEngineComponent />} strict />
    <Route exact path={`${detectionEnginePath}/rules`} render={() => <RulesComponent />} />
    <Route path={`${detectionEnginePath}/rules/create`} render={() => <CreateRuleComponent />} />
    <Route
      exact
      path={`${detectionEnginePath}/rules/:ruleId`}
      render={props => <RuleDetailsComponent ruleId={props.match.params.ruleId} />}
    />
    <Route
      path={`${detectionEnginePath}/rules/:ruleId/edit`}
      render={props => <EditRuleComponent ruleId={props.match.params.ruleId} />}
    />
    <Route
      path="/detection-engine/"
      render={({ location: { search = '' } }) => (
        <Redirect from="/detection-engine/" to={`/detection-engine${search}`} />
      )}
    />
  </Switch>
));
DetectionEngineContainer.displayName = 'DetectionEngineContainer';
