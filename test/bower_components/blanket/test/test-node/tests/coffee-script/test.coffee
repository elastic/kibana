sampleTest = require("../../fixture/src/sample.coffee")
assert = require("assert")
describe "require test", ->
  it "should return 10", ->
    assert.equal 10, sampleTest()