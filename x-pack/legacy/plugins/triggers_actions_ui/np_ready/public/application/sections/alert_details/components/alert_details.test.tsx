/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import * as React from 'react';
import uuid from 'uuid';
import { shallow } from 'enzyme';
import { AlertDetails } from './alert_details';
import { Alert, AlertType, ActionType } from '../../../../types';
import { EuiTitle, EuiBadge, EuiFlexItem } from '@elastic/eui';

describe('alert_details', () => {
  it('renders the alert name as a title', () => {
    const alert = mockAlert();
    const alertType = {
      id: '.noop',
      name: 'No Op',
    };

    expect(
      shallow(<AlertDetails alert={alert} alertType={alertType} actionTypes={[]} />).contains(
        <EuiTitle size="m">
          <h1>{alert.name}</h1>
        </EuiTitle>
      )
    ).toBeTruthy();
  });

  it('renders the alert type badge', () => {
    const alert = mockAlert();
    const alertType = {
      id: '.noop',
      name: 'No Op',
    };

    expect(
      shallow(<AlertDetails alert={alert} alertType={alertType} actionTypes={[]} />).contains(
        <EuiBadge>{alertType.name}</EuiBadge>
      )
    ).toBeTruthy();
  });

  describe('actions', () => {
    it('renders an alert action', () => {
      const alert = mockAlert({
        actions: [
          {
            group: 'default',
            id: uuid.v4(),
            params: {},
            actionTypeId: '.server-log',
          },
        ],
      });

      const alertType = {
        id: '.noop',
        name: 'No Op',
      };

      const actionTypes: ActionType[] = [
        {
          id: '.server-log',
          name: 'Server log',
        },
      ];

      expect(
        shallow(
          <AlertDetails alert={alert} alertType={alertType} actionTypes={actionTypes} />
        ).contains(
          <EuiFlexItem key={alert.actions[0].id}>
            <EuiBadge color="hollow">{actionTypes[0].name}</EuiBadge>
          </EuiFlexItem>
        )
      ).toBeTruthy();
    });

    it('renders a counter for multiple alert action', () => {
      const alert = mockAlert({
        actions: [
          {
            group: 'default',
            id: uuid.v4(),
            params: {},
            actionTypeId: '.server-log',
          },
          {
            group: 'default',
            id: uuid.v4(),
            params: {},
            actionTypeId: '.email',
          },
        ],
      });
      const alertType = {
        id: '.noop',
        name: 'No Op',
      };
      const actionTypes: ActionType[] = [
        {
          id: '.server-log',
          name: 'Server log',
        },
        {
          id: '.email',
          name: 'Send email',
        },
      ];

      const details = shallow(
        <AlertDetails alert={alert} alertType={alertType} actionTypes={actionTypes} />
      );

      expect(
        details.contains(
          <EuiFlexItem key={alert.actions[0].id}>
            <EuiBadge color="hollow">{actionTypes[0].name}</EuiBadge>
          </EuiFlexItem>
        )
      ).toBeTruthy();

      expect(
        details.contains(
          <EuiFlexItem key={alert.actions[1].id}>
            <EuiBadge color="hollow">{actionTypes[1].name}</EuiBadge>
          </EuiFlexItem>
        )
      ).toBeTruthy();
    });
  });
});

function mockAlert(overloads: Partial<Alert> = {}): Alert {
  return {
    id: uuid.v4(),
    enabled: true,
    name: `alert-${uuid.v4()}`,
    tags: [],
    alertTypeId: '.noop',
    consumer: 'consumer',
    schedule: { interval: '1m' },
    actions: [],
    params: {},
    createdBy: null,
    updatedBy: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    apiKey: null,
    apiKeyOwner: null,
    throttle: null,
    muteAll: false,
    mutedInstanceIds: [],
    ...overloads,
  };
}
