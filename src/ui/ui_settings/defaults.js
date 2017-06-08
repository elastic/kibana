import moment from 'moment-timezone';

export function getDefaultSettings() {
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
    'discover:aggs:terms:size': {
      value: 20,
      type: 'number',
      description: 'Determines how many terms will be visualized when clicking the "visualize" ' +
      'button, in the field drop downs, in the discover sidebar.'
    },
    'doc_table:highlight': {
      value: true,
      description: 'Highlight results in Discover and Saved Searches Dashboard.' +
        'Highlighting makes requests slow when working on big documents.',
    },
    'doc_table:highlight:all_fields': {
      value: true,
      description: 'Improves highlighting by using a separate "highlight_query" that uses "all_fields" mode on "query_string" queries. ' +
        'Set to false if you are using a "default_field" in your index.',
    },
    'courier:maxSegmentCount': {
      value: 30,
      description: 'Requests in discover are split into segments to prevent massive requests from being sent to ' +
        'elasticsearch. This setting attempts to prevent the list of segments from getting too long, which might ' +
        'cause requests to take much longer to process'
    },
    'courier:ignoreFilterIfFieldNotInIndex': {
      value: false,
      description: 'This configuration enhances support for dashboards containing visualizations accessing dissimilar indexes. ' +
        'When set to false, all filters are applied to all visualizations. ' +
        'When set to true, filter(s) will be ignored for a visualization ' +
        'when the visualization\'s index does not contain the filtering field.'
    },
    'fields:popularLimit': {
      value: 10,
      description: 'The top N most popular fields to show',
    },
    'histogram:barTarget': {
      value: 50,
      description: 'Attempt to generate around this many bars when using "auto" interval in date histograms',
    },
    'histogram:maxBars': {
      value: 100,
      description: 'Never show more than this many bars in date histograms, scale values if needed',
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
      description: 'Default <a href="http://leafletjs.com/reference.html#tilelayer-wms" target="_blank">properties</a> for the WMS map server support in the coordinate map'
    },
    'visualization:regionmap:showWarnings': {
      value: true,
      description: 'Should the vector map show a warning when terms cannot be joined to a shape on the map.'
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
    'visualization:dimmingOpacity': {
      type: 'number',
      value: 0.5,
      description: 'The opacity of the chart items that are dimmed when highlighting another element of the chart. ' +
      'The lower this number, the more the highlighted element will stand out.' +
      'This must be a number between 0 and 1.'
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
  "boolean": { "id": "boolean", "params": {} },
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
    'savedObjects:listingLimit': {
      type: 'number',
      value: 1000,
      description: 'Number of objects to fetch for the listing pages'
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
    'metrics:max_buckets': {
      value: 2000,
      description: 'The maximum number of buckets a single datasource can return'
    },
    // Timelion stuff
    'timelion:showTutorial': {
      value: false,
      description: 'Should I show the tutorial by default when entering the timelion app?'
    },
    'timelion:es.timefield': {
      value: '@timestamp',
      description: 'Default field containing a timestamp when using .es()'
    },
    'timelion:es.default_index': {
      value: '_all',
      description: 'Default elasticsearch index to search with .es()'
    },
    'timelion:target_buckets': {
      value: 200,
      description: 'The number of buckets to shoot for when using auto intervals'
    },
    'timelion:max_buckets': {
      value: 2000,
      description: 'The maximum number of buckets a single datasource can return'
    },
    'timelion:default_columns': {
      value: 2,
      description: 'Number of columns on a timelion sheet by default'
    },
    'timelion:default_rows': {
      value: 2,
      description: 'Number of rows on a timelion sheet by default'
    },
    'timelion:min_interval': {
      value: '1ms',
      description: 'The smallest interval that will be calculated when using "auto"'
    },
    'timelion:graphite.url': {
      value: 'https://www.hostedgraphite.com/UID/ACCESS_KEY/graphite',
      description: '<em>[experimental]</em> The URL of your graphite host'
    },
    'timelion:quandl.key': {
      value: 'someKeyHere',
      description: '<em>[experimental]</em> Your API key from www.quandl.com'
    },
    'state:storeInSessionStorage': {
      value: false,
      description: 'The URL can sometimes grow to be too large for some browsers to ' +
        'handle. To counter-act this we are testing if storing parts of the URL in ' +
        'sessions storage could help. Please let us know how it goes!'
    },
    'indexPattern:placeholder': {
      value: 'logstash-*',
      description: 'The placeholder for the field "Index name or pattern" in the "Settings > Indices" tab.',
    },
    'context:defaultSize': {
      value: 5,
      description: 'The number of surrounding entries to show in the context view',
    },
    'context:step': {
      value: 5,
      description: 'The step size to increment or decrement the context size by',
    },
    'context:tieBreakerFields': {
      value: ['_doc'],
      description: 'A comma-separated list of fields to use for tiebreaking between documents ' +
        'that have the same timestamp value. From this list the first field that ' +
        'is present and sortable in the current index pattern is used.',
    },
  };
}
