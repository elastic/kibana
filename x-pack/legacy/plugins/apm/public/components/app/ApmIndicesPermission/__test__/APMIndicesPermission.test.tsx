/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { shallow } from 'enzyme';
import { APMIndicesPermission } from '../';

import * as hooks from '../../../../hooks/useFetcher';
import {
  expectTextsInDocument,
  MockApmPluginContextWrapper,
  expectTextsNotInDocument
} from '../../../../utils/testHelpers';

describe('APMIndicesPermission', () => {
  it('returns empty component when api status is loading', () => {
    spyOn(hooks, 'useFetcher').and.returnValue({
      status: hooks.FETCH_STATUS.LOADING
    });
    const component = shallow(<APMIndicesPermission />);
    expect(component.isEmptyRender()).toBeTruthy();
  });
  it('returns empty component when api status is pending', () => {
    spyOn(hooks, 'useFetcher').and.returnValue({
      status: hooks.FETCH_STATUS.PENDING
    });
    const component = shallow(<APMIndicesPermission />);
    expect(component.isEmptyRender()).toBeTruthy();
  });
  it('renders missing permission page', () => {
    spyOn(hooks, 'useFetcher').and.returnValue({
      status: hooks.FETCH_STATUS.SUCCESS,
      data: {
        'apm-*': { read: false }
      }
    });
    const component = render(
      <MockApmPluginContextWrapper>
        <APMIndicesPermission />
      </MockApmPluginContextWrapper>
    );
    expectTextsInDocument(component, [
      'Missing permissions to access APM',
      'Dismiss',
      'apm-*'
    ]);
  });
  it('shows escape hatch button when at least one indice has read privileges', () => {
    spyOn(hooks, 'useFetcher').and.returnValue({
      status: hooks.FETCH_STATUS.SUCCESS,
      data: {
        'apm-7.5.1-error-000001': { read: false },
        'apm-7.5.1-metric-000001': { read: false },
        'apm-7.5.1-transaction-000001': { read: false },
        'apm-7.5.1-span-000001': { read: true }
      }
    });
    const component = render(
      <MockApmPluginContextWrapper>
        <APMIndicesPermission />
      </MockApmPluginContextWrapper>
    );
    expectTextsInDocument(component, [
      'Missing permissions to access APM',
      'apm-7.5.1-error-000001',
      'apm-7.5.1-metric-000001',
      'apm-7.5.1-transaction-000001',
      'Dismiss'
    ]);
    expectTextsNotInDocument(component, ['apm-7.5.1-span-000001']);
  });

  it('shows children component when indices have read privileges', () => {
    spyOn(hooks, 'useFetcher').and.returnValue({
      status: hooks.FETCH_STATUS.SUCCESS,
      data: {
        'apm-7.5.1-error-000001': { read: true },
        'apm-7.5.1-metric-000001': { read: true },
        'apm-7.5.1-transaction-000001': { read: true },
        'apm-7.5.1-span-000001': { read: true }
      }
    });
    const component = render(
      <MockApmPluginContextWrapper>
        <APMIndicesPermission>
          <p>My amazing component</p>
        </APMIndicesPermission>
      </MockApmPluginContextWrapper>
    );
    expectTextsNotInDocument(component, [
      'Missing permissions to access APM',
      'apm-7.5.1-error-000001',
      'apm-7.5.1-metric-000001',
      'apm-7.5.1-transaction-000001',
      'apm-7.5.1-span-000001'
    ]);
    expectTextsInDocument(component, ['My amazing component']);
  });

  it('dismesses the warning by clicking on the escape hatch', () => {
    spyOn(hooks, 'useFetcher').and.returnValue({
      status: hooks.FETCH_STATUS.SUCCESS,
      data: {
        'apm-7.5.1-error-000001': { read: false },
        'apm-7.5.1-metric-000001': { read: false },
        'apm-7.5.1-transaction-000001': { read: false },
        'apm-7.5.1-span-000001': { read: true }
      }
    });
    const component = render(
      <MockApmPluginContextWrapper>
        <APMIndicesPermission>
          <p>My amazing component</p>
        </APMIndicesPermission>
      </MockApmPluginContextWrapper>
    );
    expectTextsInDocument(component, ['Dismiss']);
    fireEvent.click(component.getByText('Dismiss'));
    expectTextsInDocument(component, ['My amazing component']);
  });
});
