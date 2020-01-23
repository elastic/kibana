/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import * as React from 'react';
import uuid from 'uuid';
import { shallow } from 'enzyme';
import { AlertDetails } from './alert_details';
import { Alert } from '../../../../types';

describe('alert_details', () => {
  it('renders the alert ID', () => {
    const alert = {
      id: uuid.v4(),
    } as Alert;
    expect(shallow(<AlertDetails alert={alert} />).contains(<div>{alert.id}</div>)).toBeTruthy();
  });
});
