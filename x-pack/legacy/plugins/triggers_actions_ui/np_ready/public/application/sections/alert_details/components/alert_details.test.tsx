/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import * as React from 'react';
import uuid from 'uuid';
import { shallow } from 'enzyme';
import { AlertDetails } from './alert_details';

describe('alert_details', () => {
  it('renders the alert ID', () => {
    const alertId = uuid.v4();
    expect(shallow(<AlertDetails alertId={} />).contains(<div>{alertId}</div>)).to.equal(true);
  });
});
