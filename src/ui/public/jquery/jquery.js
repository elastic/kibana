const jQuery = require('../../../../node_modules/jquery/dist/jquery');
const findTestSubject = require('./find_test_subject');

window.jQuery = window.$ = jQuery;
findTestSubject.bindToJquery(jQuery);

module.exports = jQuery;
