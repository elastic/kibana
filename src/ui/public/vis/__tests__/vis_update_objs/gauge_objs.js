/* eslint-disable camelcase */

export const pre_6_1 = {
  'title': 'metrics test',
  'type': 'metric',
  'params': {
    'addTooltip': true,
    'addLegend': true,
    'type': 'gauge',
    'gauge': {
      'verticalSplit': false,
      'autoExtend': false,
      'percentageMode': false,
      'gaugeType': 'Metric',
      'gaugeStyle': 'Full',
      'backStyle': 'Full',
      'orientation': 'vertical',
      'colorSchema': 'Green to Red',
      'gaugeColorMode': 'Labels',
      'useRange': false,
      'colorsRange': [
        {
          'from': 0,
          'to': 100
        }
      ],
      'invertColors': false,
      'labels': {
        'show': true,
        'color': 'black'
      },
      'scale': {
        'show': false,
        'labels': false,
        'color': '#333',
        'width': 2
      },
      'type': 'simple',
      'style': {
        'fontSize': 60,
        'bgColor': false,
        'labelColor': true,
        'subText': ''
      }
    }
  },
  'aggs': [
    {
      'id': '1',
      'enabled': true,
      'type': 'count',
      'schema': 'metric',
      'params': {}
    }
  ]
};

export const since_6_1 = {
  'title': 'metrics test',
  'type': 'metric',
  'params': {
    'addTooltip': true,
    'addLegend': false,
    'type': 'metric',
    'metric': {
      'percentageMode': false,
      'colorSchema': 'Green to Red',
      'metricColorMode': 'Labels',
      'useRange': false,
      'colorsRange': [
        {
          'from': 0,
          'to': 100
        }
      ],
      'invertColors': false,
      'labels': {
        'show': true,
        'color': 'black'
      },
      'style': {
        'fontSize': 60,
        'bgColor': false,
        'labelColor': true,
        'subText': ''
      }
    }
  },
  'aggs': [
    {
      'id': '1',
      'enabled': true,
      'type': 'count',
      'schema': 'metric',
      'params': {}
    }
  ]
};
