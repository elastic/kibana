

var test1 = function() {
    blanket.options("instrumentCache",true);
    blanket.options("debug",true);
    expect(2);
    var infile = "var a=1;if(a==1){a=2;}if(a==3){a=4;}console.log(a);";
    var infilename= "testfile";
    blanket.instrument({
        inputFile: infile,
        inputFileName: infilename
    },function(instrumented){
         ok( instrumented.length > infile.length, "instrumented." );
         ok(instrumented.indexOf("_$blanket['"+infilename+"']") > -1,"added enough instrumentation.");
     });
};

var test2 = function() {
    expect(1);
    blanket.options("instrumentCache",true);
    blanket.options("debug",true);
    var expected = 4,
        result;

    var infile = "var a=3;if(a==1){a=2;}else if(a==3){a="+expected+";}\nresult=a;";
    var infilename= "testfile2";
    blanket.instrument({
        inputFile: infile,
        inputFileName: infilename
    },function(instrumented){
        eval(instrumented);
         ok( result == expected, "instrumented properly." );
         
     });
};

var test3 = function() {
    expect(1);
    var result;
    blanket.options("instrumentCache",true);
    blanket.options("debug",true);
    var infile = "var arr=[]; result = window.alert ? (function() {\n for ( var key in arr ) {\n arr[ key ]=0; \n}return true; \n})() : false;";
    var infilename= "testfile3";
    blanket.instrument({
        inputFile: infile,
        inputFileName: infilename
    },function(instrumented){
        eval(instrumented);
         ok( result, "instrumented properly." );
         
     });
};

for (var i=0;i<1000;i++){
    test( "blanket instrument: "+i, test1);
    test( "blanket instrument elseif block: "+i, test2);
    test( "blanket instrument for in: "+i, test3);
}