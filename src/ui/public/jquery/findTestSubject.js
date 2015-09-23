module.exports = function bindToJquery($) {

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

  $.fn.findTestSubject = findTestSubject;
  $.findTestSubject = function () {
    return findTestSubject.apply($(document.body), arguments);
  };

};
