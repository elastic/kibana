(function() {

    function usageCoverage(){
        blanket.setupCoverage();
        showReporter();
        var currCov = window._$blanket ? copyObject(window._$blanket) : {};
        setInterval(function(){
            if (typeof window._$blanket !== "undefined" && hasChanged(currCov,window._$blanket)){
                updateReporter(window._$blanket);
                currCov = copyObject( window._$blanket);
            }
        },500);
    }

    

    var showReporter = function(){
        var coverageDiv = document.createElement("div");
        //styles
        coverageDiv.style.position = "fixed";
        coverageDiv.style.height = "10px;";
        coverageDiv.style.padding = "5px";
        coverageDiv.style.width = "100%";
        coverageDiv.style.opacity = 0.6;
        coverageDiv.style.backgroundColor = "#cccccc";
        coverageDiv.style.bottom = 0;
        coverageDiv.style.left = 0;

        coverageDiv.id = "blanket_reporter";
        coverageDiv.innerHTML = "<p style='font-weight:bold;float:left;padding-right:10px;'>BlanketJS Results:</p>";
        var coverageInfo = document.createElement("p");
        coverageInfo.id = "blanket_results";
        coverageInfo.style.float = "left";
        coverageInfo.style.cssText = coverageInfo.style.cssText + "padding-right:10px;";
        coverageDiv.appendChild(coverageInfo);

        var link = document.createElement("p");
        link.id = "resultsLink";
        link.style.fontStyle = "normal";
        link.style.textDecoration = "underline";
        link.style.cursor = "pointer";
        link.innerText = "See full results";

        coverageDiv.appendChild(link);
        document.body.appendChild(coverageDiv);

        document.getElementById("resultsLink").addEventListener("click",function(){
            blanket.onTestsDone();
            document.getElementById("blanket_reporter").style.display = "none";
        });

        if (window._$blanket){ updateReporter(window._$blanket); }
    };

    var updateReporter = function(data){
        var res = document.getElementById("blanket_results");
        var keys = Object.keys(data);

        var total =0, totalCovered=0;

        for(var i=0;i<keys.length;i++){
            //loop through files
            var file = data[keys[i]];
            var lineKeys = Object.keys(file);
            for(var j=0;j<lineKeys.length;j++){
                //loop through lines
                if (typeof file[lineKeys[j]] === "number"){
                    if (file[lineKeys[j]] > 0){
                        totalCovered++;
                    }
                    total++;
                }
            }
        }
        res.innerText = Math.round(totalCovered/total*100)+"% Covered";
    };

    var hasChanged = function(obj1,obj2){
        var keys1 = Object.keys(obj1);
        var keys2 = Object.keys(obj2);

        if (keys1.length !== keys2.length){
            return true;
        }

        var i=0,done=false;
        while(i<keys1.length && !done){
            if (obj1[keys1[i]].toString() !== obj2[keys1[i]].toString()){
                done = true;
            }
            i++;
        }
        return done;
    };

    var copyObject = function(obj){
        var newObj = {};

        var keys = Object.keys(obj);
        for (var i=0;i<keys.length;i++){
            newObj[keys[i]]=obj[keys[i]].slice(0);
        }
        return newObj;
    };
    setTimeout(function(){
        blanket.beforeStartTestRunner({
            bindEvent:function(cb){
                cb.call(blanket);
            },
            callback:function(){
                usageCoverage();
            }
        });
    },1000);
})();