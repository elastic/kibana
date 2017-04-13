import VislibLibLayoutSplitsColumnChartChartSplitProvider from '../splits/column_chart/chart_split';
import VislibLibLayoutSplitsColumnChartYAxisSplitProvider from '../splits/column_chart/y_axis_split';
import VislibLibLayoutSplitsColumnChartXAxisSplitProvider from '../splits/column_chart/x_axis_split';
import VislibLibLayoutSplitsColumnChartChartTitleSplitProvider from '../splits/column_chart/chart_title_split';
export default function ColumnLayoutFactory(Private) {

  const chartSplit = Private(VislibLibLayoutSplitsColumnChartChartSplitProvider);
  const yAxisSplit = Private(VislibLibLayoutSplitsColumnChartYAxisSplitProvider);
  const xAxisSplit = Private(VislibLibLayoutSplitsColumnChartXAxisSplitProvider);
  const chartTitleSplit = Private(VislibLibLayoutSplitsColumnChartChartTitleSplitProvider);

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
                class: 'y-axis-spacer-block y-axis-spacer-block-top'
              },
              {
                type: 'div',
                class: 'y-axis-col axis-wrapper-left',
                children: [
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
                class: 'y-axis-spacer-block y-axis-spacer-block-bottom'
              }
            ]
          },
          {
            type: 'div',
            class: 'vis-col-wrapper',
            children: [
              {
                type: 'div',
                class: 'x-axis-wrapper axis-wrapper-top',
                children: [
                  {
                    type: 'div',
                    class: 'x-axis-div-wrapper',
                    splits: xAxisSplit
                  }
                ]
              },
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
                class: 'x-axis-wrapper axis-wrapper-bottom',
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
                  }
                ]
              }
            ]
          },
          {
            type: 'div',
            class: 'y-axis-col-wrapper',
            children: [
              {
                type: 'div',
                class: 'y-axis-spacer-block y-axis-spacer-block-top'
              },
              {
                type: 'div',
                class: 'y-axis-col axis-wrapper-right',
                children: [
                  {
                    type: 'div',
                    class: 'y-axis-div-wrapper',
                    splits: yAxisSplit
                  }
                ]
              },
              {
                type: 'div',
                class: 'y-axis-spacer-block y-axis-spacer-block-bottom'
              }
            ]
          }
        ]
      }
    ];
  };
}
