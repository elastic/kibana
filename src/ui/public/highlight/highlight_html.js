import _ from 'lodash';
import angular from 'angular';
import { highlightTags } from './highlight_tags';
import { htmlTags } from './html_tags';

export function getHighlightHtml(fieldValue, highlights) {
  let highlightHtml = (typeof fieldValue === 'object')
    ? angular.toJson(fieldValue)
    : fieldValue;

  _.each(highlights, function (highlight) {
    const escapedHighlight = _.escape(highlight);

    // Strip out the highlight tags to compare against the field text
    const untaggedHighlight = escapedHighlight
      .split(highlightTags.pre).join('')
      .split(highlightTags.post).join('');

    // Replace all highlight tags with proper html tags
    const taggedHighlight = escapedHighlight
      .split(highlightTags.pre).join(htmlTags.pre)
      .split(highlightTags.post).join(htmlTags.post);

    // Replace all instances of the untagged string with the properly tagged string
    highlightHtml = highlightHtml.split(untaggedHighlight).join(taggedHighlight);
  });

  return highlightHtml;
}
