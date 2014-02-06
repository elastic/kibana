var extend = require("xtend"),
    join = require('path').join;

var blanketNode = function (userOptions,cli){

    var fs = require("fs"),
        path = require("path"),
        configPath = process.cwd() + '/package.json',
        file = fs.existsSync(configPath) ? JSON.parse((fs.readFileSync(configPath, 'utf8')||{})) : {},
        packageConfigs = file.scripts &&
                        file.scripts.blanket,
        blanketConfigs = packageConfigs ? extend(file.scripts.blanket,userOptions) : userOptions,
        pattern = blanketConfigs  ?
                          blanketConfigs.pattern :
                          "src",
        blanket = require("./blanket").blanket,
        oldLoader = require.extensions['.js'],
        newLoader;

    if (cli && !packageConfigs){
        throw new Error("Options must be provided for Blanket in your package.json");
    }
    function escapeRegExp(str) {
        return str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");
    }
    if (blanketConfigs){
        var newOptions={};
        Object.keys(blanketConfigs).forEach(function (option) {
            var optionValue = blanketConfigs[option];
            if(option === "data-cover-only" || option === "pattern"){
                newOptions.filter = optionValue;
            }
            if(option === "data-cover-never"){
                newOptions.antifilter = optionValue;
            }
            if (option === "data-cover-loader" || option === "loader"){
                newOptions.loader = optionValue;
            }
            if (option === "data-cover-timeout"){
                newOptions.timeout = optionValue;
            }
            if (option === "onlyCwd" && !!optionValue){
                newOptions.cwdRegex = new RegExp("^" + escapeRegExp(process.cwd()), "i");
            }
            if (option === "data-cover-customVariable"){
                newOptions.customVariable = optionValue;
            }
            if (option === "data-cover-flags"){
                newOptions.order = !optionValue.unordered;
                newOptions.ignoreScriptError = !!optionValue.ignoreError;
                newOptions.autoStart = !!optionValue.autoStart;
                newOptions.branchTracking = !!optionValue.branchTracking;
                newOptions.debug = !!optionValue.debug;
                newOptions.engineOnly = !!optionValue.engineOnly;
            }
        });
        blanket.options(newOptions);
    }

    //helper functions
    blanket.normalizeBackslashes = function (str) {
        return str.replace(/\\/g, '/');
    };

    blanket.restoreNormalLoader = function () {
      if (!blanket.options("engineOnly")){
        newLoader = require.extensions['.js'];
        require.extensions['.js'] = oldLoader;
      }
    };

    blanket.restoreBlanketLoader = function () {
      if (!blanket.options("engineOnly")){
        require.extensions['.js'] = newLoader;
      }
    };

    //you can pass in a string, a regex, or an array of files
    blanket.matchPattern = function (filename,pattern){
        var cwdRegex = blanket.options("cwdRegex");
        if (cwdRegex && !cwdRegex.test(filename)){
            return false;
        }
        if (typeof pattern === 'string'){
            if (pattern.indexOf("[") === 0){
                    //treat as array
                var pattenArr = pattern.slice(1,pattern.length-1).split(",");
                return pattenArr.some(function(elem){
                    return blanket.matchPattern(filename,blanket.normalizeBackslashes(elem.slice(1,-1)));
                });
            }else if ( pattern.indexOf("//") === 0){
                var ex = pattern.slice(2,pattern.lastIndexOf('/'));
                var mods = pattern.slice(pattern.lastIndexOf('/')+1);
                var regex = new RegExp(ex,mods);
                return regex.test(filename);
            }else{
                return filename.indexOf(blanket.normalizeBackslashes(pattern)) > -1;
            }
        }else if ( pattern instanceof Array ){
            return pattern.some(function(elem){
                return filename.indexOf(blanket.normalizeBackslashes(elem)) > -1;
            });
        }else if (pattern instanceof RegExp){
            return pattern.test(filename);
        }else if (typeof pattern === 'function'){
            return pattern(filename);
        }else{
            throw new Error("Bad file instrument indicator.  Must be a string, regex, function, or array.");
        }
    };
    if (!blanket.options("engineOnly")){
        //instrument js files
        require.extensions['.js'] = function(localModule, filename) {
            var pattern = blanket.options("filter");
            var originalFilename = filename;
            filename = blanket.normalizeBackslashes(filename);

            //we check the never matches first
            var antipattern = _blanket.options("antifilter");
            if (typeof antipattern !== "undefined" &&
                    blanket.normalizeBackslashes(filename.replace(/\.js$/,""),antipattern)
                ){
                oldLoader(localModule,filename);
                if (_blanket.options("debug")) {console.log("BLANKET-File will never be instrumented:"+filename);}
            }else if (blanket.matchPattern(filename,pattern)){
                if (_blanket.options("debug")) {console.log("BLANKET-Attempting instrument of:"+filename);}
                var content = fs.readFileSync(filename, 'utf8');
                blanket.instrument({
                    inputFile: content,
                    inputFileName: filename
                },function(instrumented){
                    var baseDirPath = blanket.normalizeBackslashes(path.dirname(filename))+'/.';
                    try{
                        instrumented = instrumented.replace(/require\s*\(\s*("|')\./g,'require($1'+baseDirPath);
                        localModule._compile(instrumented, originalFilename);
                    }
                    catch(err){
                        if (_blanket.options("ignoreScriptError")){
                            //we can continue like normal if
                            //we're ignoring script errors,
                            //but otherwise we don't want
                            //to completeLoad or the error might be
                            //missed.
                            if (_blanket.options("debug")) {console.log("BLANKET-There was an error loading the file:"+filename);}
                            oldLoader(localModule,filename);
                        }else{
                            throw new Error("BLANKET-Error parsing instrumented code: "+err);
                        }
                    }
                });
            }else{
                oldLoader(localModule, originalFilename);
            }
        };
    }
    //if a loader is specified, use it
    if (blanket.options("loader")){
        require(blanket.options("loader"))(blanket);
    }
    newLoader = require.extensions['.js'];
    return blanket;
};

if ((process.env && process.env.BLANKET_COV===1) ||
    (process.ENV && process.ENV.BLANKET_COV)){
    module.exports = blanketNode({engineOnly:true},false);
}else{
    var args = process.argv;
    if (args[0] === 'node' &&
        args[1].indexOf(join('node_modules','mocha','bin')) > -1 &&
        (args.indexOf('--require') > 1 || args.indexOf('-r') > -1) &&
         args.indexOf('blanket') > 2){
        //using mocha cli
        module.exports = blanketNode(null,true);
    }else{
        //not mocha cli
        module.exports = function(options){
            //we don't want to expose the cli option.
            return blanketNode(options,false);
        };
    }
}





