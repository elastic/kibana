define([

], function(){

    var subtractThree = function(subtractFrom) {
        return subtractFrom - 3;
    };
    
    var subtractFive = function(subtractFrom) {
        return subtractFrom - 5;
    };

    var subtractSeven = function(subtractFrom) {
        return subtractFrom - 7;
    };
    
    return {
        subtractThree: subtractThree,
        subtractFive: subtractFive,
        subtractSeven: subtractSeven
    }
    
});