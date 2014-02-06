define([
    "node_modules/chai/chai",
    "test/test-suite"

], function(
    chai
){
    "use strict";

    chai.Assertion.includeStack = true;

    // http://chaijs.com/api/bdd/
    window.expect = chai.expect;


    return {
        start: function() {
            // Once dependencies have been loaded using RequireJS, go ahead and run the tests...
            mocha.run();
        }
    };

});