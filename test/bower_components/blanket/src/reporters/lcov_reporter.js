//lcov_reporter
(function (){
    //takes the option: toHTML {boolean}

    var body = document.body;

    var appendHtml = function ( filename,data,toHTML) {

        var str="";
        str += 'SF:' + filename + '\n';

        data.source.forEach(function(line, num) {
          // increase the line number, as JS arrays are zero-based
          num++;

          if (data[num] !== undefined) {
            str += 'DA:' + num + ',' + data[num] + '\n';
          }
       });

       str += 'end_of_record\n';
       if (toHTML){
            var div = document.createElement('div');
            div.className = "blanket_lcov_reporter";
            div.innerText = str;
            body.appendChild(div);
        }else{
            window._$blanket_LCOV = str;
        }
    };

    blanket.customReporter=function(coverageData,options){
        var toHTML=true;
        if (typeof options !== 'undefined' && typeof options.toHTML !== 'undefined'){
            toHTML = options.toHTML;
        }
        for (var filename in coverageData.files) {
          var data = coverageData.files[filename];
          appendHtml(filename,data,toHTML);
        }
    };
})();