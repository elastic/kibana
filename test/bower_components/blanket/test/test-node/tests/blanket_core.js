/*  core test to lib/blanket.js  */

var assert = require("assert"),
    blanketCore = require("../../../src/blanket").blanket,
    falafel = require("falafel"),
    core_fixtures = require("../fixture/core_fixtures");


function normalizeWhitespace(str) {
  return str.replace(/\r\n/g, '\n')
            .replace(/\r/g, '\n')
            .replace(/\s+\n/g, '\n')
            .replace(/\n\s+/g, '\n');
}

function assertString(actual, expected) {
  assert.equal(normalizeWhitespace(actual), normalizeWhitespace(expected));
}

describe('tracking', function(){
    
    describe('tracking setup', function(){
        it('should return tracking setup', function(){
            var expectedSource = "if (typeof _$jscoverage === 'undefined') _$jscoverage = {};\n";
              expectedSource += "if (typeof _$jscoverage['test.js'] === 'undefined'){_$jscoverage['test.js']=[];\n";
              expectedSource += "_$jscoverage['test.js'].source=['var test=\'1234\';',\n";
              expectedSource += "'//comment',\n";
              expectedSource += "'console.log(test);'];\n";
              expectedSource += "}";
            var filename = "test.js";
            var sourceArray = [
                "var test='1234';",
                "//comment",
                "console.log(test);"
                ];

            var result = blanketCore._trackingSetup(filename,sourceArray);
            assertString(result,expectedSource);
        });
    });
    describe('source setup', function(){
        it('should return source setup', function(){
            var source = core_fixtures.simple_test_file_js;

            var expectedSource= [
                "//this is test source",
                "var test=\\'1234\\';",
                "if (test === \\'1234\\')",
                "  console.log(true);",
                "//comment",
                "console.log(test);"
                ];

            var result = blanketCore._prepareSource(source);
            assertString(result.toString(),expectedSource.toString());
        });
    });
    describe('add tracking', function(){
        it('should add tracking lines', function(){
            var fname="simple_test_file.js";
            var result = falafel(
                  core_fixtures.simple_test_file_js,
                  {loc:true,comment:true},
                  blanketCore._addTracking(fname),fname );
            assertString(result.toString(),
                core_fixtures.simple_test_file_instrumented_js);
            
        });
    });
    
    describe('detect single line ifs', function(){
        it('should wrap with block statement', function(){
            var fname="blockinjection_test_file.js";
            var result = falafel(
                  core_fixtures.blockinjection_test_file_js,
                  {loc:true,comment:true},
                  blanketCore._addTracking(fname), fname);
            
            assertString(result.toString(),
                core_fixtures.blockinjection_test_file_instrumented_js);
            
        });
    });
});


describe('blanket instrument', function(){
  describe('instrument file', function(){
    it('should return instrumented file', function(done){
        blanketCore.instrument({
          inputFile: core_fixtures.simple_test_file_js,
          inputFileName: "simple_test_file.js"
        },function(result){
          assertString(result,
            core_fixtures.simple_test_file_instrumented_full_js);
          done();
        });
    });
  });
  
  describe('instrument tricky if block', function(){
    it('should return properly instrumented string', function(done){
        var expected = 4;
        var infile = "var a=3;if(a==1)a=2;else if(a==3){a="+expected+";}result=a;";
        var infilename= "testfile2";

        blanketCore.instrument({
          inputFile: infile,
          inputFileName: infilename
        },function(result){
          assert.equal(eval("(function test(){"+result+" return result;})()"),expected);
          done();
        });
    });
  });
  describe('instrument labelled block', function(){
    it('should return properly instrumented string', function(done){
        var expected = 9;
        var infile = "function aFunc(max) {\nvar ret=0; rows: for (var i = 0; i < max--; i++) {\n ret=i; if (i == 9) {\n break rows;\n}\n}\n return ret;}\n ";
        var infilename= "label_test";

        blanketCore.instrument({
          inputFile: infile,
          inputFileName: infilename
        },function(result){
          eval(result);
          assert.equal(aFunc(20),expected);
          done();
        });
    });
  });
});

describe('test events', function(){
  describe('run through events', function(){
    it('should output correct stats', function(done){
        var testReporter = function(result){
          assert.equal(result.instrumentation,"blanket");
          done();
        };
        blanketCore.options("reporter",testReporter);
        blanketCore.setupCoverage();
        blanketCore.onModuleStart();
        blanketCore.onTestStart();
        blanketCore.onTestDone();
        blanketCore.onTestsDone();
    });
  });
 });

describe('redfinition', function(){
  describe('when coverage variable redined in code', function(){
    it('should output error', function(){
        var infile = "_$jscoverage=null;";
        var infilename= "testfile1";
        assert.throws(
          function(){
            blanketCore.instrument({
              inputFile: infile,
              inputFileName: infilename
            },function(result){
              assert.fail(false,true,"shouldn't get here.");
            });
          },
          /Instrumentation error, you cannot redefine the coverage variable/
        );
    });
  });
 });
 
