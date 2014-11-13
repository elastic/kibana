define(function (require) {
  var _ = require('lodash');

  return {
    'label': '',
    'xAxisLabel': 'Top 5 extension',
    'yAxisLabel': 'Count of documents',
    'series': [
      {
        'values': [
          {
            'x': 'jpg',
            'y': 110710
          },
          {
            'x': 'css',
            'y': 27389
          },
          {
            'x': 'png',
            'y': 16661
          },
          {
            'x': 'gif',
            'y': 11269
          },
          {
            'x': 'php',
            'y': 5447
          }
        ]
      }
    ],
    'raw': {
      'splitColumns': [],
      'splitValStack': [],
      'columns': [
        {
          'categoryName': 'segment',
          'id': 'agg_13',
          'aggConfig': {
            'type': 'terms',
            'schema': 'segment',
            'params': {
              'field': 'extension',
              'size': 5,
              'order': 'desc'
            }
          },
          'aggType': {
            'name': 'terms',
            'title': 'Terms',
            'hasNoDsl': false,
            'params': [
              {
                'name': 'field'
              },
              {
                'name': 'size',
                'default': 5
              },
              {
                'name': 'order',
                'type': 'optioned',
                'options': [
                  {
                    'display': 'Top',
                    'val': 'desc'
                  },
                  {
                    'display': 'Bottom',
                    'val': 'asc'
                  }
                ],
                'editor': '<div class=\'vis-editor-agg-form-row\'>\n  ' +
                '<div ng-if=\'aggType.params.byName.order\' ' +
                'class=\'form-group\'>\n    <label>Order</label>\n    ' +
                '<select\n      name=\'order\'\n      ' +
                'ng-model=\'params.order\'\n      required\n      ' +
                'ng-options=\'opt as opt.display for opt in aggParam.options\'\n' +
                'class=\'form-control\'>\n    </select>\n  </div>\n  ' +
                '<div class=\'form-group\'>\n    <label>Size</label>\n    ' +
                '<input\n      name=\'size\'\n      ng-model=\'params.size\'\n      ' +
                'required\n      class=\'form-control\'\n      ' +
                'type=\'number\'\n      min=\'0\'\n      >\n  </div>\n</div>',
                'default': 'desc'
              },
              {
                'name': 'exclude',
                'type': 'regex',
                'advanced': true,
                'pattern': '',
                'flags': [
                  'CANON_EQ',
                  'CASE_INSENSITIVE',
                  'COMMENTS',
                  'DOTALL',
                  'LITERAL',
                  'MULTILINE',
                  'UNICODE_CASE',
                  'UNICODE_CHARACTER_CLASS',
                  'UNIX_LINES'
                ]
              },
              {
                'name': 'include',
                'type': 'regex',
                'advanced': true,
                'pattern': '',
                'flags': [
                  'CANON_EQ',
                  'CASE_INSENSITIVE',
                  'COMMENTS',
                  'DOTALL',
                  'LITERAL',
                  'MULTILINE',
                  'UNICODE_CASE',
                  'UNICODE_CHARACTER_CLASS',
                  'UNIX_LINES'
                ]
              },
              {
                'name': 'json',
                'type': 'json',
                'advanced': true
              }
            ],
            'type': 'buckets'
          },
          'field': {
            'type': 'string',
            'indexed': true,
            'analyzed': true,
            'doc_values': false,
            'name': 'extension',
            'count': 0
          },
          'label': 'Top 5 extension',
          'params': {
            'field': 'extension',
            'size': 5,
            'order': {
              '_count': 'desc'
            }
          }
        },
        {
          'categoryName': 'metric',
          'id': 'agg_12',
          'aggConfig': {
            'type': 'count',
            'schema': 'metric',
            'params': {}
          },
          'aggType': {
            'name': 'count',
            'title': 'Count',
            'hasNoDsl': true,
            'params': [
              {
                'name': 'json',
                'type': 'json',
                'advanced': true
              }
            ],
            'type': 'metrics'
          },
          'label': 'Count of documents',
          'params': {}
        }
      ],
      'rows': [
        [
          'jpg',
          110710
        ],
        [
          'css',
          27389
        ],
        [
          'png',
          16661
        ],
        [
          'gif',
          11269
        ],
        [
          'php',
          5447
        ]
      ]
    },
    'hits': 171476,
    'xAxisFormatter': function (val) {
      if (_.isObject(val)) {
        return JSON.stringify(val);
      }
      else if (val == null) {
        return '';
      }
      else {
        return '' + val;
      }
    },
    'tooltipFormatter': function (d) {
      return d;
    }
  };
});
