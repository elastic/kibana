define([
    "src/math/subtraction"
], function(
    Math
){

    describe("Subtraction test", function() {
       
        it("should subtract five from positive numbers", function() {
            expect(Math.subtractFive(8)).to.equal(3);  
        });
        
    });
    
});