define(function (require) {
  return function (_) {

    // create a property descriptor for properties
    // that won't change
    function describeConst(val) {
      return {
        writable: false,
        enumerable: false,
        configurable: false,
        value: val
      };
    }

    const props = {
      inherits: describeConst(function (SuperClass) {

        const prototype = Object.create(SuperClass.prototype, {
          constructor: describeConst(this),
          superConstructor: describeConst(SuperClass)
        });

        Object.defineProperties(this, {
          prototype: describeConst(prototype),
          Super: describeConst(SuperClass)
        });

        return this;
      })
    };

    _.mixin(_, {

      /**
       * Add class-related behavior to a function, currently this
       * only attaches an .inherits() method.
       *
       * @param  {Constructor} ClassConstructor - The function that should be extended
       * @return {Constructor} - the constructor passed in;
       */
      class: function (ClassConstructor) {
        return Object.defineProperties(ClassConstructor, props);
      }
    });
  };
});
