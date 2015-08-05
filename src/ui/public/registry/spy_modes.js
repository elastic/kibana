define(function (require) {
  return require('ui/registry/_registry')({
    name: 'visTypes',
    index: ['name'],
    order: ['order']
  });
});
