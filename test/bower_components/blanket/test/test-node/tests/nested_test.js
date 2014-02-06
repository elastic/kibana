

var test1 = require("../fixture/test/testA");
var assert = require("assert");


describe('nested test', function(){
    it('should return 7', function(){
        assert.equal(7, test1);
    });
});

