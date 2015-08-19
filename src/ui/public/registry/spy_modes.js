define(function (require) {
  return require('ui/registry/_registry')({
    name: 'spyModes',
    index: ['name'],
    order: ['order']
  });
});
