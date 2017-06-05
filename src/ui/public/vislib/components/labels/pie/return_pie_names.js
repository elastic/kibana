define(function () {
  return function ReturnPieNames() {
    return function returnNames(array, index, columns) {
      const names = [];

      array.forEach(function (obj) {
        names.push({ key: obj.name, index: index });

        if (obj.children) {
          returnNames(obj.children, (index + 1), columns).forEach(function (namedObj) {
            names.push(namedObj);
          });
        }
      });

      return names;
    };
  };
});
