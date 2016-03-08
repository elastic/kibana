
export function bindProtoMethods(object, prototype = object.constructor.prototype) {
  Object.getOwnPropertyNames(prototype).forEach(key => {
    const value = object[key];

    // don't overwrite the object's constructor
    if (key === 'constructor') return;

    // we can only bind functions
    if (typeof value !== 'function') return;

    object[key] = (...args) => value.apply(object, args);
  });
}
