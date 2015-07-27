define(function (require) {
  var modules = require('ui/modules');
  var _ = require('lodash');

  modules.get('kibana/persisted_log')
  .factory('PersistedLog', function ($window, localStorage) {
    function PersistedLog(name, options) {
      options = options || {};
      this.name = name;
      this.maxLength = options.maxLength || 0;
      this.filterDuplicates = options.filterDuplicates || false;
      this.items = localStorage.get(this.name) || [];
    }

    PersistedLog.prototype.add = function (val) {
      if (val == null) {
        return this.items;
      }

      var stack = this.items;

      // remove any matching items from the stack if option is set
      if (this.filterDuplicates) {
        stack = _.pull(this.items, val);
        stack = _.filter(stack, function (item) {
          return !_.isEqual(item, val);
        });
      }

      stack.unshift(val);

      // if maxLength is set, truncate the stack
      if (this.maxLength > 0) {
        stack = stack.slice(0, this.maxLength);
      }

      // persist the stack
      localStorage.set(this.name, stack);
      return this.items = stack;
    };

    PersistedLog.prototype.get = function () {
      return this.items;
    };

    return PersistedLog;
  });
});