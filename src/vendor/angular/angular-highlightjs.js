/*! angular-highlightjs
version: 0.5.1
build date: 2015-11-08
author: Chih-Hsuan Fan
https://github.com/pc035860/angular-highlightjs.git */

(function (root, factory) {
  if (typeof exports === "object" || (typeof module === "object" && module.exports)) {
    module.exports = factory(require("angular"), require("highlight.js"));
  } else if (typeof define === "function" && define.amd) {
    define(["angular", "hljs"], factory);
  } else {
    root.returnExports = factory(root.angular, root.hljs);
  }
}(this, function (angular, hljs) {

/*global angular, hljs*/

function shouldHighlightStatics(attrs) {
  var should = true;
  angular.forEach([
    'source', 'include'
  ], function (name) {
    if (attrs[name]) {
      should = false;
    }
  });
  return should;
}

var ngModule = angular.module('hljs', []);

/**
 * hljsService service
 */
ngModule.provider('hljsService', function () {
  var _hljsOptions = {};

  return {
    setOptions: function (options) {
      angular.extend(_hljsOptions, options);
    },
    getOptions: function () {
      return angular.copy(_hljsOptions);
    },
    $get: function () {
      (hljs.configure || angular.noop)(_hljsOptions);
      return hljs;
    }
  };
});

/**
 * hljsCache service
 */
ngModule.factory('hljsCache', ["$cacheFactory", function ($cacheFactory) {
  return $cacheFactory('hljsCache');
}]);

/**
 * HljsCtrl controller
 */
ngModule.controller('HljsCtrl', 
["hljsCache", "hljsService", "$interpolate", "$window", "$log", function HljsCtrl (hljsCache, hljsService, $interpolate, $window, $log) {
  var ctrl = this;

  var _elm = null,
      _lang = null,
      _code = null,
      _interpolateScope = false,
      _stopInterpolateWatch = null,
      _hlCb = null;

  var RE_INTERPOLATION_STR = escapeRe($interpolate.startSymbol()) +
    '((.|\\s)+?)' + escapeRe($interpolate.endSymbol());

  var INTERPOLATION_SYMBOL = '∫';

  ctrl.init = function (codeElm) {
    _elm = codeElm;
  };

  ctrl.setInterpolateScope = function (scope) {
    _interpolateScope = scope;

    if (_code) {
      ctrl.highlight(_code);
    }
  };

  ctrl.setLanguage = function (lang) {
    _lang = lang;

    if (_code) {
      ctrl.highlight(_code);
    }
  };

  ctrl.highlightCallback = function (cb) {
    _hlCb = cb;
  };

  ctrl._highlight = function (code) {
    if (!_elm) {
      return;
    }

    var res, cacheKey, interpolateData;

    _code = code;  // preserve raw code

    if (_interpolateScope) {
      interpolateData = extractInterpolations(code);
      code = interpolateData.code;
    }

    if (_lang) {
      // cache key: language, scope, code
      cacheKey = ctrl._cacheKey(_lang, !!_interpolateScope, code);
      res = hljsCache.get(cacheKey);

      if (!res) {
        res = hljsService.highlight(_lang, hljsService.fixMarkup(code), true);
        hljsCache.put(cacheKey, res);
      }
    }
    else {
      // cache key: scope, code
      cacheKey = ctrl._cacheKey(!!_interpolateScope, code);
      res = hljsCache.get(cacheKey);

      if (!res) {
        res = hljsService.highlightAuto(hljsService.fixMarkup(code));
        hljsCache.put(cacheKey, res);
      }
    }

    code = res.value;

    if (_interpolateScope) {
      (_stopInterpolateWatch||angular.noop)();

      if (interpolateData) {
        code = recoverInterpolations(code, interpolateData.tokens);
      }

      var interpolateFn = $interpolate(code);
      _stopInterpolateWatch = _interpolateScope.$watch(interpolateFn, function (newVal, oldVal) {
        if (newVal !== oldVal) {
          _elm.html(newVal);
        }
      });
      _elm.html(interpolateFn(_interpolateScope));
    }
    else {
      _elm.html(code);
    }

    // language as class on the <code> tag
    _elm.addClass(res.language);

    if (_hlCb !== null && angular.isFunction(_hlCb)) {
      _hlCb();
    }
  };
  ctrl.highlight = debounce(ctrl._highlight, 17);

  ctrl.clear = function () {
    if (!_elm) {
      return;
    }
    _code = null;
    _elm.text('');
  };

  ctrl.release = function () {
    _elm = null;
    _interpolateScope = null;
    (_stopInterpolateWatch||angular.noop)();
    _stopInterpolateWatch = null;
  };

  ctrl._cacheKey = function () {
    var args = Array.prototype.slice.call(arguments),
        glue = "!angular-highlightjs!";
    return args.join(glue);
  };


  // http://davidwalsh.name/function-debounce
  function debounce(func, wait, immediate) {
    var timeout;
    return function() {
      var context = this, args = arguments;
      var later = function() {
        timeout = null;
        if (!immediate) {
          func.apply(context, args);
        }
      };
      var callNow = immediate && !timeout;
      $window.clearTimeout(timeout);
      timeout = $window.setTimeout(later, wait);
      if (callNow) {
        func.apply(context, args);
      }
    };
  }

  // Ref: http://stackoverflow.com/questions/3115150/how-to-escape-regular-expression-special-characters-using-javascript
  function escapeRe(text, asString) {
    var replacement = asString ? "\\\\$&" : "\\$&";
    return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, replacement);
  }

  function extractInterpolations(code) {
    var interpolateTokens = [],
        re = new RegExp(RE_INTERPOLATION_STR, 'g'),
        newCode = '',
        lastIndex = 0,
        arr;

    while ((arr = re.exec(code)) !== null) {
      newCode += code.substring(lastIndex, arr.index) + INTERPOLATION_SYMBOL;
      lastIndex = arr.index + arr[0].length;
      interpolateTokens.push(arr[0]);
    }

    newCode += code.substr(lastIndex);

    return {
      code: newCode,
      tokens: interpolateTokens
    };
  }

  function recoverInterpolations(code, tokens) {
    var re = new RegExp(INTERPOLATION_SYMBOL, 'g'),
        newCode = '',
        lastIndex = 0,
        arr;

    while ((arr = re.exec(code)) !== null) {
      newCode += code.substring(lastIndex, arr.index ) + tokens.shift();
      lastIndex = arr.index + arr[0].length;
    }

    newCode += code.substr(lastIndex);

    return newCode;
  }
}]);


var hljsDir, interpolateDirFactory, languageDirFactory, sourceDirFactory, includeDirFactory;

/**
 * hljs directive
 */
hljsDir = /*@ngInject*/ ["$parse", function ($parse) {
  return {
    restrict: 'EA',
    controller: 'HljsCtrl',
    compile: function(tElm, tAttrs, transclude) {
      // get static code
      // strip the starting "new line" character
      var staticHTML = tElm[0].innerHTML.replace(/^(\r\n|\r|\n)/m, ''),
          staticText = tElm[0].textContent.replace(/^(\r\n|\r|\n)/m, '');

      // put template
      tElm.html('<pre><code class="hljs"></code></pre>');

      return function postLink(scope, iElm, iAttrs, ctrl) {
        var escapeCheck;

        if (angular.isDefined(iAttrs.escape)) {
          escapeCheck = $parse(iAttrs.escape);
        } else if (angular.isDefined(iAttrs.noEscape)) {
          escapeCheck = $parse('false');
        }

        ctrl.init(iElm.find('code'));

        if (iAttrs.onhighlight) {
          ctrl.highlightCallback(function () {
            scope.$eval(iAttrs.onhighlight);
          });
        }

        if ((staticHTML || staticText) && shouldHighlightStatics(iAttrs)) {

          var code;

          // Auto-escape check
          // default to "true"
          if (escapeCheck && !escapeCheck(scope)) {
            code = staticText;
          }
          else {
            code = staticHTML;
          }

          ctrl.highlight(code);
        }

        scope.$on('$destroy', function () {
          ctrl.release();
        });
      };
    }
  };
}];

/**
 * language directive
 */
languageDirFactory = function (dirName) {
  return /*@ngInject*/ function () {
    return {
      require: '?hljs',
      restrict: 'A',
      link: function (scope, iElm, iAttrs, ctrl) {
        if (!ctrl) {
          return;
        }      
        iAttrs.$observe(dirName, function (lang) {
          if (angular.isDefined(lang)) {
            ctrl.setLanguage(lang);
          }
        });
      }
    };
  };
};

/**
 * interpolate directive
 */
interpolateDirFactory = function (dirName) {
  /*@ngInject*/
  return function () {
    return {
      require: '?hljs',
      restrict: 'A',
      link: function (scope, iElm, iAttrs, ctrl) {
        if (!ctrl) {
          return;
        }
        scope.$watch(iAttrs[dirName], function (newVal, oldVal) {
          if (newVal || newVal !== oldVal) {
            ctrl.setInterpolateScope(newVal ? scope : null);
          }
        });
      }
    };
  };
};

/**
 * source directive
 */
sourceDirFactory = function (dirName) {
  return /*@ngInject*/ function () {
    return {
      require: '?hljs',
      restrict: 'A',
      link: function(scope, iElm, iAttrs, ctrl) {
        if (!ctrl) {
          return;
        }

        scope.$watch(iAttrs[dirName], function (newCode, oldCode) {
          if (newCode) {
            ctrl.highlight(newCode);
          }
          else {
            ctrl.clear();
          }
        });
      }
    };
  };
};

/**
 * include directive
 */
includeDirFactory = function (dirName) {
  return /*@ngInject*/ ["$http", "$templateCache", "$q", function ($http, $templateCache, $q) {
    return {
      require: '?hljs',
      restrict: 'A',
      compile: function(tElm, tAttrs, transclude) {
        var srcExpr = tAttrs[dirName];

        return function postLink(scope, iElm, iAttrs, ctrl) {
          var changeCounter = 0;

          if (!ctrl) {
            return;
          }

          scope.$watch(srcExpr, function (src) {
            var thisChangeId = ++changeCounter;

            if (src && angular.isString(src)) {
              var templateCachePromise, dfd;

              templateCachePromise = $templateCache.get(src);
              if (!templateCachePromise) {
                dfd = $q.defer();
                $http.get(src, {
                  cache: $templateCache,
                  transformResponse: function(data, headersGetter) {
                    // Return the raw string, so $http doesn't parse it
                    // if it's json.
                    return data;
                  }
                }).success(function (code) {
                  if (thisChangeId !== changeCounter) {
                    return;
                  }
                  dfd.resolve(code);
                }).error(function() {
                  if (thisChangeId === changeCounter) {
                    ctrl.clear();
                  }
                  dfd.resolve();
                });
                templateCachePromise = dfd.promise;
              }

              $q.when(templateCachePromise)
              .then(function (code) {
                if (!code) {
                  return;
                }

                // $templateCache from $http
                if (angular.isArray(code)) {
                  // 1.1.5
                  code = code[1];
                }
                else if (angular.isObject(code)) {
                  // 1.0.7
                  code = code.data;
                }

                code = code.replace(/^(\r\n|\r|\n)/m, '');
                ctrl.highlight(code);
              });
            }
            else {
              ctrl.clear();
            }
          });
        };
      }
    };
  }];
};

/**
 * Add directives
 */
(function (module) {
  module.directive('hljs', hljsDir);

  angular.forEach(['interpolate', 'hljsInterpolate', 'compile', 'hljsCompile'], function (name) {
    module.directive(name, interpolateDirFactory(name));
  });

  angular.forEach(['language', 'hljsLanguage'], function (name) {
    module.directive(name, languageDirFactory(name));
  });

  angular.forEach(['source', 'hljsSource'], function (name) {
    module.directive(name, sourceDirFactory(name));
  });

  angular.forEach(['include', 'hljsInclude'], function (name) {
    module.directive(name, includeDirFactory(name));
  });
})(ngModule);

  return "hljs";
}));