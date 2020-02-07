/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import sinon from 'sinon';
import { mountWithIntl } from '../../../../../../../../../test_utils/enzyme_helpers';
import { ExplainCollectionInterval } from '../collection_interval';
import { findTestSubject } from '@elastic/eui/lib/test';

const enabler = {};
const reason = {
  property: 'xpack.monitoring.collection.interval',
  data: '-1',
  context: 'cluster',
};

describe('ExplainCollectionInterval', () => {
  beforeEach(() => {
    enabler.enableCollectionInterval = sinon.spy();
  });

  test('should explain about xpack.monitoring.collection.interval setting', () => {
    const component = (
      <ExplainCollectionInterval
        reason={reason}
        isCollectionIntervalUpdating={false}
        isCollectionIntervalUpdated={false}
        enabler={enabler}
      />
    );
    const rendered = mountWithIntl(component);
    expect(rendered).toMatchSnapshot();
  });

  test('should have a button that triggers ajax action', () => {
    const component = (
      <ExplainCollectionInterval
        reason={reason}
        isCollectionIntervalUpdating={false}
        isCollectionIntervalUpdated={false}
        enabler={enabler}
      />
    );
    const rendered = mountWithIntl(component);
    const actionButton = findTestSubject(rendered, 'enableCollectionInterval');
    actionButton.simulate('click');
    expect(enabler.enableCollectionInterval.calledOnce).toBe(true);
  });

  describe('collection interval setting updates', () => {
    test('should show a waiting indicator while updating = true', () => {
      const component = (
        <ExplainCollectionInterval
          reason={reason}
          isCollectionIntervalUpdating={true}
          isCollectionIntervalUpdated={false}
          enabler={enabler}
        />
      );
      const rendered = mountWithIntl(component);
      expect(rendered).toMatchSnapshot();
    });

    test('should show a success message while updated = true', () => {
      const component = (
        <ExplainCollectionInterval
          reason={reason}
          isCollectionIntervalUpdating={false}
          isCollectionIntervalUpdated={true}
          enabler={enabler}
        />
      );
      const rendered = mountWithIntl(component);
      expect(rendered).toMatchSnapshot();
    });
  });
});
