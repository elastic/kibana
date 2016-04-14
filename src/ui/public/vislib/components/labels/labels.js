define(function (require) {
  return function LabelUtilService(Private) {
    let _ = require('lodash');

    let createArr = Private(require('ui/vislib/components/labels/data_array'));
    let getArrOfUniqLabels = Private(require('ui/vislib/components/labels/uniq_labels'));
    let getPieLabels = Private(require('ui/vislib/components/labels/pie/pie_labels'));

    /*
     * Accepts a Kibana data object and returns an array of unique labels (strings).
     * Extracts the field formatter from the raw object and passes it to the
     * getArrOfUniqLabels function.
     *
     * Currently, this service is only used for vertical bar charts and line charts.
     */
    return function (obj, chartType) {
      if (!_.isObject(obj)) { throw new TypeError('LabelUtil expects an object'); }
      if (chartType === 'pie') { return getPieLabels(obj); }
      return getArrOfUniqLabels(createArr(obj));
    };
  };
});
