define(function (require) {
  describe('Point Series Agg Response', function () {
    run(require('specs/components/agg_response/point_series/_main'));
    run(require('specs/components/agg_response/point_series/_add_to_siri'));
    run(require('specs/components/agg_response/point_series/_fake_x_aspect'));
    run(require('specs/components/agg_response/point_series/_get_aspects'));
    run(require('specs/components/agg_response/point_series/_get_points'));
    run(require('specs/components/agg_response/point_series/_get_series'));
    run(require('specs/components/agg_response/point_series/_init_x_axis'));
    run(require('specs/components/agg_response/point_series/_init_y_axis'));
    run(require('specs/components/agg_response/point_series/_ordered_date_axis'));
    run(require('specs/components/agg_response/point_series/_tooltip_formatter'));
    function run(module) { describe(module[0], module[1]); }
  });
});