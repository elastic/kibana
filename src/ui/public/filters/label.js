define(function (require) {
  require('ui/modules')
    .get('kibana')
    .filter('label', function () {
      return function (str) {
        var words = str.split(' ');
        return words.map(capFirst).join(' ');
      };
    });

  function capFirst(str) {
    var i = str[0];
    var r = new RegExp(i, 'i');
    return str.replace(r, i.toUpperCase());
  }
});