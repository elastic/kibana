
var sampleTest = function(x){
	return x === 10 ? "ten" : "not ten";
};

var sampleTest2 = function(x){
    return x === 5 ? "five" : "not five";
};

var sampleTest3 = function(x){
    return x > 5 ? x < 10 ? "5-10" : "greater than ten" : "less than five";
};

var sampleTest4 = function(x){
    return x === 5 ? "five" : "not five";
};

var sampleTest5 = function(x){
    return x === 5 ? "five" : "not five";
};

var sampleTest6 = function(x){
    return x === 5 ?
    "five" :
    "not five";
};

var sampleTest7 = function(x){
    return x > 5 ?
    x > 10 ? x > 15 ?
    "greater than 15": x > 12 ?
    x > 13 ? "greater than 13" : "13" : "less than 12" :x > 7 ? "greater than 7" :
    "less than 7":"less than five";
};

var sampleTest8 = function(x){
    return (x > 5 ?
    (x > 10 ? (x > 15 ?
    "greater than 15": (x > 12 ?
    (x > 13 ? "greater than 13" : "13") : "less than 12")) :x > 7 ? "greater than 7" :
    "less than 7"):"less than five");
};