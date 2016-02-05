define(function (require) {
  return require('ui/registry/_registry')({
    name: 'navbarExtensions',
    index: ['name'],
    group: ['appName'],
    order: ['order']
  });
});
