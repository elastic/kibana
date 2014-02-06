(function() {

    if(!YUI) {
        throw new Exception("YUI does not exist in global namespace!");
    }

    YUI.add('blanket', function (Y) {
        var TestRunner = Y.Test.Runner;

        TestRunner.subscribe(TestRunner.COMPLETE_EVENT,function(data){
            var res = data.results;
            blanket.onTestDone(res.total, res.failed === 0 && (res.passed+res.ignored) === res.total);
        });

        TestRunner.subscribe(TestRunner.BEGIN_EVENT,function(){
            blanket.setupCoverage();
        });

        TestRunner.subscribe(TestRunner.TEST_CASE_COMPLETE_EVENT,function(){
            blanket.onTestsDone();
        });

        TestRunner.subscribe(TestRunner.TEST_SUITE_BEGIN_EVENT,function(){
            blanket.onModuleStart();
        });

        TestRunner.subscribe(TestRunner.TEST_CASE_BEGIN_EVENT,function(){
            blanket.onTestStart();
        });
    },'0.0.1',{
        requires :['test']
    });
})();