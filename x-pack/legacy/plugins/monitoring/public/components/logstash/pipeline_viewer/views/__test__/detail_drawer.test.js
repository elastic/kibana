/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { DetailDrawer } from '../detail_drawer';
import { shallow } from 'enzyme';

describe('DetailDrawer component', () => {
  let onHide;
  let timeseriesTooltipXValueFormatter;

  beforeEach(() => {
    onHide = jest.fn();
    timeseriesTooltipXValueFormatter = jest.fn();
  });

  test('shows vertex title', () => {
    const vertex = {
      title: 'grok',
    };

    const component = <DetailDrawer vertex={vertex} onHide={onHide} />;
    const renderedComponent = shallow(component);
    expect(renderedComponent).toMatchSnapshot();
  });

  describe('Plugin vertices', () => {
    describe('Plugin has explicit ID', () => {
      test('shows basic info and stats for plugin, including explicit ID', () => {
        const vertex = {
          title: 'grok',
          typeString: 'plugin',
          pluginType: 'filter',
          hasExplicitId: true,
          id: 'parse_apache_logline',
          stats: {
            events_in: {
              data: [
                [1516131120000, 200],
                [1516131180000, 203],
              ],
              timeRange: {
                min: 1516131138639,
                max: 1516135440463,
              },
            },
            events_out: {
              data: [
                [1516131120000, 199],
                [1516131180000, 200],
              ],
              timeRange: {
                min: 1516131138639,
                max: 1516135440463,
              },
            },
            millis_per_event: {
              data: [
                [1516131120000, 0.21],
                [1516131180000, 0.23],
              ],
              timeRange: {
                min: 1516131138639,
                max: 1516135440463,
              },
            },
          },
          eventsPerSecond: {
            data: [
              [1516131120000, 32],
              [1516131180000, 36],
            ],
            timeRange: {
              min: 1516131138639,
              max: 1516135440463,
            },
          },
        };

        const component = (
          <DetailDrawer
            vertex={vertex}
            onHide={onHide}
            timeseriesTooltipXValueFormatter={timeseriesTooltipXValueFormatter}
          />
        );
        const renderedComponent = shallow(component);
        expect(renderedComponent).toMatchSnapshot();
      });
    });

    describe('Plugin does not have explicit ID', () => {
      test('shows basic info and stats for plugin, suggesting that user set explicit ID', () => {
        const vertex = {
          title: 'grok',
          typeString: 'plugin',
          pluginType: 'filter',
          hasExplicitId: false,
          id: 'foobarbazqux',
          stats: {
            events_in: {
              data: [
                [1516131120000, 200],
                [1516131180000, 203],
              ],
              timeRange: {
                min: 1516131138639,
                max: 1516135440463,
              },
            },
            events_out: {
              data: [
                [1516131120000, 199],
                [1516131180000, 200],
              ],
              timeRange: {
                min: 1516131138639,
                max: 1516135440463,
              },
            },
            millis_per_event: {
              data: [
                [1516131120000, 0.21],
                [1516131180000, 0.23],
              ],
              timeRange: {
                min: 1516131138639,
                max: 1516135440463,
              },
            },
          },
          eventsPerSecond: {
            data: [
              [1516131120000, 32],
              [1516131180000, 36],
            ],
            timeRange: {
              min: 1516131138639,
              max: 1516135440463,
            },
          },
        };

        const component = (
          <DetailDrawer
            vertex={vertex}
            onHide={onHide}
            timeseriesTooltipXValueFormatter={timeseriesTooltipXValueFormatter}
          />
        );
        const renderedComponent = shallow(component);
        expect(renderedComponent).toMatchSnapshot();
      });
    });
  });

  describe('If vertices', () => {
    test('shows basic info and no stats for if', () => {
      const vertex = {
        title: 'if',
        typeString: 'if',
        subtitle: '[type] == "apache_log"',
      };

      const component = (
        <DetailDrawer
          vertex={vertex}
          onHide={onHide}
          timeseriesTooltipXValueFormatter={timeseriesTooltipXValueFormatter}
        />
      );
      const renderedComponent = shallow(component);
      expect(renderedComponent).toMatchSnapshot();
    });
  });

  describe('Queue vertices', () => {
    test('shows basic info and no stats for queue', () => {
      const vertex = {
        title: 'queue',
        typeString: 'queue',
      };

      const component = (
        <DetailDrawer
          vertex={vertex}
          onHide={onHide}
          timeseriesTooltipXValueFormatter={timeseriesTooltipXValueFormatter}
        />
      );
      const renderedComponent = shallow(component);
      expect(renderedComponent).toMatchSnapshot();
    });
  });
});
