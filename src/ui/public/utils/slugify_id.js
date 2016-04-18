define(function (require) {
  let _ = require('lodash');
  return function (id) {
    if (id == null) return;

    let trans = {
      '/' : '-slash-',
      '\\?' : '-questionmark-',
      '\\&' : '-ampersand-',
      '=' : '-equal-'
    };
    _.each(trans, function (val, key) {
      let regex = new RegExp(key, 'g');
      id = id.replace(regex, val);
    });
    id = id.replace(/[\s]+/g, '-');
    id = id.replace(/[\-]+/g, '-');
    return id;
  };
});
