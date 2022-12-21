/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useEffect, Fragment } from 'react';

import {
  EuiText,
  EuiLoadingLogo,
  EuiCallOut,
  EuiTextColor,
  EuiDescriptionList,
  EuiDescriptionListTitle,
  EuiDescriptionListDescription,
  EuiSpacer,
  EuiFlexGroup,
  EuiFlexItem,
  EuiStat,
} from '@elastic/eui';
import { withRouter, RouteComponentProps } from 'react-router-dom';
import { CoreStart } from '@kbn/core/public';
import { isEmpty } from 'lodash';
import {
  BASE_ALERTING_API_PATH,
  INTERNAL_BASE_ALERTING_API_PATH,
} from '@kbn/alerting-plugin/common';
import { ALERTING_EXAMPLE_APP_ID, AlwaysFiringParams } from '../../common/constants';
import { Rule, RuleTaskState } from '../../common/types';

type Props = RouteComponentProps & {
  http: CoreStart['http'];
  id: string;
};

function hasCraft(state: any): state is { craft: string } {
  return state && state.craft;
}
export const ViewPeopleInSpaceAlertPage = withRouter(({ http, id }: Props) => {
  const [alert, setAlert] = useState<Rule<AlwaysFiringParams> | null>(null);
  const [alertState, setAlertState] = useState<RuleTaskState | null>(null);

  useEffect(() => {
    if (!alert) {
      http
        .get<Rule<AlwaysFiringParams> | null>(`${BASE_ALERTING_API_PATH}/rule/${id}`)
        .then(setAlert);
    }
    if (!alertState) {
      http
        .get<RuleTaskState | null>(`${INTERNAL_BASE_ALERTING_API_PATH}/rule/${id}/state`)
        .then(setAlertState);
    }
  }, [alert, alertState, http, id]);

  return alert && alertState ? (
    <Fragment>
      <EuiCallOut title={`Rule "${alert.name}"`} iconType="search">
        <p>
          This is a specific view for all
          <EuiTextColor color="accent"> example.people-in-space </EuiTextColor> Rules created by the
          <EuiTextColor color="accent"> {ALERTING_EXAMPLE_APP_ID} </EuiTextColor>
          plugin.
        </p>
      </EuiCallOut>
      <EuiSpacer size="l" />
      <EuiText>
        <h2>Alerts</h2>
      </EuiText>
      {isEmpty(alertState.alerts) ? (
        <EuiCallOut title="No Alerts!" color="warning" iconType="help">
          <p>
            The people in {alert.params.craft} at the moment <b>are not</b> {alert.params.op}{' '}
            {alert.params.outerSpaceCapacity}
          </p>
        </EuiCallOut>
      ) : (
        <Fragment>
          <EuiCallOut title="Active State" color="success" iconType="user">
            <p>
              The rule has been triggered because the people in {alert.params.craft} at the moment{' '}
              {alert.params.op} {alert.params.outerSpaceCapacity}
            </p>
          </EuiCallOut>
          <EuiSpacer size="l" />
          <div>
            <EuiFlexGroup>
              <EuiFlexItem grow={false}>
                <EuiStat
                  title={Object.keys(alertState.alerts ?? {}).length}
                  description={`People in ${alert.params.craft}`}
                  titleColor="primary"
                />
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiDescriptionList compressed>
                  {Object.entries(alertState.alerts ?? {}).map(([instance, { state }], index) => (
                    <Fragment key={index}>
                      <EuiDescriptionListTitle>{instance}</EuiDescriptionListTitle>
                      <EuiDescriptionListDescription>
                        {hasCraft(state) ? state.craft : 'Unknown Craft'}
                      </EuiDescriptionListDescription>
                    </Fragment>
                  ))}
                </EuiDescriptionList>
              </EuiFlexItem>
            </EuiFlexGroup>
          </div>
        </Fragment>
      )}
    </Fragment>
  ) : (
    <EuiLoadingLogo logo="logoKibana" size="xl" />
  );
});
