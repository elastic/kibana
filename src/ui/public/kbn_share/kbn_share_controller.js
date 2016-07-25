import { capitalize, isArray, isFunction, result } from 'lodash';

export default function kbnShareControllerFactory($compile, kbnShare, Notifier) {
  const notify = new Notifier({
    location: 'Sharing'
  });

  return class KbnShareController {
    constructor(options) {
      if (options instanceof KbnShareController) {
        return options;
      }
      this._decaying = [];
      this.currentKey = null;

      this.setItems = this.setItems.bind(this);
      this.setItems(kbnShare.getItems());

      this._decaying.push(
        kbnShare.onItemsChange(this.setItems)
      );
    }

    setItems(items) {
      this.menuItemsMap = items;
      this.menuItems = [...items.values()];
      this._render();
    }

    // change the current key and rerender
    setCurrent(key = null) {
      if (key && !this.menuItemsMap.has(key)) {
        throw new TypeError(`KbnShare: unknown template key "${key}"`);
      }
      this.currentKey = key;
      this._render();
    }

    // little usability helpers
    getCurrent() { return this.currentKey; }
    hasCurrent() { return this.getCurrent() !== null; }
    isCurrent(key) { return this.getCurrent() === key; }
    open(key) { this.setCurrent(key); }
    close(key) { (!key || this.isCurrent(key)) && this.setCurrent(null); }
    toggle(key) { this.setCurrent(this.isCurrent(key) ? null : key); }

    isVisible(item) {
      if (this.hasCurrent()) {
        return this.getCurrent() === item.key;
      }
      if (item.$scope && item.$scope.$$destroyed) {
        return false;
      }
      if (typeof item.isVisible === 'function') {
        return item.isVisible();
      }
      return true;
    }

    // enable actual rendering
    _link($scope, $element) {
      this.$element = $element;
      this.$scope = $scope;
      this.$scope.$on('$destroy', () => {
        this._decaying.forEach(destroy => destroy());
      });
      this._render();
    }

    // render the current template to the $element if possible
    // function is idempotent
    _render() {
      const kbnShareCtrl = this;
      const {
        $scope,
        $element,
        rendered,
        currentKey,
        menuItemsMap
      } = this;

      if (!$scope || !$element) {
        return; // we can't render
      }

      if (rendered) {
        if (rendered.key === currentKey) { // old render still fresh, keep it
          return;
        }
        // we have an outdated rendering, destroy it
        rendered.$childScope.$destroy();
        rendered.$el.remove();
        this.rendered = null;
      }

      const actionItem = currentKey && menuItemsMap.get(currentKey);
      if (!actionItem) { // sanity
        return;
      }
      if (actionItem.template) { // nothing to render
        render();
      } else if (actionItem.action) {
        const actionResult = actionItem.action();
        if (!actionResult || !actionResult.then) {
          close(); return;
        }
        actionResult.then(close);
        actionResult.catch(notify.error).then(close);
      }

      function render() {
        const $childScope = $scope.$new();
        const $el = $element.find('#share-ui-template').html(actionItem.template).contents();

        $compile($el)($childScope);

        kbnShareCtrl.rendered = { $childScope, $el, key: currentKey };
      }

      function close() {
        kbnShareCtrl.close();
        kbnShareCtrl.$scope.kbnTopNav.close();
      }
    }
  };
}
