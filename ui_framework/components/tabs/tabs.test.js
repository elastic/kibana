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

  describe('throws an error', () => {
    let consoleStub;

    beforeEach(() => {
      consoleStub = sinon.stub(console, 'error');
    });

    afterEach(() => {
      console.error.restore();
    });

    test(`when selectedTabIndex is defined but there's no child`, () => {
      const component = ( // eslint-disable-line no-unused-vars
        <KuiTabs
          selectedTabIndex={1}
          onSelectedTabChanged={()=>{}}
        />
      );

      expect(consoleStub.calledOnce).toBe(true);
      expect(consoleStub.getCall(0).args[0]).toContain(
        `selectedTabIndex must be undefined if there is no tab to select.`
      );
    });

    test(`when selectedTabIndex is negative`, () => {
      const component = ( // eslint-disable-line no-unused-vars
        <KuiTabs
          selectedTabIndex={-1}
          onSelectedTabChanged={()=>{}}
        >
          {tabs}
        </KuiTabs>
      );

      expect(consoleStub.calledOnce).toBe(true);
      expect(consoleStub.getCall(0).args[0]).toContain(
        `selectedTabIndex(-1) must be within the range defined by the number of tabs.`
      );
    });

    test(`when selectedTabIndex is greater then the upper limit defined by the number of tabs`, () => {
      const component = ( // eslint-disable-line no-unused-vars
        <KuiTabs
          selectedTabIndex={tabs.length}
          onSelectedTabChanged={()=>{}}
        >
          {tabs}
        </KuiTabs>
      );

      expect(consoleStub.calledOnce).toBe(true);
      expect(consoleStub.getCall(0).args[0]).toContain(
        `selectedTabIndex(4) must be within the range defined by the number of tabs.`
      );
    });
  });

  describe(`doesn't throw an error`, () => {
    let consoleStub;

    beforeEach(() => {
      consoleStub = sinon.stub(console, 'error');
    });

    afterEach(() => {
      console.error.restore();
    });

    test(`when selectedTabIndex is undefined and there's no child`, () => {
      const component = ( // eslint-disable-line no-unused-vars
        <KuiTabs
          onSelectedTabChanged={()=>{}}
        />
      );

      expect(consoleStub.calledOnce).toBe(false);
    });

    test(`when selectedTabIndex is within the range defined by the number of tabs`, () => {
      const component = ( // eslint-disable-line no-unused-vars
        <KuiTabs
          selectedTabIndex={tabs.length - 1}
          onSelectedTabChanged={()=>{}}
        >
          {tabs}
        </KuiTabs>
      );

      expect(consoleStub.calledOnce).toBe(false);
    });
  });

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
