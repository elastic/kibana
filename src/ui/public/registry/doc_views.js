import _ from 'lodash';
define(function (require) {
  return require('ui/registry/_registry')({
    name: 'docViews',
    index: ['name'],
    order: ['order'],
    constructor() {
      this.forEach(docView => {
        docView.shouldShow = docView.shouldShow || _.constant(true);
        docView.name = docView.name || docView.title;
      });
    }
  });
});
