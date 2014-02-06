YUI().use('test-module','test', function (Y) {
    var testCase = new Y.Test.Case({

        name: "TestModule",

        testUsingAsserts : function () {
            Y.assert(Y.testModule == 5, "The value should be five.");
        }
    });
    
    //add the test cases and suites
    Y.Test.Runner.add(testCase);
});