import expect from 'expect.js';
import sinon from 'sinon';
import ngMock from 'ng_mock';
import '../typeahead';
import { comboBoxKeyCodes } from '@elastic/eui';
const { UP, DOWN, ENTER, TAB, ESCAPE } = comboBoxKeyCodes;

describe('Typeahead directive', function () {
  let $compile;
  let scope;
  let element;

  beforeEach(ngMock.module('kibana'));

  beforeEach(ngMock.inject(function (_$compile_, _$rootScope_) {
    $compile = _$compile_;
    scope = _$rootScope_.$new();
    const html = `
      <kbn-typeahead
        items="items"
        item-template="itemTemplate"
        on-select="onSelect(item)"
      >
        <input
          kbn-typeahead-input
          ng-model="value"
          type="text"
        />
      </kbn-typeahead>
    `;
    element = $compile(html)(scope);
    scope.items = ['foo', 'bar', 'baz'];
    scope.onSelect = sinon.spy();
    scope.$digest();
  }));

  describe('before focus', function () {
    it('should be hidden', function () {
      scope.$digest();
      expect(element.find('.typeahead-popover').hasClass('ng-hide')).to.be(true);
    });
  });

  describe('after focus', function () {
    beforeEach(function () {
      element.find('input').triggerHandler('focus');
      scope.$digest();
    });

    it('should still be hidden', function () {
      expect(element.find('.typeahead-popover').hasClass('ng-hide')).to.be(true);
    });

    it('should show when a key is pressed unless there are no items', function () {
      element.find('.typeahead').triggerHandler({
        type: 'keypress',
        keyCode: 'A'.charCodeAt(0)
      });

      scope.$digest();

      expect(element.find('.typeahead-popover').hasClass('ng-hide')).to.be(false);

      scope.items = [];
      scope.$digest();

      expect(element.find('.typeahead-popover').hasClass('ng-hide')).to.be(true);
    });

    it('should hide when escape is pressed', function () {
      element.find('.typeahead').triggerHandler({
        type: 'keydown',
        keyCode: ESCAPE
      });

      scope.$digest();

      expect(element.find('.typeahead-popover').hasClass('ng-hide')).to.be(true);
    });

    it('should select the next option on arrow down', function () {
      let expectedActiveIndex = -1;
      for (let i = 0; i < scope.items.length + 1; i++) {
        expectedActiveIndex++;
        if (expectedActiveIndex > scope.items.length - 1) expectedActiveIndex = 0;

        element.find('.typeahead').triggerHandler({
          type: 'keydown',
          keyCode: DOWN
        });

        scope.$digest();

        expect(element.find('.typeahead-item.active').length).to.be(1);
        expect(element.find('.typeahead-item').eq(expectedActiveIndex).hasClass('active')).to.be(true);
      }
    });

    it('should select the previous option on arrow up', function () {
      let expectedActiveIndex = scope.items.length;
      for (let i = 0; i < scope.items.length + 1; i++) {
        expectedActiveIndex--;
        if (expectedActiveIndex < 0) expectedActiveIndex = scope.items.length - 1;

        element.find('.typeahead').triggerHandler({
          type: 'keydown',
          keyCode: UP
        });

        scope.$digest();

        expect(element.find('.typeahead-item.active').length).to.be(1);
        expect(element.find('.typeahead-item').eq(expectedActiveIndex).hasClass('active')).to.be(true);
      }
    });

    it('should fire the onSelect handler with the selected item on enter', function () {
      const typeaheadEl = element.find('.typeahead');

      typeaheadEl.triggerHandler({
        type: 'keydown',
        keyCode: DOWN
      });

      typeaheadEl.triggerHandler({
        type: 'keydown',
        keyCode: ENTER
      });

      scope.$digest();

      sinon.assert.calledOnce(scope.onSelect);
      sinon.assert.calledWith(scope.onSelect, scope.items[0]);
    });

    it('should fire the onSelect handler with the selected item on tab', function () {
      const typeaheadEl = element.find('.typeahead');

      typeaheadEl.triggerHandler({
        type: 'keydown',
        keyCode: DOWN
      });

      typeaheadEl.triggerHandler({
        type: 'keydown',
        keyCode: TAB
      });

      scope.$digest();

      sinon.assert.calledOnce(scope.onSelect);
      sinon.assert.calledWith(scope.onSelect, scope.items[0]);
    });

    it('should select the option on hover', function () {
      const hoverIndex = 0;
      element.find('.typeahead-item').eq(hoverIndex).triggerHandler('mouseenter');

      scope.$digest();

      expect(element.find('.typeahead-item.active').length).to.be(1);
      expect(element.find('.typeahead-item').eq(hoverIndex).hasClass('active')).to.be(true);
    });

    it('should fire the onSelect handler with the selected item on click', function () {
      const clickIndex = 1;
      const clickEl = element.find('.typeahead-item').eq(clickIndex);
      clickEl.triggerHandler('mouseenter');
      clickEl.triggerHandler('click');

      scope.$digest();

      sinon.assert.calledOnce(scope.onSelect);
      sinon.assert.calledWith(scope.onSelect, scope.items[clickIndex]);
    });

    it('should update the list when the items change', function () {
      scope.items = ['qux'];
      scope.$digest();
      expect(expect(element.find('.typeahead-item').length).to.be(scope.items.length));
    });

    it('should default to showing the item itself in the list', function () {
      scope.items.forEach((item, i) => {
        expect(element.find('kbn-typeahead-item').eq(i).html()).to.be(item);
      });
    });

    it('should use a custom template if specified to show the item in the list', function () {
      scope.items = [{
        label: 'foo',
        value: 1
      }];
      scope.itemTemplate = '<div class="label">{{item.label}}</div>';
      scope.$digest();
      expect(element.find('.label').html()).to.be(scope.items[0].label);
    });
  });
});
