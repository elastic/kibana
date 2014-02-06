//simple_json_reporter
(function (){

    var body = document.body;

    var appendHtml = function (el, str) {
        var div = document.createElement('div');
        div.innerText = str;
        el.appendChild(div);
    };

    blanket.customReporter= function(coverageData){
        appendHtml(body, JSON.stringify(coverageData,null,"\t"));
    };
})();