import d3 from 'd3';
import $ from 'jquery';
import _ from 'lodash';
import ErrorHandlerProvider from 'ui/vislib/lib/_error_handler';
export default function AxisTitleFactory(Private) {

  const ErrorHandler = Private(ErrorHandlerProvider);

  class AxisTitle extends ErrorHandler {
    constructor(config) {
      super();
      this.config = config;
      this.elSelector = this.config.title.elSelector.replace('{pos}', config.get('position'));
    }

    render() {
      d3.select(this.config.get('rootEl')).selectAll(this.elSelector).call(this.draw());
    };

    draw() {
      const self = this;
      const config = this.config;

      return function (selection) {
        selection.each(function () {
          const el = this;
          const div = d3.select(el);
          const width = $(el).width();
          const height = $(el).height();

          self.validateWidthandHeight(width, height);

          const svg = div.append('svg')
          .attr('width', width)
          .attr('height', height);


          const bbox = svg.append('text')
          .attr('transform', function () {
            if (self.config.isHorizontal()) {
              return 'translate(' + width / 2 + ',11)';
            }
            return 'translate(11,' + height / 2 + ') rotate(270)';
          })
          .attr('text-anchor', 'middle')
          .text(config.get('title.text'))
          .node()
          .getBBox();

          if (config.isHorizontal()) {
            svg.attr('height', bbox.height);
          } else {
            svg.attr('width', bbox.width);
          }
        });
      };
    };
  }
  return AxisTitle;
};
