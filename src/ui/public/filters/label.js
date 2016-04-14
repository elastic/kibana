define(function (require) {
  require('ui/modules')
    .get('kibana')
    .filter('label', function () {
      return function (str) {
        let words = str.split(' ');
        return words.map(capFirst).join(' ');
      };
    });

  function capFirst(str) {
    let i = str[0];
    let r = new RegExp(i, 'i');
    return str.replace(r, i.toUpperCase());
  }
});
