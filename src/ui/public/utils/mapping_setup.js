import angular from 'angular';
import _ from 'lodash';

// eslint-disable-next-line @elastic/kibana-custom/no-default-export
export default function MappingSetupService() {
  const mappingSetup = this;

  const json = {
    _serialize: function (val) {
      if (val != null) return angular.toJson(val);
    },
    _deserialize: function (val) {
      if (val != null) return JSON.parse(val);
    }
  };

  mappingSetup.expandShorthand = function (sh) {
    return _.mapValues(sh || {}, function (val) {
      // allow shortcuts for the field types, by just setting the value
      // to the type name
      if (typeof val === 'string') val = { type: val };

      if (val.type === 'json') {
        val.type = 'text';
        val._serialize = json._serialize;
        val._deserialize = json._deserialize;
      }

      return val;
    });
  };
}
