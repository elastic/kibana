define(function (require) {
  return function sankeyHandler(Private) {
    var Handler = Private(require('ui/vislib/lib/handler/handler'));
    var Data = Private(require('ui/vislib/lib/data'));

    return function (vis) {
      var data = new Data(vis.data, vis._attr);

      var sankeyHandler = new Handler(vis, {
        data: data
      });

      return sankeyHandler;
    };
  };
});
