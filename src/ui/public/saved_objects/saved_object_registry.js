define(function (require) {
  return require('ui/registry/_registry')({
    name: 'savedObjects',
    index: ['name'],
    order: ['name']
  });
});
