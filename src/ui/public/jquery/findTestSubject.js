module.exports = function bindToJquery($) {

  /**
   * Find elements with the `data-test-subj` attribute by the terms in that attribute.
   *
   * Find all of the element inside $el with the "saveButton" subject.
   *
   * ```js
   * var $button = $el.findTestSubject('saveButton');
   * ```
   *
   * Find all of the elements with either "saveButton" or "cancelButton"
   *
   * ```js
   * var $buttons = $.findTestSubject('saveButton', 'cancelButton');
   * ```
   *
   * Find all of the elements with a subject that decent from another subject
   *
   * ```js
   * var $button = $.findTestSubject('savedObjectForm saveButton');
   * ```
   *
   * Find all of the elements which have both subjects
   *
   * ```js
   * var $input = $.findTestSubject('smallButton&saveButton');
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

    subjectSelectors.forEach(function (subjects) {
      var selector = subjects.split(/\s+/).map(function (subject) {
        return '[data-test-subj~="' + subject + '"]';
      }).join(' ');

      $els = $els.add($context.find(selector));
    });

    return $els;
  };

};
