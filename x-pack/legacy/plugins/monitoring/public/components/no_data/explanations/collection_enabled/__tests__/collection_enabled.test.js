/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import sinon from 'sinon';
import { mountWithIntl } from '../../../../../../../../../test_utils/enzyme_helpers';
import { ExplainCollectionEnabled } from '../collection_enabled';
import { findTestSubject } from '@elastic/eui/lib/test';

const enabler = {};
let component;

describe('ExplainCollectionEnabled', () => {
  beforeEach(() => {
    enabler.enableCollectionEnabled = sinon.spy();
    const reason = {
      property: 'xpack.monitoring.collection.enabled',
      data: '-1',
      context: 'cluster',
    };
    component = <ExplainCollectionEnabled {...{ reason, enabler }} />;
  });

  test('should explain about xpack.monitoring.collection.enabled setting', () => {
    const rendered = mountWithIntl(component);
    expect(rendered).toMatchSnapshot();
  });

  test('should have a button that triggers ajax action', () => {
    const rendered = mountWithIntl(component);
    const actionButton = findTestSubject(rendered, 'enableCollectionEnabled');
    actionButton.simulate('click');
    expect(enabler.enableCollectionEnabled.calledOnce).toBe(true);
  });
});
