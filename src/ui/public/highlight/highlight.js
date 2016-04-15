import 'ui/highlight/highlight_tags';
import _ from 'lodash';
import angular from 'angular';
import uiModules from 'ui/modules';

let module = uiModules.get('kibana');

module.filter('highlight', function (highlightTags) {
  return function (formatted, highlight) {
    if (typeof formatted === 'object') formatted = angular.toJson(formatted);

    _.each(highlight, function (section) {
      section = _.escape(section);

      // Strip out the highlight tags to compare against the formatted string
      let untagged = section
        .split(highlightTags.pre).join('')
        .split(highlightTags.post).join('');

      // Replace all highlight tags with proper html tags
      let tagged = section
        .split(highlightTags.pre).join('<mark>')
        .split(highlightTags.post).join('</mark>');

      // Replace all instances of the untagged string with the properly tagged string
      formatted = formatted.split(untagged).join(tagged);
    });

    return formatted;
  };
});
