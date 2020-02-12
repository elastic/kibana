/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { Route } from 'react-router-dom';
import { PageHeaderComponent } from '../page_header';
import { mountWithRouter, renderWithRouter, shallowWithRouter } from '../../lib';
import { MONITOR_ROUTE, OVERVIEW_ROUTE } from '../../../common/constants';
import { Ping } from '../../../common/graphql/types';
import { createMemoryHistory } from 'history';
import { ChromeBreadcrumb } from 'kibana/public';

describe('PageHeaderComponent', () => {
  const monitorStatus: Ping = {
    id: 'elastic-co',
    tcp: { rtt: { connect: { us: 174982 } } },
    http: {
      response: {
        body: {
          bytes: 2092041,
          hash: '5d970606a6be810ae5d37115c4807fdd07ba4c3e407924ee5297e172d2efb3dc',
        },
        status_code: 200,
      },
      rtt: {
        response_header: { us: 340175 },
        write_request: { us: 38 },
        validate: { us: 1797839 },
        content: { us: 1457663 },
        total: { us: 2030012 },
      },
    },
    monitor: {
      ip: '2a04:4e42:3::729',
      status: 'up',
      duration: { us: 2030035 },
      type: 'http',
      id: 'elastic-co',
      name: 'elastic',
      check_group: '2a017afa-4736-11ea-b3d0-acde48001122',
    },
    resolve: { ip: '2a04:4e42:3::729', rtt: { us: 2102 } },
    url: { port: 443, full: 'https://www.elastic.co', scheme: 'https', domain: 'www.elastic.co' },
    ecs: { version: '1.4.0' },
    tls: {
      certificate_not_valid_after: '2020-07-16T03:15:39.000Z',
      rtt: { handshake: { us: 57115 } },
      certificate_not_valid_before: '2019-08-16T01:40:25.000Z',
    },
    observer: {
      geo: { name: 'US-West', location: '37.422994, -122.083666' },
    },
    timestamp: '2020-02-04T10:07:42.142Z',
  };

  it('shallow renders expected elements for valid props', () => {
    const component = shallowWithRouter(<PageHeaderComponent setBreadcrumbs={jest.fn()} />);
    expect(component).toMatchSnapshot();
  });

  it('renders expected elements for valid props', () => {
    const component = renderWithRouter(<PageHeaderComponent setBreadcrumbs={jest.fn()} />);
    expect(component).toMatchSnapshot();
  });

  it('renders expected title for valid overview route', () => {
    const component = renderWithRouter(
      <Route path={OVERVIEW_ROUTE}>
        <PageHeaderComponent setBreadcrumbs={jest.fn()} />
      </Route>
    );
    expect(component).toMatchSnapshot();

    const titleComponent = component.find('.euiTitle');
    expect(titleComponent.text()).toBe('Overview');
  });

  it('renders expected title for valid monitor route', () => {
    const history = createMemoryHistory({ initialEntries: ['/monitor/ZWxhc3RpYy1jbw=='] });

    const component = renderWithRouter(
      <Route path={MONITOR_ROUTE}>
        <PageHeaderComponent setBreadcrumbs={jest.fn()} monitorStatus={monitorStatus} />
      </Route>,
      history
    );
    expect(component).toMatchSnapshot();

    const titleComponent = component.find('.euiTitle');
    expect(titleComponent.text()).toBe('https://www.elastic.co');
  });

  it('mount expected page title for valid monitor route', () => {
    const history = createMemoryHistory({ initialEntries: ['/monitor/ZWxhc3RpYy1jbw=='] });

    const component = mountWithRouter(
      <Route path={MONITOR_ROUTE}>
        <PageHeaderComponent setBreadcrumbs={jest.fn()} monitorStatus={monitorStatus} />
      </Route>,
      history
    );
    expect(component).toMatchSnapshot();

    const titleComponent = component.find('.euiTitle');
    expect(titleComponent.text()).toBe('https://www.elastic.co');
    expect(document.title).toBe('Uptime | elastic - Kibana');
  });

  it('mount and set expected breadcrumb for monitor route', () => {
    const history = createMemoryHistory({ initialEntries: ['/monitor/ZWxhc3RpYy1jbw=='] });
    let breadcrumbObj: ChromeBreadcrumb[] = [];
    const setBreadcrumb = (breadcrumbs: ChromeBreadcrumb[]) => {
      breadcrumbObj = breadcrumbs;
    };

    mountWithRouter(
      <Route path={MONITOR_ROUTE}>
        <PageHeaderComponent setBreadcrumbs={setBreadcrumb} monitorStatus={monitorStatus} />
      </Route>,
      history
    );

    expect(breadcrumbObj).toStrictEqual([
      { href: '#/?', text: 'Uptime' },
      { text: 'https://www.elastic.co' },
    ]);
  });

  it('mount and set expected breadcrumb for overview route', () => {
    let breadcrumbObj: ChromeBreadcrumb[] = [];
    const setBreadcrumb = (breadcrumbs: ChromeBreadcrumb[]) => {
      breadcrumbObj = breadcrumbs;
    };

    mountWithRouter(
      <Route path={OVERVIEW_ROUTE}>
        <PageHeaderComponent setBreadcrumbs={setBreadcrumb} monitorStatus={monitorStatus} />
      </Route>
    );

    expect(breadcrumbObj).toStrictEqual([{ href: '#/', text: 'Uptime' }]);
  });
});
