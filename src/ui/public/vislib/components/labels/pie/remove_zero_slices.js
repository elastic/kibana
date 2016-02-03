import _ from 'lodash';
define(function (require) {

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
