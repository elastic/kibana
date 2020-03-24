/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { mountWithIntl, shallowWithIntl } from 'test_utils/enzyme_helpers';
import { EmptyStateComponent } from '../empty_state';
import { StatesIndexStatus } from '../../../../../common/runtime_types';
import { IHttpFetchError } from '../../../../../../../../../target/types/core/public/http';
import { HttpFetchError } from '../../../../../../../../../src/core/public/http/http_fetch_error';

describe('EmptyState component', () => {
  let statesIndexStatus: StatesIndexStatus;

  beforeEach(() => {
    statesIndexStatus = {
      indexExists: true,
      docCount: 1,
    };
  });

  it('renders child components when count is truthy', () => {
    const component = shallowWithIntl(
      <EmptyStateComponent statesIndexStatus={statesIndexStatus} loading={false}>
        <div>Foo</div>
        <div>Bar</div>
        <div>Baz</div>
      </EmptyStateComponent>
    );
    expect(component).toMatchSnapshot();
  });

  it(`doesn't render child components when count is falsy`, () => {
    const component = mountWithIntl(
      <EmptyStateComponent statesIndexStatus={null} loading={false}>
        <div>Shouldn&apos;t be rendered</div>
      </EmptyStateComponent>
    );
    expect(component).toMatchSnapshot();
  });

  it(`renders error message when an error occurs`, () => {
    const errors: IHttpFetchError[] = [
      new HttpFetchError('There was an error fetching your data.', 'error', {} as any),
    ];
    const component = mountWithIntl(
      <EmptyStateComponent statesIndexStatus={null} errors={errors} loading={false}>
        <div>Shouldn&apos;t appear...</div>
      </EmptyStateComponent>
    );
    expect(component).toMatchSnapshot();
  });

  it('renders loading state if no errors or doc count', () => {
    const component = mountWithIntl(
      <EmptyStateComponent loading={true} statesIndexStatus={null}>
        <div>Should appear even while loading...</div>
      </EmptyStateComponent>
    );
    expect(component).toMatchSnapshot();
  });

  it('does not render empty state with appropriate base path and no docs', () => {
    statesIndexStatus = {
      docCount: 0,
      indexExists: true,
    };
    const component = mountWithIntl(
      <EmptyStateComponent statesIndexStatus={statesIndexStatus} loading={false}>
        <div>If this is in the snapshot the test should fail</div>
      </EmptyStateComponent>
    );
    expect(component).toMatchSnapshot();
  });

  it('notifies when index does not exist', () => {
    statesIndexStatus.indexExists = false;
    const component = mountWithIntl(
      <EmptyStateComponent statesIndexStatus={statesIndexStatus} loading={false}>
        <div>This text should not render</div>
      </EmptyStateComponent>
    );
    expect(component).toMatchSnapshot();
  });
});
