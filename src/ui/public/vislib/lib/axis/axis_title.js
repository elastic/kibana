import d3 from 'd3';
import $ from 'jquery';
export default function AxisTitleFactory() {

  class AxisTitle {
    constructor(axisConfig) {
      this.axisConfig = axisConfig;
      this.elSelector = this.axisConfig.get('title.elSelector').replace('{pos}', this.axisConfig.get('position'));
    }

    render() {
      d3.select(this.axisConfig.get('rootEl')).selectAll(this.elSelector).call(this.draw());
    }

    destroy() {
      $(this.axisConfig.get('rootEl')).find(this.elSelector).find('svg').remove();
    }

    draw() {
      const config = this.axisConfig;

      return function (selection) {
        selection.each(function () {
          if (!config.get('show') && !config.get('title.show', false)) return;

          const el = this;
          const div = d3.select(el);
          const width = $(el).width();
          const height = $(el).height();
          const titlePadding = 15;
          const axisPrefix = config.isHorizontal() ? 'x' : 'y';

          const svg = div.append('svg')
            .attr('width', width)
            .attr('height', height)
            .attr('class', `axis-title ${axisPrefix}-axis-title`);

          const bbox = svg.append('text')
          .attr('transform', function () {
            if (config.isHorizontal()) {
              return `translate(${width / 2},${titlePadding})`;
            }
            return `translate(${titlePadding},${height / 2}) rotate(270)`;
          })
          .attr('text-anchor', 'middle')
          .text(config.get('title.text'))
          .node()
          .getBBox();

          if (config.isHorizontal()) {
            svg.attr('height', bbox.height);
          } else {
            svg.attr('width', bbox.height);
          }
        });
      };
    }
  }
  return AxisTitle;
}
