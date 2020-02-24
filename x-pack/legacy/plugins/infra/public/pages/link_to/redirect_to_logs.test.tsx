/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createLocation } from 'history';
import React from 'react';
import { matchPath } from 'react-router-dom';
import { shallow } from 'enzyme';

import { RedirectToLogs } from './redirect_to_logs';

describe('RedirectToLogs component', () => {
  it('renders a redirect with the correct position', () => {
    const component = shallow(
      <RedirectToLogs {...createRouteComponentProps('/logs?time=1550671089404')} />
    );

    expect(component).toMatchInlineSnapshot(`
      <Redirect
        to="/logs/stream?logFilter=(expression:'',kind:kuery)&logPosition=(position:(tiebreaker:0,time:1550671089404),streamLive:!f)&sourceId=default"
      />
    `);
  });

  it('renders a redirect with the correct user-defined filter', () => {
    const component = shallow(
      <RedirectToLogs
        {...createRouteComponentProps('/logs?time=1550671089404&filter=FILTER_FIELD:FILTER_VALUE')}
      />
    );

    expect(component).toMatchInlineSnapshot(`
      <Redirect
        to="/logs/stream?logFilter=(expression:'FILTER_FIELD:FILTER_VALUE',kind:kuery)&logPosition=(position:(tiebreaker:0,time:1550671089404),streamLive:!f)&sourceId=default"
      />
    `);
  });

  it('renders a redirect with the correct custom source id', () => {
    const component = shallow(
      <RedirectToLogs {...createRouteComponentProps('/SOME-OTHER-SOURCE/logs')} />
    );

    expect(component).toMatchInlineSnapshot(`
      <Redirect
        to="/logs/stream?logFilter=(expression:'',kind:kuery)&sourceId=SOME-OTHER-SOURCE"
      />
    `);
  });
});

const createRouteComponentProps = (path: string) => {
  const location = createLocation(path);
  return {
    match: matchPath(location.pathname, { path: '/:sourceId?/logs' }) as any,
    history: null as any,
    location,
  };
};
