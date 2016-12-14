import d3 from 'd3';
import MapSplitProvider from './splits/map_split';

export default function LayoutFactory(Private) {
  const mapSplit = Private(MapSplitProvider);
  class Layout {
    constructor(el, config, data) {
      this.el = el;
      this.config = config;
      this.data = data;
    }

    render() {
      this.removeAll();
      this.createLayout();
    }

    createLayout() {
      const wrapper = this.appendElem(this.el, 'div', 'vis-wrapper');
      wrapper.datum(this.data.data);
      const colWrapper = this.appendElem(wrapper.node(), 'div', 'vis-col-wrapper');
      const chartWrapper = this.appendElem(colWrapper.node(), 'div', 'chart-wrapper');
      chartWrapper.call(mapSplit, colWrapper.node(), this.config);
    }

    appendElem(el, type, className) {
      if (!el || !type || !className) {
        throw new Error('Function requires that an el, type, and class be provided');
      }

      if (typeof el === 'string') {
        // Create a DOM reference with a d3 selection
        // Need to make sure that the `el` is bound to this object
        // to prevent it from being appended to another Layout
        el = d3.select(this.el)
          .select(el)[0][0];
      }

      return d3.select(el)
      .append(type)
      .attr('class', className);
    }

    removeAll() {
      return d3.select(this.el).selectAll('*').remove();
    }
  }

  return Layout;
}
