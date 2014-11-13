define(function (require) {
  var _ = require('lodash');

  return {
    'label': '',
    'xAxisLabel': 'Top 5 unusual terms in @tags',
    'yAxisLabel': 'Count of documents',
    'series': [
      {
        'values': [
          {
            'x': 'success',
            'y': 143995
          },
          {
            'x': 'info',
            'y': 128233
          },
          {
            'x': 'security',
            'y': 34515
          },
          {
            'x': 'error',
            'y': 10256
          },
          {
            'x': 'warning',
            'y': 17188
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
          'id': 'agg_17',
          'aggConfig': {
            'type': 'significant_terms',
            'schema': 'segment',
            'params': {
              'field': '@tags',
              'size': 5
            }
          },
          'aggType': {
            'name': 'significant_terms',
            'title': 'Significant Terms',
            'hasNoDsl': false,
            'params': [
              {
                'name': 'field',
                'filterFieldTypes': 'string'
              },
              {
                'name': 'size'
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
            'name': '@tags',
            'count': 0
          },
          'label': 'Top 5 unusual terms in @tags',
          'params': {
            'field': '@tags',
            'size': 5
          }
        },
        {
          'categoryName': 'metric',
          'id': 'agg_16',
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
          'success',
          143995
        ],
        [
          'info',
          128233
        ],
        [
          'security',
          34515
        ],
        [
          'error',
          10256
        ],
        [
          'warning',
          17188
        ]
      ]
    },
    'hits': 171439,
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
