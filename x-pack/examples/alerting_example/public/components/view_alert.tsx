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
  EuiCodeBlock,
  EuiSpacer,
} from '@elastic/eui';
import { withRouter, RouteComponentProps } from 'react-router-dom';
import { CoreStart } from 'kibana/public';
import { isEmpty } from 'lodash';
import { ALERTING_EXAMPLE_APP_ID } from '../../common/constants';
import {
  BASE_ALERTING_API_PATH,
  INTERNAL_BASE_ALERTING_API_PATH,
} from '../../../../plugins/alerting/common';
import { Rule, RuleTaskState } from '../../common/types';

type Props = RouteComponentProps & {
  http: CoreStart['http'];
  id: string;
};

export const ViewAlertPage = withRouter(({ http, id }: Props) => {
  const [alert, setAlert] = useState<Rule | null>(null);
  const [alertState, setAlertState] = useState<RuleTaskState | null>(null);

  useEffect(() => {
    if (!alert) {
      http.get<Rule | null>(`${BASE_ALERTING_API_PATH}/rule/${id}`).then(setAlert);
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
          This is a generic view for all Rules created by the
          <EuiTextColor color="accent"> {ALERTING_EXAMPLE_APP_ID} </EuiTextColor>
          plugin.
        </p>
        <p>
          You are now viewing the <EuiTextColor color="accent">{`${alert.name}`} </EuiTextColor>
          Rule, whose ID is <EuiTextColor color="accent">{`${alert.id}`}</EuiTextColor>.
        </p>
        <p>
          Its RuleType is <EuiTextColor color="accent">{`${alert.rule_type_id}`}</EuiTextColor> and
          its scheduled to run at an interval of
          <EuiTextColor color="accent"> {`${alert.schedule.interval}`}</EuiTextColor>.
        </p>
      </EuiCallOut>
      <EuiSpacer size="l" />
      <EuiText>
        <h2>Alerts</h2>
      </EuiText>
      {isEmpty(alertState.alerts) ? (
        <EuiCallOut title="No Alerts!" color="warning" iconType="help">
          <p>This Rule doesn&apos;t have any active alerts at the moment.</p>
        </EuiCallOut>
      ) : (
        <Fragment>
          <EuiCallOut title="Active State" color="success" iconType="user">
            <p>
              Below are the active Alerts which were activated on the rules last run.
              <br />
              For each alert id you can see its current state in JSON format.
            </p>
          </EuiCallOut>
          <EuiSpacer size="l" />
          <EuiDescriptionList compressed>
            {Object.entries(alertState.alerts ?? {}).map(([instance, { state }]) => (
              <Fragment>
                <EuiDescriptionListTitle>{instance}</EuiDescriptionListTitle>
                <EuiDescriptionListDescription>
                  <EuiCodeBlock
                    language="json"
                    fontSize="m"
                    paddingSize="m"
                    color="dark"
                    overflowHeight={300}
                    isCopyable
                  >
                    {`${JSON.stringify(state)}`}
                  </EuiCodeBlock>
                </EuiDescriptionListDescription>
              </Fragment>
            ))}
          </EuiDescriptionList>
        </Fragment>
      )}
    </Fragment>
  ) : (
    <EuiLoadingLogo logo="logoKibana" size="xl" />
  );
});
