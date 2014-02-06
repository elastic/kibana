define([
    "src/spelling/plurals"
], function(
    Plurals
){

    describe("Plurals test", function() {
       
        it("should not pluralize 1 cat", function() {
            expect(Plurals.cat(1 ) ).to.equal("1 cat");  
        });

        it("should not pluralize 2 cats", function() {
            expect(Plurals.cat(2) ).to.equal("2 cats");
        });
        
    });
    
});