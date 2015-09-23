module.exports = function bindToJquery($) {

  /**
   * Find elements with the `data-test-subj` attribute by the terms in that attribute.
   *
   * ```js
   * // this
   * var $button = $('[data-test-subj~="saveButton"]');
   *
   * // becomes this
   * var $button = $.findTestSubject('saveButton');
   * ```
   *
   * Supports multiple subjects
   * ```js
   * // find any saveButton or cancelButton
   * var $buttons = $.findTestSubject('saveButton', 'cancelButton');
   * ```
   *
   * Supports subject "selectors"
   * ```js
   * // find any saveButton inside a savedObjectForm
   * var $button = $.findTestSubject('savedObjectForm saveButton');
   * ```
   *
   * Supports selecting compound subjects
   * ```js
   * // find any smallButton that is also a saveButton inside a savedObjectForm
   * var $input = $.findTestSubject('savedObjectForm smallButton&saveButton');
   * ```
   *
   * @return {jQueryCollection}
   */
  $.findTestSubject = function () {
    return findTestSubject.apply($(document.body), arguments);
  };

  /**
   * Just like $.findTestSubject, except only finds elements within another element.
   * @return {jQueryCollection}
   */
  $.fn.findTestSubject = findTestSubject;

  function findTestSubject(/* ...subjectSelectors */) {
    var subjectSelectors = [].slice.apply(arguments);
    var $els = $();
    var $context = this;

    subjectSelectors.forEach(function (subjectSelector) {
      var cssSelectors = [];
      var terms = subjectSelector
        .replace(/\s*&\s*/g, '&') // remove all whitespace around joins
        .split(/\s+/);

      function termToCssSelector(term) {
        return term ? '[data-test-subj~="' + term + '"]' : '';
      }

      while (terms.length) {
        var term = terms.shift();
        // split each term by joins/& and map to css selectors
        cssSelectors.push(term.split('&').map(termToCssSelector).join(''));
      }

      $els = $els.add($context.find(cssSelectors.join(' ')));
    });

    return $els;
  };

};
