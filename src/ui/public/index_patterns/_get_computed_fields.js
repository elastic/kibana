import _ from 'lodash';
// Takes a hit, merges it with any stored/scripted fields, and with the metaFields
// returns a flattened version
export default function () {
  let self = this;
  let scriptFields = {};
  let fielddataFields = [];

  fielddataFields = _.pluck(self.fields.byType.date, 'name');

  _.each(self.getScriptedFields(), function (field) {
    scriptFields[field.name] = {
      script: {
        script: field.script,
        lang: field.lang
      }
    };
  });

  return {
    storedFields: ['*'],
    _source: true,
    scriptFields: scriptFields,
    fielddataFields: fielddataFields
  };

};
