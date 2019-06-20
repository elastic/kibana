/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { mountWithIntl, shallowWithIntl } from 'test_utils/enzyme_helpers';
import { EmptyStateComponent } from '../empty_state';
import { GraphQLError } from 'graphql';

describe('EmptyState component', () => {
  it('renders child components when count is truthy', () => {
    const component = shallowWithIntl(
      <EmptyStateComponent
        basePath=""
        data={{ getStatesIndexStatus: { docCount: { count: 1 }, indexExists: true } }}
        loading={false}
      >
        <div>Foo</div>
        <div>Bar</div>
        <div>Baz</div>
      </EmptyStateComponent>
    );
    expect(component).toMatchSnapshot();
  });

  it(`doesn't render child components when count is falsey`, () => {
    const component = mountWithIntl(
      <EmptyStateComponent basePath="" data={undefined} loading={false}>
        <div>Shouldn't be rendered</div>
      </EmptyStateComponent>
    );
    expect(component).toMatchSnapshot();
  });

  it(`renders error message when an error occurs`, () => {
    const errors: GraphQLError[] = [
      {
        message: 'An error occurred',
        locations: undefined,
        path: undefined,
        nodes: undefined,
        source: undefined,
        positions: undefined,
        originalError: undefined,
        extensions: undefined,
        name: 'foo',
      },
    ];
    const component = mountWithIntl(
      <EmptyStateComponent basePath="" data={undefined} errors={errors} loading={false}>
        <div>Shouldn't appear...</div>
      </EmptyStateComponent>
    );
    expect(component).toMatchSnapshot();
  });

  it('renders loading state if no errors or doc count', () => {
    const component = mountWithIntl(
      <EmptyStateComponent basePath="" loading={true}>
        <div>Should appear even while loading...</div>
      </EmptyStateComponent>
    );
    expect(component).toMatchSnapshot();
  });

  it('renders empty state with appropriate base path', () => {
    const component = mountWithIntl(
      <EmptyStateComponent
        basePath="foo"
        data={{ getStatesIndexStatus: { docCount: { count: 0 }, indexExists: true } }}
        loading={false}
      >
        <div>If this is in the snapshot the test should fail</div>
      </EmptyStateComponent>
    );
    expect(component).toMatchSnapshot();
  });

  it('notifies when index does not exist', () => {
    const component = mountWithIntl(
      <EmptyStateComponent
        basePath="foo"
        data={{ getStatesIndexStatus: { indexExists: false } }}
        loading={false}
      >
        <div>This text should not render</div>
      </EmptyStateComponent>
    );
    expect(component).toMatchSnapshot();
  });
});
