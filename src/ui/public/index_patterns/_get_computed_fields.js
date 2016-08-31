import _ from 'lodash';
// Takes a hit, merges it with any stored/scripted fields, and with the metaFields
// returns a flattened version
export default function () {
  let self = this;
  let scriptFields = {};
  let docvalueFields = [];

  docvalueFields = _.map(_.reject(self.fields.byType.date, 'scripted'), 'name');

  _.each(self.getScriptedFields(), function (field) {
    scriptFields[field.name] = {
      script: {
        inline: field.script,
        lang: field.lang
      }
    };
  });

  return {
    storedFields: ['*'],
    _source: true,
    scriptFields: scriptFields,
    docvalueFields: docvalueFields
  };

};
