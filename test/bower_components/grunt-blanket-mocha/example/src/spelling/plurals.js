define([

], function(){

    var dog = function(howMany) {
        var ret;
        if (howMany < 0) {
            ret = "0 dogs";
        } else if (howMany === 1) {
            ret = "1 dog";
        } else {
            ret = "" + howMany + " dogs";
        }

        return ret;
    };
    
    var cat = function(howMany) {
        var ret;
        if (howMany < 0) {
            ret = "0 cats";
        } else if (howMany === 1) {
            ret = "1 cat";
        } else {
            ret = "" + howMany + " cats";
        } 
        
        return ret;
    };

    var fish = function(howMany) {
        return "" + howMany + " fish";               
    };
    
    return {
        cat: cat,
        fish: fish
    }
    
});