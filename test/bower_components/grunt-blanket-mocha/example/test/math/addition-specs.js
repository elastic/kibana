define([
    "src/math/addition"
], function(
    Math
){

    describe("Addition test", function() {
       
        it("should add five to positive numbers", function() {
            expect(Math.addFive(2)).to.equal(7);  
        });

        it("should add seven to positive numbers", function() {
            expect(Math.addSeven(2)).to.equal(9);
        });
        
    });
    
});