/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { shallow } from 'enzyme';
import toJson from 'enzyme-to-json';
import * as React from 'react';

import { TestProviders } from '../../../mock/test_providers';
import { DroppableWrapper } from '../../drag_and_drop/droppable_wrapper';
import { TimelineContext } from '../timeline_context';

import { mockDataProviders } from './mock/mock_data_providers';
import { getDraggableId, Providers } from './providers';
import { DELETE_CLASS_NAME, ENABLE_CLASS_NAME, EXCLUDE_CLASS_NAME } from './provider_item_actions';
import { useMountAppended } from '../../../utils/use_mount_appended';

describe('Providers', () => {
  const mockTimelineContext: boolean = true;
  const mount = useMountAppended();

  describe('rendering', () => {
    test('renders correctly against snapshot', () => {
      const wrapper = shallow(
        <Providers
          browserFields={{}}
          dataProviders={mockDataProviders}
          id="foo"
          onChangeDataProviderKqlQuery={jest.fn()}
          onChangeDroppableAndProvider={jest.fn()}
          onDataProviderEdited={jest.fn()}
          onDataProviderRemoved={jest.fn()}
          onToggleDataProviderEnabled={jest.fn()}
          onToggleDataProviderExcluded={jest.fn()}
        />
      );
      expect(toJson(wrapper)).toMatchSnapshot();
    });

    test('it renders the data providers', () => {
      const wrapper = mount(
        <TestProviders>
          <DroppableWrapper droppableId="unitTest">
            <Providers
              browserFields={{}}
              dataProviders={mockDataProviders}
              id="foo"
              onChangeDataProviderKqlQuery={jest.fn()}
              onChangeDroppableAndProvider={jest.fn()}
              onDataProviderEdited={jest.fn()}
              onDataProviderRemoved={jest.fn()}
              onToggleDataProviderEnabled={jest.fn()}
              onToggleDataProviderExcluded={jest.fn()}
            />
          </DroppableWrapper>
        </TestProviders>
      );

      mockDataProviders.forEach(dataProvider =>
        expect(wrapper.text()).toContain(
          dataProvider.queryMatch.displayValue || dataProvider.queryMatch.value
        )
      );
    });
  });

  describe('#onDataProviderRemoved', () => {
    test('it invokes the onDataProviderRemoved callback when the close button is clicked', () => {
      const mockOnDataProviderRemoved = jest.fn();
      const wrapper = mount(
        <TestProviders>
          <DroppableWrapper droppableId="unitTest">
            <Providers
              browserFields={{}}
              dataProviders={mockDataProviders}
              id="foo"
              onChangeDataProviderKqlQuery={jest.fn()}
              onChangeDroppableAndProvider={jest.fn()}
              onDataProviderEdited={jest.fn()}
              onDataProviderRemoved={mockOnDataProviderRemoved}
              onToggleDataProviderEnabled={jest.fn()}
              onToggleDataProviderExcluded={jest.fn()}
            />
          </DroppableWrapper>
        </TestProviders>
      );
      wrapper
        .find('[data-test-subj="providerBadge"] svg')
        .first()
        .simulate('click');
      expect(mockOnDataProviderRemoved.mock.calls[0][0]).toEqual('id-Provider 1');
    });

    test('while loading data, it does NOT invoke the onDataProviderRemoved callback when the close button is clicked', () => {
      const mockOnDataProviderRemoved = jest.fn();
      const wrapper = mount(
        <TestProviders>
          <TimelineContext.Provider value={mockTimelineContext}>
            <DroppableWrapper droppableId="unitTest">
              <Providers
                browserFields={{}}
                dataProviders={mockDataProviders}
                id="foo"
                onChangeDataProviderKqlQuery={jest.fn()}
                onChangeDroppableAndProvider={jest.fn()}
                onDataProviderEdited={jest.fn()}
                onDataProviderRemoved={mockOnDataProviderRemoved}
                onToggleDataProviderEnabled={jest.fn()}
                onToggleDataProviderExcluded={jest.fn()}
              />
            </DroppableWrapper>
          </TimelineContext.Provider>
        </TestProviders>
      );

      wrapper
        .find('[data-test-subj="providerBadge"] svg')
        .first()
        .simulate('click');

      expect(mockOnDataProviderRemoved).not.toBeCalled();
    });

    test('it invokes the onDataProviderRemoved callback when you click on the option "Delete" in the provider menu', () => {
      const mockOnDataProviderRemoved = jest.fn();
      const wrapper = mount(
        <TestProviders>
          <DroppableWrapper droppableId="unitTest">
            <Providers
              browserFields={{}}
              dataProviders={mockDataProviders}
              id="foo"
              onChangeDataProviderKqlQuery={jest.fn()}
              onChangeDroppableAndProvider={jest.fn()}
              onDataProviderEdited={jest.fn()}
              onDataProviderRemoved={mockOnDataProviderRemoved}
              onToggleDataProviderEnabled={jest.fn()}
              onToggleDataProviderExcluded={jest.fn()}
            />
          </DroppableWrapper>
        </TestProviders>
      );
      wrapper
        .find('button[data-test-subj="providerBadge"]')
        .first()
        .simulate('click');

      wrapper.update();

      wrapper
        .find(`[data-test-subj="providerActions"] .${DELETE_CLASS_NAME}`)
        .first()
        .simulate('click');
      expect(mockOnDataProviderRemoved.mock.calls[0][0]).toEqual('id-Provider 1');
    });

    test('while loading data, it does NOT invoke the onDataProviderRemoved callback when you click on the option "Delete" in the provider menu', () => {
      const mockOnDataProviderRemoved = jest.fn();
      const wrapper = mount(
        <TestProviders>
          <TimelineContext.Provider value={mockTimelineContext}>
            <DroppableWrapper droppableId="unitTest">
              <Providers
                browserFields={{}}
                dataProviders={mockDataProviders}
                id="foo"
                onChangeDataProviderKqlQuery={jest.fn()}
                onChangeDroppableAndProvider={jest.fn()}
                onDataProviderEdited={jest.fn()}
                onDataProviderRemoved={mockOnDataProviderRemoved}
                onToggleDataProviderEnabled={jest.fn()}
                onToggleDataProviderExcluded={jest.fn()}
              />
            </DroppableWrapper>
          </TimelineContext.Provider>
        </TestProviders>
      );
      wrapper
        .find('button[data-test-subj="providerBadge"]')
        .first()
        .simulate('click');

      wrapper.update();

      wrapper
        .find(`[data-test-subj="providerActions"] .${DELETE_CLASS_NAME}`)
        .first()
        .simulate('click');

      expect(mockOnDataProviderRemoved).not.toBeCalled();
    });
  });

  describe('#getDraggableId', () => {
    test('it returns the expected id', () => {
      expect(getDraggableId({ id: 'timeline1', dataProviderId: 'abcd' })).toEqual(
        'draggableId.timeline.timeline1.dataProvider.abcd'
      );
    });
  });

  describe('#onToggleDataProviderEnabled', () => {
    test('it invokes the onToggleDataProviderEnabled callback when you click on the option "Temporary disable" in the provider menu', () => {
      const mockOnToggleDataProviderEnabled = jest.fn();
      const wrapper = mount(
        <TestProviders>
          <DroppableWrapper droppableId="unitTest">
            <Providers
              browserFields={{}}
              dataProviders={mockDataProviders}
              id="foo"
              onChangeDataProviderKqlQuery={jest.fn()}
              onChangeDroppableAndProvider={jest.fn()}
              onDataProviderEdited={jest.fn()}
              onDataProviderRemoved={jest.fn()}
              onToggleDataProviderEnabled={mockOnToggleDataProviderEnabled}
              onToggleDataProviderExcluded={jest.fn()}
            />
          </DroppableWrapper>
        </TestProviders>
      );

      wrapper
        .find('button[data-test-subj="providerBadge"]')
        .first()
        .simulate('click');
      wrapper.update();

      wrapper
        .find(`[data-test-subj="providerActions"] .${ENABLE_CLASS_NAME}`)
        .first()
        .simulate('click');
      expect(mockOnToggleDataProviderEnabled.mock.calls[0][0]).toEqual({
        enabled: false,
        providerId: 'id-Provider 1',
      });
    });

    test('while loading data, it does NOT invoke the onToggleDataProviderEnabled callback when you click on the option "Temporary disable" in the provider menu', () => {
      const mockOnToggleDataProviderEnabled = jest.fn();
      const wrapper = mount(
        <TestProviders>
          <TimelineContext.Provider value={mockTimelineContext}>
            <DroppableWrapper droppableId="unitTest">
              <Providers
                browserFields={{}}
                dataProviders={mockDataProviders}
                id="foo"
                onChangeDataProviderKqlQuery={jest.fn()}
                onChangeDroppableAndProvider={jest.fn()}
                onDataProviderEdited={jest.fn()}
                onDataProviderRemoved={jest.fn()}
                onToggleDataProviderEnabled={mockOnToggleDataProviderEnabled}
                onToggleDataProviderExcluded={jest.fn()}
              />
            </DroppableWrapper>
          </TimelineContext.Provider>
        </TestProviders>
      );

      wrapper
        .find('button[data-test-subj="providerBadge"]')
        .first()
        .simulate('click');
      wrapper.update();

      wrapper
        .find(`[data-test-subj="providerActions"] .${ENABLE_CLASS_NAME}`)
        .first()
        .simulate('click');

      expect(mockOnToggleDataProviderEnabled).not.toBeCalled();
    });
  });

  describe('#onToggleDataProviderExcluded', () => {
    test('it invokes the onToggleDataProviderExcluded callback when you click on the option "Exclude results" in the provider menu', () => {
      const onToggleDataProviderExcluded = jest.fn();

      const wrapper = mount(
        <TestProviders>
          <DroppableWrapper droppableId="unitTest">
            <Providers
              browserFields={{}}
              dataProviders={mockDataProviders}
              id="foo"
              onChangeDataProviderKqlQuery={jest.fn()}
              onChangeDroppableAndProvider={jest.fn()}
              onDataProviderEdited={jest.fn()}
              onDataProviderRemoved={jest.fn()}
              onToggleDataProviderEnabled={jest.fn()}
              onToggleDataProviderExcluded={onToggleDataProviderExcluded}
            />
          </DroppableWrapper>
        </TestProviders>
      );

      wrapper
        .find('button[data-test-subj="providerBadge"]')
        .first()
        .simulate('click');

      wrapper.update();

      wrapper
        .find(`[data-test-subj="providerActions"] .${EXCLUDE_CLASS_NAME}`)
        .first()
        .simulate('click');

      expect(onToggleDataProviderExcluded.mock.calls[0][0]).toEqual({
        excluded: true,
        providerId: 'id-Provider 1',
      });
    });

    test('while loading data, it does NOT invoke the onToggleDataProviderExcluded callback when you click on the option "Exclude results" in the provider menu', () => {
      const onToggleDataProviderExcluded = jest.fn();

      const wrapper = mount(
        <TestProviders>
          <TimelineContext.Provider value={mockTimelineContext}>
            <DroppableWrapper droppableId="unitTest">
              <Providers
                browserFields={{}}
                dataProviders={mockDataProviders}
                id="foo"
                onChangeDataProviderKqlQuery={jest.fn()}
                onChangeDroppableAndProvider={jest.fn()}
                onDataProviderEdited={jest.fn()}
                onDataProviderRemoved={jest.fn()}
                onToggleDataProviderEnabled={jest.fn()}
                onToggleDataProviderExcluded={onToggleDataProviderExcluded}
              />
            </DroppableWrapper>
          </TimelineContext.Provider>
        </TestProviders>
      );

      wrapper
        .find('button[data-test-subj="providerBadge"]')
        .first()
        .simulate('click');

      wrapper.update();

      wrapper
        .find(`[data-test-subj="providerActions"] .${EXCLUDE_CLASS_NAME}`)
        .first()
        .simulate('click');

      expect(onToggleDataProviderExcluded).not.toBeCalled();
    });
  });

  describe('#ProviderWithAndProvider', () => {
    test('Rendering And Provider', () => {
      const dataProviders = mockDataProviders.slice(0, 1);
      dataProviders[0].and = mockDataProviders.slice(1, 3);

      const wrapper = mount(
        <TestProviders>
          <DroppableWrapper droppableId="unitTest">
            <Providers
              browserFields={{}}
              dataProviders={dataProviders}
              id="foo"
              onChangeDataProviderKqlQuery={jest.fn()}
              onChangeDroppableAndProvider={jest.fn()}
              onDataProviderEdited={jest.fn()}
              onDataProviderRemoved={jest.fn()}
              onToggleDataProviderEnabled={jest.fn()}
              onToggleDataProviderExcluded={jest.fn()}
            />
          </DroppableWrapper>
        </TestProviders>
      );

      const andProviderBadges = wrapper.find(
        '[data-test-subj="providerBadge"] .euiBadge__content span.field-value'
      );
      const andProviderBadgesText = andProviderBadges.map(node => node.text()).join(' ');
      expect(andProviderBadges.length).toEqual(6);
      expect(andProviderBadgesText).toEqual(
        'name:  "Provider 1" name:  "Provider 2" name:  "Provider 3"'
      );
    });

    test('it invokes the onDataProviderRemoved callback when you click on the close button is clicked', () => {
      const dataProviders = mockDataProviders.slice(0, 1);
      dataProviders[0].and = mockDataProviders.slice(1, 3);
      const mockOnDataProviderRemoved = jest.fn();

      const wrapper = mount(
        <TestProviders>
          <DroppableWrapper droppableId="unitTest">
            <Providers
              browserFields={{}}
              dataProviders={mockDataProviders}
              id="foo"
              onChangeDataProviderKqlQuery={jest.fn()}
              onChangeDroppableAndProvider={jest.fn()}
              onDataProviderEdited={jest.fn()}
              onDataProviderRemoved={mockOnDataProviderRemoved}
              onToggleDataProviderEnabled={jest.fn()}
              onToggleDataProviderExcluded={jest.fn()}
            />
          </DroppableWrapper>
        </TestProviders>
      );

      wrapper
        .find('[data-test-subj="providerBadge"]')
        .at(4)
        .find('svg')
        .first()
        .simulate('click');

      wrapper.update();

      expect(mockOnDataProviderRemoved.mock.calls[0]).toEqual(['id-Provider 1', 'id-Provider 2']);
    });

    test('while loading data, it does NOT invoke the onDataProviderRemoved callback when you click on the close button is clicked', () => {
      const dataProviders = mockDataProviders.slice(0, 1);
      dataProviders[0].and = mockDataProviders.slice(1, 3);
      const mockOnDataProviderRemoved = jest.fn();

      const wrapper = mount(
        <TestProviders>
          <TimelineContext.Provider value={mockTimelineContext}>
            <DroppableWrapper droppableId="unitTest">
              <Providers
                browserFields={{}}
                dataProviders={mockDataProviders}
                id="foo"
                onChangeDataProviderKqlQuery={jest.fn()}
                onChangeDroppableAndProvider={jest.fn()}
                onDataProviderEdited={jest.fn()}
                onDataProviderRemoved={mockOnDataProviderRemoved}
                onToggleDataProviderEnabled={jest.fn()}
                onToggleDataProviderExcluded={jest.fn()}
              />
            </DroppableWrapper>
          </TimelineContext.Provider>
        </TestProviders>
      );

      wrapper
        .find('[data-test-subj="providerBadge"]')
        .at(4)
        .find('svg')
        .first()
        .simulate('click');

      wrapper.update();

      expect(mockOnDataProviderRemoved).not.toBeCalled();
    });

    test('it invokes the onToggleDataProviderEnabled callback when you click on the option "Temporary disable" in the provider menu', () => {
      const dataProviders = mockDataProviders.slice(0, 1);
      dataProviders[0].and = mockDataProviders.slice(1, 3);
      const mockOnToggleDataProviderEnabled = jest.fn();

      const wrapper = mount(
        <TestProviders>
          <DroppableWrapper droppableId="unitTest">
            <Providers
              browserFields={{}}
              dataProviders={dataProviders}
              id="foo"
              onChangeDataProviderKqlQuery={jest.fn()}
              onChangeDroppableAndProvider={jest.fn()}
              onDataProviderEdited={jest.fn()}
              onDataProviderRemoved={jest.fn()}
              onToggleDataProviderEnabled={mockOnToggleDataProviderEnabled}
              onToggleDataProviderExcluded={jest.fn()}
            />
          </DroppableWrapper>
        </TestProviders>
      );

      wrapper
        .find('[data-test-subj="providerBadge"]')
        .at(4)
        .find('button')
        .first()
        .simulate('click');

      wrapper.update();

      wrapper
        .find(`[data-test-subj="providerActions"] .${ENABLE_CLASS_NAME}`)
        .first()
        .simulate('click');

      expect(mockOnToggleDataProviderEnabled.mock.calls[0][0]).toEqual({
        andProviderId: 'id-Provider 2',
        enabled: false,
        providerId: 'id-Provider 1',
      });
    });

    test('while loading data, it does NOT invoke the onToggleDataProviderEnabled callback when you click on the option "Temporary disable" in the provider menu', () => {
      const dataProviders = mockDataProviders.slice(0, 1);
      dataProviders[0].and = mockDataProviders.slice(1, 3);
      const mockOnToggleDataProviderEnabled = jest.fn();

      const wrapper = mount(
        <TestProviders>
          <TimelineContext.Provider value={mockTimelineContext}>
            <DroppableWrapper droppableId="unitTest">
              <Providers
                browserFields={{}}
                dataProviders={dataProviders}
                id="foo"
                onChangeDataProviderKqlQuery={jest.fn()}
                onChangeDroppableAndProvider={jest.fn()}
                onDataProviderEdited={jest.fn()}
                onDataProviderRemoved={jest.fn()}
                onToggleDataProviderEnabled={mockOnToggleDataProviderEnabled}
                onToggleDataProviderExcluded={jest.fn()}
              />
            </DroppableWrapper>
          </TimelineContext.Provider>
        </TestProviders>
      );

      wrapper
        .find('[data-test-subj="providerBadge"]')
        .at(4)
        .find('button')
        .first()
        .simulate('click');

      wrapper.update();

      wrapper
        .find(`[data-test-subj="providerActions"] .${ENABLE_CLASS_NAME}`)
        .first()
        .simulate('click');

      expect(mockOnToggleDataProviderEnabled).not.toBeCalled();
    });

    test('it invokes the onToggleDataProviderExcluded callback when you click on the option "Exclude results" in the provider menu', () => {
      const dataProviders = mockDataProviders.slice(0, 1);
      dataProviders[0].and = mockDataProviders.slice(1, 3);
      const mockOnToggleDataProviderExcluded = jest.fn();

      const wrapper = mount(
        <TestProviders>
          <DroppableWrapper droppableId="unitTest">
            <Providers
              browserFields={{}}
              dataProviders={dataProviders}
              id="foo"
              onChangeDataProviderKqlQuery={jest.fn()}
              onChangeDroppableAndProvider={jest.fn()}
              onDataProviderEdited={jest.fn()}
              onDataProviderRemoved={jest.fn()}
              onToggleDataProviderEnabled={jest.fn()}
              onToggleDataProviderExcluded={mockOnToggleDataProviderExcluded}
            />
          </DroppableWrapper>
        </TestProviders>
      );

      wrapper
        .find('[data-test-subj="providerBadge"]')
        .at(4)
        .find('button')
        .first()
        .simulate('click');

      wrapper.update();

      wrapper
        .find(`[data-test-subj="providerActions"] .${EXCLUDE_CLASS_NAME}`)
        .first()
        .simulate('click');

      expect(mockOnToggleDataProviderExcluded.mock.calls[0][0]).toEqual({
        andProviderId: 'id-Provider 2',
        excluded: true,
        providerId: 'id-Provider 1',
      });
    });

    test('while loading data, it does NOT invoke the onToggleDataProviderExcluded callback when you click on the option "Exclude results" in the provider menu', () => {
      const dataProviders = mockDataProviders.slice(0, 1);
      dataProviders[0].and = mockDataProviders.slice(1, 3);
      const mockOnToggleDataProviderExcluded = jest.fn();

      const wrapper = mount(
        <TestProviders>
          <TimelineContext.Provider value={mockTimelineContext}>
            <DroppableWrapper droppableId="unitTest">
              <Providers
                browserFields={{}}
                dataProviders={dataProviders}
                id="foo"
                onChangeDataProviderKqlQuery={jest.fn()}
                onChangeDroppableAndProvider={jest.fn()}
                onDataProviderEdited={jest.fn()}
                onDataProviderRemoved={jest.fn()}
                onToggleDataProviderEnabled={jest.fn()}
                onToggleDataProviderExcluded={mockOnToggleDataProviderExcluded}
              />
            </DroppableWrapper>
          </TimelineContext.Provider>
        </TestProviders>
      );

      wrapper
        .find('[data-test-subj="providerBadge"]')
        .at(4)
        .find('button')
        .first()
        .simulate('click');

      wrapper.update();

      wrapper
        .find(`[data-test-subj="providerActions"] .${EXCLUDE_CLASS_NAME}`)
        .first()
        .simulate('click');

      expect(mockOnToggleDataProviderExcluded).not.toBeCalled();
    });
  });
});
