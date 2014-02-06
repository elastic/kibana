define(['base/core'],
    function (core) {

        module("base/core");
        test("will return correct version from core", function () {
            var version = core.version;
            equal(version, 8);
        });

    });
