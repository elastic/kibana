/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { Redirect, Route, Switch, RouteComponentProps } from 'react-router-dom';

import { CreateRuleComponent } from './create_rule';
import { DetectionEngineComponent } from './detection_engine';
import { EditRuleComponent } from './edit_rule';
import { RuleDetailsComponent } from './rule_details';
import { RulesComponent } from './rules';

const detectionEnginePath = `/:pageName(detection-engine)`;

type Props = Partial<RouteComponentProps<{}>> & { url: string };

export const DetectionEngineContainer = React.memo<Props>(() => (
  <Switch>
    <Route exact path={detectionEnginePath} render={() => <DetectionEngineComponent />} strict />
    <Route exact path={`${detectionEnginePath}/rules`} render={() => <RulesComponent />} />
    <Route
      path={`${detectionEnginePath}/rules/create-rule`}
      render={() => <CreateRuleComponent />}
    />
    <Route
      exact
      path={`${detectionEnginePath}/rules/rule-details`}
      render={() => <RuleDetailsComponent />}
    />
    <Route
      path={`${detectionEnginePath}/rules/rule-details/edit-rule`}
      render={() => <EditRuleComponent />}
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
