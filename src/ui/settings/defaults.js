import moment from 'moment-timezone';

export default function defaultSettingsProvider() {
  const weekdays = moment.weekdays().slice();
  const [defaultWeekday] = weekdays;

  // wrapped in provider so that a new instance is given to each app/test
  return {
    'buildNum': {
      readonly: true
    },
    'query:queryString:options': {
      value: '{ "analyze_wildcard": true }',
      description: '<a href="https://www.elastic.co/guide/en/elasticsearch/reference/current/query-dsl-query-string-query.html" target="_blank">Options</a> for the lucene query string parser',
      type: 'json'
    },
    'sort:options': {
      value: '{ "unmapped_type": "boolean" }',
      description: '<a href="https://www.elastic.co/guide/en/elasticsearch/reference/current/search-request-sort.html" target="_blank">Options</a> for the Elasticsearch sort parameter',
      type: 'json'
    },
    'dateFormat': {
      value: 'MMMM Do YYYY, HH:mm:ss.SSS',
      description: 'When displaying a pretty formatted date, use this <a href="http://momentjs.com/docs/#/displaying/format/" target="_blank">format</a>',
    },
    'dateFormat:tz': {
      value: 'Browser',
      description: 'Which timezone should be used.  "Browser" will use the timezone detected by your browser.',
      type: 'select',
      options: ['Browser', ...moment.tz.names()]
    },
    'dateFormat:scaled': {
      type: 'json',
      value:
`[
  ["", "HH:mm:ss.SSS"],
  ["PT1S", "HH:mm:ss"],
  ["PT1M", "HH:mm"],
  ["PT1H", "YYYY-MM-DD HH:mm"],
  ["P1DT", "YYYY-MM-DD"],
  ["P1YT", "YYYY"]
]`,
      description: (
        'Values that define the format used in situations where timebased' +
        ' data is rendered in order, and formatted timestamps should adapt to the' +
        ' interval between measurements. Keys are' +
        ' <a href="http://en.wikipedia.org/wiki/ISO_8601#Time_intervals" target="_blank">' +
        'ISO8601 intervals.</a>'
      )
    },
    'dateFormat:dow': {
      value: defaultWeekday,
      description: 'What day should weeks start on?',
      type: 'select',
      options: weekdays
    },
    'defaultIndex': {
      value: null,
      description: 'The index to access if no index is set',
    },
    'defaultColumns': {
      value: ['_source'],
      description: 'Columns displayed by default in the Discovery tab',
    },
    'metaFields': {
      value: ['_source', '_id', '_type', '_index', '_score'],
      description: 'Fields that exist outside of _source to merge into our document when displaying it',
    },
    'discover:sampleSize': {
      value: 500,
      description: 'The number of rows to show in the table',
    },
    'doc_table:highlight': {
      value: true,
      description: 'Highlight results in Discover and Saved Searches Dashboard.' +
        'Highlighing makes request slow when working on big documents.',
    },
    'courier:maxSegmentCount': {
      value: 30,
      description: 'Requests in discover are split into segments to prevent massive requests from being sent to ' +
        'elasticsearch. This setting attempts to prevent the list of segments from getting too long, which might ' +
        'cause requests to take much longer to process'
    },
    'fields:popularLimit': {
      value: 10,
      description: 'The top N most popular fields to show',
    },
    'histogram:barTarget': {
      value: 50,
      description: 'Attempt to generate around this many bar when using "auto" interval in date histograms',
    },
    'histogram:maxBars': {
      value: 100,
      description: 'Never show more than this many bar in date histograms, scale values if needed',
    },
    'visualization:tileMap:maxPrecision': {
      value: 7,
      description: 'The maximum geoHash precision displayed on tile maps: 7 is high, 10 is very high, ' +
      '12 is the max. ' +
      '<a href="http://www.elastic.co/guide/en/elasticsearch/reference/current/' +
      'search-aggregations-bucket-geohashgrid-aggregation.html#_cell_dimensions_at_the_equator" target="_blank">' +
      'Explanation of cell dimensions</a>',
    },
    'visualization:tileMap:WMSdefaults': {
      value: JSON.stringify({
        enabled: false,
        url: 'https://basemap.nationalmap.gov/arcgis/services/USGSTopo/MapServer/WMSServer',
        options: {
          version: '1.3.0',
          layers: '0',
          format: 'image/png',
          transparent: true,
          attribution: 'Maps provided by USGS',
          styles: '',
        }
      }, null, 2),
      type: 'json',
      description: 'Default <a href="http://leafletjs.com/reference.html#tilelayer-wms" target="_blank">properties</a> for the WMS map server support in the tile map'
    },
    'visualization:colorMapping': {
      type: 'json',
      value: JSON.stringify({
        Count: '#6eadc1'
      }),
      description: 'Maps values to specified colors within visualizations'
    },
    'visualization:loadingDelay': {
      value: '2s',
      description: 'Time to wait before dimming visualizations during query'
    },
    'csv:separator': {
      value: ',',
      description: 'Separate exported values with this string',
    },
    'csv:quoteValues': {
      value: true,
      description: 'Should values be quoted in csv exports?',
    },
    'history:limit': {
      value: 10,
      description: 'In fields that have history (e.g. query inputs), show this many recent values',
    },
    'shortDots:enable': {
      value: false,
      description: 'Shorten long fields, for example, instead of foo.bar.baz, show f.b.baz',
    },
    'truncate:maxHeight': {
      value: 115,
      description: 'The maximum height that a cell in a table should occupy. Set to 0 to disable truncation'
    },
    'indexPattern:fieldMapping:lookBack': {
      value: 5,
      description: 'For index patterns containing timestamps in their names, look for this many recent matching ' +
        'patterns from which to query the field mapping'
    },
    'format:defaultTypeMap': {
      type: 'json',
      value:
`{
  "ip": { "id": "ip", "params": {} },
  "date": { "id": "date", "params": {} },
  "number": { "id": "number", "params": {} },
  "_source": { "id": "_source", "params": {} },
  "_default_": { "id": "string", "params": {} }
}`,
      description: 'Map of the format name to use by default for each field type. ' +
        '"_default_" is used if the field type is not mentioned explicitly'
    },
    'format:number:defaultPattern': {
      type: 'string',
      value: '0,0.[000]',
      description: 'Default <a href="http://numeraljs.com/" target="_blank">numeral format</a> for the "number" format'
    },
    'format:bytes:defaultPattern': {
      type: 'string',
      value: '0,0.[000]b',
      description: 'Default <a href="http://numeraljs.com/" target="_blank">numeral format</a> for the "bytes" format'
    },
    'format:percent:defaultPattern': {
      type: 'string',
      value: '0,0.[000]%',
      description: 'Default <a href="http://numeraljs.com/" target="_blank">numeral format</a> for the "percent" format'
    },
    'format:currency:defaultPattern': {
      type: 'string',
      value: '($0,0.[00])',
      description: 'Default <a href="http://numeraljs.com/" target="_blank">numeral format</a> for the "currency" format'
    },
    'savedObjects:perPage': {
      type: 'number',
      value: 5,
      description: 'Number of objects to show per page in the load dialog'
    },
    'timepicker:timeDefaults': {
      type: 'json',
      value:
`{
  "from": "now-15m",
  "to": "now",
  "mode": "quick"
}`,
      description: 'The timefilter selection to use when Kibana is started without one'
    },
    'timepicker:refreshIntervalDefaults': {
      type: 'json',
      value:
`{
  "display": "Off",
  "pause": false,
  "value": 0
}`,
      description: 'The timefilter\'s default refresh interval'
    },
    'dashboard:defaultDarkTheme': {
      value: false,
      description: 'New dashboards use dark theme by default'
    },
    'filters:pinnedByDefault': {
      value: false,
      description: 'Whether the filters should have a global state (be pinned) by default'
    },
    'notifications:banner': {
      type: 'markdown',
      description: 'A custom banner intended for temporary notices to all users. <a href="https://help.github.com/articles/basic-writing-and-formatting-syntax/" target="_blank">Markdown supported</a>.',
      value: ''
    },
    'notifications:lifetime:banner': {
      value: 3000000,
      description: 'The time in milliseconds which a banner notification ' +
      'will be displayed on-screen for. Setting to Infinity will disable.'
    },
    'notifications:lifetime:error': {
      value: 300000,
      description: 'The time in milliseconds which an error notification ' +
      'will be displayed on-screen for. Setting to Infinity will disable.'
    },
    'notifications:lifetime:warning': {
      value: 10000,
      description: 'The time in milliseconds which a warning notification ' +
        'will be displayed on-screen for. Setting to Infinity will disable.'
    },
    'notifications:lifetime:info': {
      value: 5000,
      description: 'The time in milliseconds which an information notification ' +
        'will be displayed on-screen for. Setting to Infinity will disable.'
    },
  };
};
