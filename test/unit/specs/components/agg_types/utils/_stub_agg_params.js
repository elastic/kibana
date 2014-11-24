define(function (require) {
  var _ = require('lodash');
  var sinon = require('test_utils/auto_release_sinon');

  function ParamClassStub(parent, body) {
    var stub = sinon.spy(body || function () {
      stub.Super && stub.Super.call(this);
    });
    if (parent) _(stub).inherits(parent);
    return stub;
  }

  /**
   * stub all of the param classes, but ensure that they still inherit properly.
   * This method should be passed directly to inject();
   *
   * ```js
   * var stubParamClasses = require('specs/components/agg_types/utils/_stub_agg_params');
   * describe('something', function () {
   *   beforeEach(inject(stubParamClasses));
   * })
   * ```
   *
   * @param  {PrivateLoader} Private - The private module loader, inject by passing this function to inject()
   * @return {undefined}
   */
  return function stubParamClasses(Private) {
    var BaseAggParam = Private.stub(
      require('components/agg_types/param_types/base'),
      ParamClassStub(null, function (config) {
        _.assign(this, config);
      })
    );

    Private.stub(
      require('components/agg_types/param_types/field'),
      ParamClassStub(BaseAggParam)
    );

    Private.stub(
      require('components/agg_types/param_types/optioned'),
      ParamClassStub(BaseAggParam)
    );
  };
});