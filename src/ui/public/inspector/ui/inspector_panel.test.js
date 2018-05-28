import React from 'react';
import { mount, shallow } from 'enzyme';
import { InspectorPanel } from './inspector_panel';

describe('InspectorPanel', () => {

  let adapters;
  let views;

  beforeEach(() => {
    adapters = {
      foodapter: {
        foo() { return 42; }
      },
      bardapter: {

      }
    };
    views = [
      {
        title: 'View 1',
        order: 200,
        component: () => (<h1>View 1</h1>),
      }, {
        title: 'Foo View',
        order: 100,
        component: () => (<h1>Foo view</h1>),
        shouldShow(adapters) {
          return adapters.foodapter;
        }
      }, {
        title: 'Never',
        order: 200,
        component: () => null,
        shouldShow() {
          return false;
        }
      }
    ];
  });

  it('should render as expected', () => {
    const component = mount(
      <InspectorPanel
        adapters={adapters}
        onClose={() => true}
        views={views}
      />
    );
    expect(component).toMatchSnapshot();
  });

  it('should not allow updating adapters', () => {
    const component = shallow(
      <InspectorPanel
        adapters={adapters}
        onClose={() => true}
        views={views}
      />
    );
    adapters.notAllowed = {};
    expect(() => component.setProps({ adapters })).toThrow();
  });
});
