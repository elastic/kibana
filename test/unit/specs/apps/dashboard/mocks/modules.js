define(function (require) {

  var angular = require('angular');

  angular.module('app/dashboard',[]);

  // Need this because the controller requires it
  angular.module('kibana/directives',[]);

  // create mock service for courier
  var mock = {
    getvalue: function () {}
  };

  angular.module('kibana/services',[])
    .service('courier',function () {
      return mock;
    });

  // Could probably get rid of ngRoute if you want to stub it
  angular.module('kibana',['ngRoute','kibana/services','app/dashboard']);


});