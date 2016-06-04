import _ from 'lodash';
const registry = {};

export default {
  register: function (stringObj) {
    _.defaultsDeep(registry, stringObj);
  },
  all: function () {
    return registry;
  }
};
