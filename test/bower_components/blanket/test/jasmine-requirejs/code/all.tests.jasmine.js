/*

From the Chutzpah test suite: http://chutzpah.codeplex.com/


*/
/// <reference path="require.js" />
/// <reference path="jasmine.js" />

requirejs(['./tests/base/base.jasmine.test',
           './tests/ui/ui.jasmine.test'],
    function () { }
);
