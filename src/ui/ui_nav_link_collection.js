import _ from 'lodash';
import UiNavLink from './ui_nav_link';
import Collection from '../utils/Collection';

let inOrderCache = Symbol('inOrder');

module.exports = class UiNavLinkCollection extends Collection {

  constructor(uiExports, parent) {
    super();
    this.uiExports = uiExports;
  }

  new(spec) {
    let link = new UiNavLink(this.uiExports, spec);
    this[inOrderCache] = null;
    this.add(link);
    return link;
  }

  get inOrder() {
    if (!this[inOrderCache]) {
      this[inOrderCache] = _.sortBy([...this], 'order');
    }

    return this[inOrderCache];
  }

};
