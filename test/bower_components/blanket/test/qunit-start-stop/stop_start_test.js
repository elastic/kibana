test( "stop start test", function() {   
    ok(ins_test(), "here");
    ok(ins_test(),"something else");
    ok(ins_test(),"another thing.");
    QUnit.start();
    QUnit.config.autostart = false;
});