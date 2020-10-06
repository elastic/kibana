/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState, useEffect, Fragment } from 'react';

import {
  EuiText,
  EuiLoadingKibana,
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
import { Alert, AlertTaskState, BASE_ALERT_API_PATH } from '../../../../plugins/alerts/common';
import { ALERTING_EXAMPLE_APP_ID } from '../../common/constants';

type Props = RouteComponentProps & {
  http: CoreStart['http'];
  id: string;
};
export const ViewAlertPage = withRouter(({ http, id }: Props) => {
  const [alert, setAlert] = useState<Alert | null>(null);
  const [alertState, setAlertState] = useState<AlertTaskState | null>(null);

  useEffect(() => {
    if (!alert) {
      http.get(`${BASE_ALERT_API_PATH}/alert/${id}`).then(setAlert);
    }
    if (!alertState) {
      http.get(`${BASE_ALERT_API_PATH}/alert/${id}/state`).then(setAlertState);
    }
  }, [alert, alertState, http, id]);

  return alert && alertState ? (
    <Fragment>
      <EuiCallOut title={`Alert "${alert.name}"`} iconType="search">
        <p>
          This is a generic view for all Alerts created by the
          <EuiTextColor color="accent"> {ALERTING_EXAMPLE_APP_ID} </EuiTextColor>
          plugin.
        </p>
        <p>
          You are now viewing the <EuiTextColor color="accent">{`${alert.name}`} </EuiTextColor>
          Alert, whose ID is <EuiTextColor color="accent">{`${alert.id}`}</EuiTextColor>.
        </p>
        <p>
          Its AlertType is <EuiTextColor color="accent">{`${alert.alertTypeId}`}</EuiTextColor> and
          its scheduled to run at an interval of
          <EuiTextColor color="accent"> {`${alert.schedule.interval}`}</EuiTextColor>.
        </p>
      </EuiCallOut>
      <EuiSpacer size="l" />
      <EuiText>
        <h2>Alert Instances</h2>
      </EuiText>
      {isEmpty(alertState.alertInstances) ? (
        <EuiCallOut title="No Alert Instances!" color="warning" iconType="help">
          <p>This Alert doesn&apos;t have any active alert instances at the moment.</p>
        </EuiCallOut>
      ) : (
        <Fragment>
          <EuiCallOut title="Active State" color="success" iconType="user">
            <p>
              Bellow are the active Alert Instances which were activated on the alerts last run.
              <br />
              For each instance id you can see its current state in JSON format.
            </p>
          </EuiCallOut>
          <EuiSpacer size="l" />
          <EuiDescriptionList compressed>
            {Object.entries(alertState.alertInstances ?? {}).map(([instance, { state }]) => (
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
    <EuiLoadingKibana size="xl" />
  );
});
