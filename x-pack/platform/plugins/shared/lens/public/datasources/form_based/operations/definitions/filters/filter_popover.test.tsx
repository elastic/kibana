/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { shallow, mount } from 'enzyme';
import { act } from 'react-dom/test-utils';
import { EuiPopover, EuiLink } from '@elastic/eui';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { kqlPluginMock } from '@kbn/kql/public/mocks';
import { coreMock } from '@kbn/core/public/mocks';
import { dataPluginMock } from '@kbn/data-plugin/public/mocks';
import { dataViewPluginMocks } from '@kbn/data-views-plugin/public/mocks';
import { createMockedIndexPattern } from '../../../mocks';
import { FilterPopover } from './filter_popover';
import { LabelInput } from '../shared_components';
import { QueryStringInput } from '@kbn/kql/public';
import { QueryInput } from '@kbn/visualization-ui-components';
import type { Query } from '@kbn/es-query';

jest.mock('.', () => ({}));

jest.mock('@kbn/visualization-ui-components', () => {
  const original = jest.requireActual('@kbn/visualization-ui-components');

  return {
    ...original,
    isQueryValid: jest.fn((q: Query) => (q.query === 'bytes >= 1 and' ? false : true)),
  };
});

jest.mock('@kbn/kql/public', () => ({
  QueryStringInput: () => 'QueryStringInput',
}));

describe('filter popover', () => {
  let defaultProps: Parameters<typeof FilterPopover>[0];
  let mockOnClick: jest.Mock;

  const createMockStorage = () => ({
    get: jest.fn(),
    set: jest.fn(),
    remove: jest.fn(),
    clear: jest.fn(),
  });

  const coreMockStart = coreMock.createStart();
  const mockServices = {
    http: coreMockStart.http,
    storage: createMockStorage(),
    dataViews: dataViewPluginMocks.createStartContract(),
    data: dataPluginMock.createStartContract(),
    uiSettings: coreMockStart.uiSettings,
    notifications: coreMockStart.notifications,
    kql: kqlPluginMock.createStartContract(),
    docLinks: coreMockStart.docLinks,
  };

  const wrapInContext = (component: React.ReactElement) => (
    <KibanaContextProvider services={mockServices}>{component}</KibanaContextProvider>
  );

  beforeEach(() => {
    mockOnClick = jest.fn();

    defaultProps = {
      filter: {
        input: { query: 'bytes >= 1', language: 'kuery' },
        label: 'More than one',
        id: '1',
      },
      setFilter: jest.fn(),
      indexPattern: createMockedIndexPattern(),
      button: <EuiLink onClick={mockOnClick}>trigger</EuiLink>,
      isOpen: true,
      triggerClose: () => {},
    };
  });

  describe('interactions', () => {
    it('should open/close according to isOpen', () => {
      const instance = mount(
        wrapInContext(<FilterPopover {...{ ...defaultProps, isOpen: true }} />)
      );

      expect(instance.find(EuiPopover).prop('isOpen')).toEqual(true);

      instance.setProps({
        children: wrapInContext(<FilterPopover {...{ ...defaultProps, isOpen: false }} />),
      });
      instance.update();

      expect(instance.find(EuiPopover).prop('isOpen')).toEqual(false);
    });

    it('should report click event', () => {
      const instance = mount(wrapInContext(<FilterPopover {...defaultProps} />));

      expect(mockOnClick).not.toHaveBeenCalled();

      instance.find(EuiPopover).find('button').simulate('click', {});

      expect(mockOnClick).toHaveBeenCalledTimes(1);
    });

    it('should trigger close', () => {
      const props = { ...defaultProps, triggerClose: jest.fn() };
      const instance = mount(wrapInContext(<FilterPopover {...props} />));
      expect(instance.find(EuiPopover).prop('isOpen')).toEqual(true);

      // Trigger from EuiPopover
      act(() => {
        instance.find(EuiPopover).prop('closePopover')!();
      });
      expect(props.triggerClose).toHaveBeenCalledTimes(1);

      // Trigger from submit
      act(() => {
        instance.find(LabelInput).prop('onSubmit')!();
      });
      expect(props.triggerClose).toHaveBeenCalledTimes(2);
    });
  });

  it('passes correct props to QueryStringInput', () => {
    const instance = mount(wrapInContext(<FilterPopover {...defaultProps} />));
    instance.update();
    expect(instance.find(QueryStringInput).props()).toEqual(
      expect.objectContaining({
        dataTestSubj: 'indexPattern-filters-queryStringInput',
        indexPatterns: [{ type: 'id', value: '1' }],
        isInvalid: false,
        query: { language: 'kuery', query: 'bytes >= 1' },
      })
    );
  });

  it('should call setFilter when modifying QueryInput', () => {
    const setFilter = jest.fn();
    const instance = shallow(<FilterPopover {...defaultProps} setFilter={setFilter} />);
    instance.find(QueryInput).prop('onChange')!({
      query: 'modified : query',
      language: 'lucene',
    });
    expect(setFilter).toHaveBeenCalledWith({
      input: {
        language: 'lucene',
        query: 'modified : query',
      },
      label: 'More than one',
      id: '1',
    });
  });

  it('should not call setFilter if QueryInput value is not valid', () => {
    const setFilter = jest.fn();
    const instance = shallow(<FilterPopover {...defaultProps} setFilter={setFilter} />);
    instance.find(QueryInput).prop('onChange')!({
      query: 'bytes >= 1 and',
      language: 'kuery',
    });
    expect(setFilter).not.toHaveBeenCalled();
  });

  it('should call setFilter when modifying LabelInput', () => {
    const setFilter = jest.fn();
    const instance = shallow(<FilterPopover {...defaultProps} setFilter={setFilter} />);
    instance.find(LabelInput).prop('onChange')!('Modified label');
    expect(setFilter).toHaveBeenCalledWith({
      input: {
        language: 'kuery',
        query: 'bytes >= 1',
      },
      label: 'Modified label',
      id: '1',
    });
  });
});
