import React from 'react';
import { render, shallow, mount } from 'enzyme';
import sinon from 'sinon';
import { requiredProps } from '../../test/required_props';

import { KuiContextMenuPanel } from './context_menu_panel';

describe('KuiContextMenuPanel', () => {
  test('is rendered', () => {
    const component = render(
      <KuiContextMenuPanel {...requiredProps}>
        Hello
      </KuiContextMenuPanel>
    );

    expect(component)
      .toMatchSnapshot();
  });

  describe('props', () => {
    describe('title', () => {
      test('is rendered', () => {
        const component = render(
          <KuiContextMenuPanel title="Title" />
        );

        expect(component)
          .toMatchSnapshot();
      });
    });

    describe('onClose', () => {
      test('renders a button as a title', () => {
        const component = render(
          <KuiContextMenuPanel title="Title" onClose={() =>{}} />
        );

        expect(component)
          .toMatchSnapshot();
      });

      test(`isn't called upon instantiation`, () => {
        const onCloseHandler = sinon.stub();

        shallow(
          <KuiContextMenuPanel title="Title" onClose={onCloseHandler} />
        );

        sinon.assert.notCalled(onCloseHandler);
      });

      test('is called when the title is clicked', () => {
        const onCloseHandler = sinon.stub();

        const component = shallow(
          <KuiContextMenuPanel title="Title" onClose={onCloseHandler} />
        );

        component.find('button').simulate('click');

        sinon.assert.calledOnce(onCloseHandler);
      });
    });

    describe('panelRef', () => {
      it('is provided a node', () => {
        const panelRef = sinon.stub();

        mount(
          <KuiContextMenuPanel panelRef={panelRef} />
        );

        sinon.assert.calledWith(panelRef, sinon.match.object);
      });
    });

    describe('transitionDirection', () => {
      describe('next', () => {
        describe('with transitionType', () => {
          describe('in', () => {
            test('is rendered', () => {
              const component = render(
                <KuiContextMenuPanel transitionDirection="next" transitionType="in" />
              );

              expect(component)
                .toMatchSnapshot();
            });
          });

          describe('out', () => {
            test('is rendered', () => {
              const component = render(
                <KuiContextMenuPanel transitionDirection="next" transitionType="out" />
              );

              expect(component)
                .toMatchSnapshot();
            });
          });
        });
      });

      describe('previous', () => {
        describe('with transitionType', () => {
          describe('in', () => {
            test('is rendered', () => {
              const component = render(
                <KuiContextMenuPanel transitionDirection="previous" transitionType="in" />
              );

              expect(component)
                .toMatchSnapshot();
            });
          });

          describe('out', () => {
            test('is rendered', () => {
              const component = render(
                <KuiContextMenuPanel transitionDirection="previous" transitionType="out" />
              );

              expect(component)
                .toMatchSnapshot();
            });
          });
        });
      });
    });
  });
});
