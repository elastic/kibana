/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { shallow } from 'enzyme';
import { Reason } from './reason';

jest.mock('ui/documentation_links', () => ({
  ELASTIC_WEBSITE_URL: 'https://www.elastic.co/',
  DOC_LINK_VERSION: 'current',
}));

describe('Logs', () => {
  it('should render a default message', () => {
    const component = shallow(<Reason reason={{}} />);
    expect(component).toMatchSnapshot();
  });

  it('should render with a no index pattern found reason', () => {
    const component = shallow(<Reason reason={{ indexPatternExists: false }} />);
    expect(component).toMatchSnapshot();
  });

  it('should render with a no type found reason', () => {
    const component = shallow(<Reason reason={{ indexPatternExists: true, typeExists: false }} />);
    expect(component).toMatchSnapshot();
  });

  it('should render with a no structured logs reason', () => {
    const component = shallow(
      <Reason reason={{ indexPatternExists: true, typeExists: true, usingStructuredLogs: false }} />
    );
    expect(component).toMatchSnapshot();
  });

  it('should render with a no cluster found reason', () => {
    const component = shallow(
      <Reason reason={{ indexPatternExists: true, typeExists: true, clusterExists: false }} />
    );
    expect(component).toMatchSnapshot();
  });

  it('should render with a no node found reason', () => {
    const component = shallow(
      <Reason
        reason={{
          indexPatternExists: true,
          typeExists: true,
          clusterExists: true,
          nodeExists: false,
        }}
      />
    );
    expect(component).toMatchSnapshot();
  });

  it('should render with a time period reason', () => {
    const reason = {
      indexPatternExists: true,
      indexPatternInTimeRangeExists: false,
    };
    const component = shallow(<Reason reason={reason} />);
    expect(component).toMatchSnapshot();
  });

  it('should render with a time period reason for both scenarios', () => {
    const reason = {
      indexPatternExists: true,
      indexPatternInTimeRangeExists: true,
      clusterExists: true,
      typeExists: false,
      typeExistsAtAnyTime: true,
    };
    const component = shallow(<Reason reason={reason} />);
    expect(component).toMatchSnapshot();
  });

  it('should render with a no index found reason', () => {
    const component = shallow(
      <Reason
        reason={{
          indexPatternExists: true,
          typeExists: true,
          clusterExists: true,
          nodeExists: null,
          indexExists: false,
        }}
      />
    );
    expect(component).toMatchSnapshot();
  });

  it('should render with a bad indices reason', () => {
    const component = shallow(
      <Reason
        reason={{
          correctIndexName: false,
        }}
      />
    );
    expect(component).toMatchSnapshot();
  });
});
