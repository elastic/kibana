import _ from 'lodash';
define(function (require) {
  return require('ui/registry/_registry')({
    name: 'chromeConfigControls',
    order: ['order'],
    index: ['name']
  });
});
