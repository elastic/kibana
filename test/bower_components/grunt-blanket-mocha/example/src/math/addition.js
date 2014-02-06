define([

], function(){

    var addThree = function(addTo) {
        return addTo + 3;
    };
    
    var addFive = function(addTo) {
        return addTo + 5;
    };

    var addSeven = function(addTo) {
        return addTo + 7;
    };
    
    return {
        addThree: addThree,
        addFive: addFive,
        addSeven: addSeven
    }
    
});