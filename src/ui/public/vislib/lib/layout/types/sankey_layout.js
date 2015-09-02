define(function (require) {
  return function ColumnLayoutFactory(Private) {
    var d3 = require('d3');
    var sankeySplit =
      Private(require('ui/vislib/lib/layout/splits/sankey/sankey_split'));
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
              class: 'vis-col-wrapper',
              children: [
                {
                  type: 'div',
                  class: 'chart-wrapper',
                  splits: sankeySplit
                }
              ]
            }
          ]
        }
      ];
    };
  };
});
