import d3 from 'd3';
import $ from 'jquery';
import _ from 'lodash';
export default function AxisLabelsFactory(Private) {
  class AxisLabels {
    constructor(axisConfig, scale) {
      this.axisConfig = axisConfig;
      this.axisScale = scale;
    }

    render(selection) {
      selection.call(this.draw());
    };

    rotateAxisLabels() {
      const config = this.axisConfig;
      return function (selection) {
        const text = selection.selectAll('.tick text');

        if (config.get('labels.rotate')) {
          text
          .style('text-anchor', function () {
            return config.get('labels.rotateAnchor') === 'center' ? 'center' : 'end';
          })
          .attr('dy', function () {
            if (config.isHorizontal()) {
              if (config.get('position') === 'top') return '-0.9em';
              else return '0.3em';
            }
            return '0';
          })
          .attr('dx', function () {
            return config.isHorizontal() ? '-0.9em' : '0';
          })
          .attr('transform', function rotate(d, j) {
            let rotateDeg = config.get('labels.rotate');
            if (config.get('labels.rotateAnchor') === 'center') {
              const coord = text[0][j].getBBox();
              const transX = ((coord.x) + (coord.width / 2));
              const transY = ((coord.y) + (coord.height / 2));
              return `rotate(${rotateDeg}, ${transX}, ${transY})`;
            } else {
              rotateDeg = config.get('position') === 'top' ? rotateDeg : -rotateDeg;
              return `rotate(${rotateDeg})`;
            }
          });
        }
      };
    };

    truncateLabel(text, size) {
      const node = d3.select(text).node();
      let str = $(node).text();
      const width = node.getBBox().width;
      const chars = str.length;
      const pxPerChar = width / chars;
      let endChar = 0;
      const ellipsesPad = 4;

      if (width > size) {
        endChar = Math.floor((size / pxPerChar) - ellipsesPad);
        while (str[endChar - 1] === ' ' || str[endChar - 1] === '-' || str[endChar - 1] === ',') {
          endChar = endChar - 1;
        }
        str = str.substr(0, endChar) + '...';
      }
      return str;
    };

    truncateLabels() {
      const self = this;
      const config = this.axisConfig;
      return function (selection) {
        if (!config.get('labels.truncate')) return;

        selection.selectAll('.tick text')
        .text(function () {
          return self.truncateLabel(this, config.get('labels.truncate'));
        });
      };
    };

    filterAxisLabels() {
      const self = this;
      const config = this.axisConfig;
      let startPos = 0;
      let padding = 1.1;

      return function (selection) {
        if (!config.get('labels.filter')) return;

        selection.selectAll('.tick text')
        .text(function (d) {
          const par = d3.select(this.parentNode).node();
          const el = $(config.get('rootEl')).find(config.get('elSelector'));
          const maxSize = config.isHorizontal() ? el.width() : el.height();
          const myPos = config.isHorizontal() ? self.axisScale.scale(d) : maxSize - self.axisScale.scale(d);
          const mySize = (config.isHorizontal() ? par.getBBox().width : par.getBBox().height) * padding;
          const halfSize = mySize / 2;

          if ((startPos + halfSize) < myPos && maxSize > (myPos + halfSize)) {
            startPos = myPos + halfSize;
            return this.innerHTML;
          } else {
            d3.select(this.parentNode).remove();
          }
        });
      };
    };

    draw() {
      const self = this;
      const config = this.axisConfig;

      return function (selection) {
        selection.each(function () {
          selection.selectAll('text')
          .attr('style', function () {
            const currentStyle = d3.select(this).attr('style');
            return `${currentStyle} font-size: ${config.get('labels.fontSize')};`;
          });
          if (!config.get('labels.show')) selection.selectAll('text').attr('style', 'display: none;');

          selection.call(self.truncateLabels());
          selection.call(self.rotateAxisLabels());
          selection.call(self.filterAxisLabels());
        });
      };
    };
  }

  return AxisLabels;
};
