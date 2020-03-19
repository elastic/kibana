/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { Route } from 'react-router-dom';
import { PageHeader, makeBaseBreadcrumb } from '../page_header';
import { mountWithRouter, renderWithRouter } from '../../lib';
import { OVERVIEW_ROUTE } from '../../../common/constants';
import { ChromeBreadcrumb } from 'kibana/public';
import { KibanaContextProvider } from '../../../../../../../src/plugins/kibana_react/public';
import { UptimeUrlParams, getSupportedUrlParams } from '../../lib/helper';

describe('PageHeader', () => {
  const simpleBreadcrumbs: ChromeBreadcrumb[] = [
    { text: 'TestCrumb1', href: '#testHref1' },
    { text: 'TestCrumb2', href: '#testHref2' },
  ];

  it('shallow renders with breadcrumbs and the date picker', () => {
    const component = renderWithRouter(
      <PageHeader
        headingText={'TestingHeading'}
        breadcrumbs={simpleBreadcrumbs}
        datePicker={true}
      />
    );
    expect(component).toMatchSnapshot('page_header_with_date_picker');
  });

  it('shallow renders with breadcrumbs without the date picker', () => {
    const component = renderWithRouter(
      <PageHeader
        headingText={'TestingHeading'}
        breadcrumbs={simpleBreadcrumbs}
        datePicker={false}
      />
    );
    expect(component).toMatchSnapshot('page_header_no_date_picker');
  });

  it('sets the given breadcrumbs', () => {
    const [getBreadcrumbs, core] = mockCore();
    mountWithRouter(
      <KibanaContextProvider services={{ ...core }}>
        <Route path={OVERVIEW_ROUTE}>
          <PageHeader
            headingText={'TestingHeading'}
            breadcrumbs={simpleBreadcrumbs}
            datePicker={false}
          />
        </Route>
      </KibanaContextProvider>
    );

    const urlParams: UptimeUrlParams = getSupportedUrlParams({});
    expect(getBreadcrumbs()).toStrictEqual(
      [makeBaseBreadcrumb(urlParams)].concat(simpleBreadcrumbs)
    );
  });
});

const mockCore: () => [() => ChromeBreadcrumb[], any] = () => {
  let breadcrumbObj: ChromeBreadcrumb[] = [];
  const get = () => {
    return breadcrumbObj;
  };
  const core = {
    chrome: {
      setBreadcrumbs: (newBreadcrumbs: ChromeBreadcrumb[]) => {
        breadcrumbObj = newBreadcrumbs;
      },
    },
  };

  return [get, core];
};
