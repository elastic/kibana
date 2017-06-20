import React from 'react';
import { render, shallow } from 'enzyme';
import { requiredProps } from '../../test/required_props';
import sinon from 'sinon';

import {
  KuiTabs,
} from './tabs';

import {
  KuiTab,
} from './tab';

describe('KuiTabs', () => {
  const tabs = [
    'Cobalt',
    'Dextrose',
    'Helium-3',
    'Monosodium Glutamate',
  ];

  test('renders', () => {
    const component = (
      <KuiTabs
         selectedTabIndex={0}
         onSelectedTabChanged={()=>{}}
         { ...requiredProps }
       >
        {tabs}
      </KuiTabs>
    );

    expect(render(component)).toMatchSnapshot();
  });

  describe('Props', () => {
    describe('onSelectedTabChanged', () => {
      test(`isn't called upon instantiation`, () => {
        const onSelectedTabChangedHandler = sinon.spy();

        shallow(
          <KuiTabs
             selectedTabIndex={0}
             onSelectedTabChanged={onSelectedTabChangedHandler}
           >
            {tabs}
          </KuiTabs>
        );

        sinon.assert.notCalled(onSelectedTabChangedHandler);
      });

      test('is called when the button is clicked', () => {
        const onSelectedTabChangedHandler = sinon.spy();

        const component = shallow(
          <KuiTabs
             selectedTabIndex={0}
             onSelectedTabChanged={onSelectedTabChangedHandler}
           >
            {tabs}
          </KuiTabs>
        );

        component.find(KuiTab).at(1).simulate('click');
        sinon.assert.calledOnce(onSelectedTabChangedHandler);
        sinon.assert.calledWith(onSelectedTabChangedHandler,1);
      });
    });
  });
});
