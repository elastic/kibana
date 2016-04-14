define(function (require) {
  return function ColumnLayoutFactory(Private) {
    let d3 = require('d3');

    let chartSplit = Private(require('ui/vislib/lib/layout/splits/column_chart/chart_split'));
    let yAxisSplit = Private(require('ui/vislib/lib/layout/splits/column_chart/y_axis_split'));
    let xAxisSplit = Private(require('ui/vislib/lib/layout/splits/column_chart/x_axis_split'));
    let chartTitleSplit = Private(require('ui/vislib/lib/layout/splits/column_chart/chart_title_split'));

    /**
     * Specifies the visualization layout for column charts.
     *
     * This is done using an array of objects. The first object has
     * a `parent` DOM element,  a DOM `type` (e.g. div, svg, etc),
     * and a `class` (required). Each child can omit the parent object,
     * but must include a type and class.
     *
     * Optionally, you can specify `datum` to be bound to the DOM
     * element, a `splits` function that divides the selected element
     * into more DOM elements based on a callback function provided, or
     * a children array which nests other layout objects.
     *
     * Objects in children arrays are children of the current object and return
     * DOM elements which are children of their respective parent element.
     */

    return function (el, data) {
      if (!el || !data) {
        throw new Error('Both an el and data need to be specified');
      }

      return [
        {
          parent: el,
          type: 'div',
          class: 'vis-wrapper',
          datum: data,
          children: [
            {
              type: 'div',
              class: 'y-axis-col-wrapper',
              children: [
                {
                  type: 'div',
                  class: 'y-axis-col',
                  children: [
                    {
                      type: 'div',
                      class: 'y-axis-title'
                    },
                    {
                      type: 'div',
                      class: 'y-axis-chart-title',
                      splits: chartTitleSplit
                    },
                    {
                      type: 'div',
                      class: 'y-axis-div-wrapper',
                      splits: yAxisSplit
                    }
                  ]
                },
                {
                  type: 'div',
                  class: 'y-axis-spacer-block'
                }
              ]
            },
            {
              type: 'div',
              class: 'vis-col-wrapper',
              children: [
                {
                  type: 'div',
                  class: 'chart-wrapper',
                  splits: chartSplit
                },
                {
                  type: 'div',
                  class: 'vis-alerts'
                },
                {
                  type: 'div',
                  class: 'x-axis-wrapper',
                  children: [
                    {
                      type: 'div',
                      class: 'x-axis-div-wrapper',
                      splits: xAxisSplit
                    },
                    {
                      type: 'div',
                      class: 'x-axis-chart-title',
                      splits: chartTitleSplit
                    },
                    {
                      type: 'div',
                      class: 'x-axis-title'
                    }
                  ]
                }
              ]
            }
          ]
        }
      ];
    };
  };
});
