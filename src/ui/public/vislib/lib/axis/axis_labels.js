import d3 from 'd3';
import $ from 'jquery';
export default function AxisLabelsFactory() {
  class AxisLabels {
    constructor(axisConfig, scale) {
      this.axisConfig = axisConfig;
      this.axisScale = scale;
    }

    render(selection) {
      selection.call(this.draw());
    }

    rotateAxisLabels() {
      const config = this.axisConfig;
      return function (selection) {
        const text = selection.selectAll('.tick text');

        if (config.get('labels.rotate')) {
          text
          .style('text-anchor', function () {
            const currentValue = $(this).css('text-anchor');
            const rotateDeg = config.get('labels.rotate');
            if (!rotateDeg) return currentValue;
            else {
              const position = config.get('position');
              switch (position) {
                case 'top': return 'end';
                case 'bottom': return 'end';
                default:
                  if (rotateDeg === 90 || rotateDeg === -90) return 'middle';
                  return currentValue;
              }
            }
          })
          .attr('dy', function () {
            return config.isHorizontal() ? '0.3em' : '0';
          })
          .attr('transform', function rotate(d, j) {
            const position = config.get('position');
            const rotateDeg = position === 'top' ? config.get('labels.rotate') : -config.get('labels.rotate');

            if ($(this).css('text-anchor') === 'middle') {
              const coord = text[0][j].getBBox();
              const transX = ((coord.x) + (coord.width / 2));
              const transY = ((coord.y) + (coord.height / 2));
              return `rotate(${rotateDeg}, ${transX}, ${transY})`;
            } else {
              const transX = this.attributes.x.nodeValue;
              const transY = this.attributes.y.nodeValue;
              return `rotate(${rotateDeg}, ${transX}, ${transY})`;
            }
          });
        }
      };
    }

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
    }

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
    }

    filterAxisLabels() {
      const self = this;
      const config = this.axisConfig;
      let startPos = 0;
      const padding = 1.1;

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
    }

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
    }
  }

  return AxisLabels;
}
