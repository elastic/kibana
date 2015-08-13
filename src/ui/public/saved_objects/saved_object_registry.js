define(function (require) {
  return require('ui/registry/_registry')({
    name: 'savedObjects',
    index: ['loaderProperties.name'],
    order: ['loaderProperties.name']
  });
});
