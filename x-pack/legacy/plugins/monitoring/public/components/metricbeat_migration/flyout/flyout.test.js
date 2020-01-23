/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { shallow } from 'enzyme';
import { Flyout } from './flyout';
import { INSTRUCTION_STEP_ENABLE_METRICBEAT } from '../constants';
import {
  ELASTICSEARCH_SYSTEM_ID,
  KIBANA_SYSTEM_ID,
  BEATS_SYSTEM_ID,
  APM_SYSTEM_ID,
  LOGSTASH_SYSTEM_ID,
} from '../../../../common/constants';

jest.mock('ui/documentation_links', () => ({
  ELASTIC_WEBSITE_URL: 'https://www.elastic.co/',
  DOC_LINK_VERSION: 'current',
}));

jest.mock('../../../../common', () => ({
  formatTimestampToDuration: () => `0 seconds`,
}));

const PRODUCTS = [
  {
    name: ELASTICSEARCH_SYSTEM_ID,
  },
  {
    name: KIBANA_SYSTEM_ID,
  },
  {
    name: LOGSTASH_SYSTEM_ID,
  },
  {
    name: BEATS_SYSTEM_ID,
  },
  {
    name: APM_SYSTEM_ID,
  },
];

describe('Flyout', () => {
  for (const { name } of PRODUCTS) {
    describe(`${name}`, () => {
      describe('part one', () => {
        it('should render normally', () => {
          const component = shallow(<Flyout onClose={() => {}} product={{}} productName={name} />);
          expect(component).toMatchSnapshot();
        });
      });

      describe('part two', () => {
        it('should show instructions to migrate to metricbeat', () => {
          const component = shallow(
            <Flyout
              onClose={() => {}}
              product={{
                isInternalCollector: true,
              }}
              productName={name}
            />
          );
          component.find('EuiButton').simulate('click');
          component.update();
          expect(component.find('EuiFlyoutBody')).toMatchSnapshot();
        });

        it('should show instructions to disable internal collection', () => {
          const component = shallow(
            <Flyout
              onClose={() => {}}
              product={{
                isPartiallyMigrated: true,
                lastInternallyCollectedTimestamp: 0,
              }}
              meta={{
                secondsAgo: 30,
              }}
              productName={name}
            />
          );
          component.find('EuiButton').simulate('click');
          component.update();
          expect(component.find('EuiFlyoutBody')).toMatchSnapshot();
        });
      });
    });
  }

  it('should render a consistent completion state for all products', () => {
    let template = null;
    for (const { name } of PRODUCTS) {
      const component = shallow(
        <Flyout
          onClose={() => {}}
          product={{
            isPartiallyMigrated: true,
          }}
          meta={{
            secondsAgo: 10,
          }}
          productName={name}
        />
      );
      component.setState({
        activeStep: INSTRUCTION_STEP_ENABLE_METRICBEAT,
      });
      component.update();
      const steps = component.find('EuiSteps').prop('steps');
      const step = steps[steps.length - 1];
      if (!template) {
        template = step;
        expect(template).toMatchSnapshot();
      } else {
        expect(template).toEqual(step);
      }
    }
  });

  it('should render the beat type for beats for the enabling metricbeat step', () => {
    const component = shallow(
      <Flyout
        onClose={() => {}}
        product={{
          isInternalCollector: true,
          beatType: 'filebeat',
        }}
        productName={BEATS_SYSTEM_ID}
      />
    );
    component.find('EuiButton').simulate('click');
    component.update();
    expect(component.find('EuiFlyoutBody')).toMatchSnapshot();
  });

  it('should render the beat type for beats for the disabling internal collection step', () => {
    const component = shallow(
      <Flyout
        onClose={() => {}}
        product={{
          isPartiallyMigrated: true,
          beatType: 'filebeat',
        }}
        meta={{
          secondsAgo: 30,
        }}
        productName={BEATS_SYSTEM_ID}
      />
    );
    component.find('EuiButton').simulate('click');
    component.update();
    expect(component.find('EuiFlyoutBody')).toMatchSnapshot();
  });

  it('should show a restart warning for restarting the primary Kibana', () => {
    const component = shallow(
      <Flyout
        onClose={() => {}}
        product={{
          isPartiallyMigrated: true,
          isPrimary: true,
        }}
        meta={{
          secondsAgo: 30,
        }}
        productName={KIBANA_SYSTEM_ID}
      />
    );
    component.find('EuiButton').simulate('click');
    component.update();
    expect(component.find('EuiFlyoutBody')).toMatchSnapshot();
  });
});
