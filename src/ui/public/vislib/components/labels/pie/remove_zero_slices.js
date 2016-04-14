define(function (require) {
  let _ = require('lodash');

  return function RemoveZeroSlices() {
    return function removeZeroSlices(slices) {
      if (!slices.children) return slices;

      slices = _.clone(slices);
      slices.children = slices.children.reduce(function (children, child) {
        if (child.size !== 0) { children.push(removeZeroSlices(child)); }
        return children;
      }, []);

      return slices;
    };
  };
});
