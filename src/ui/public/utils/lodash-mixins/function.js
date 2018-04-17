export function lodashFunctionMixin(_) {
  _.mixin({

    /**
     * Call all of the function in an array
     *
     * @param  {array[functions]} arr
     * @return {undefined}
     */
    callEach: function (arr) {
      return _.map(arr, function (fn) {
        return _.isFunction(fn) ? fn() : undefined;
      });
    }

  });
}
