/*

From the Chutzpah test suite: http://chutzpah.codeplex.com/


*/
define(['base/core'],
    function (core) {
        describe("base/core", function () {
            it("will return correct version from core", function () {
                var version = core.version;
                expect(version).toEqual(8);
            });
        });
    });
