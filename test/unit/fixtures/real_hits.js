define(function (require) {

  /*
    Extensions:
    gif: 5
    html: 8
    php: 5 (thus 5 with phpmemory fields)
    png: 2

    _type:
    apache: 18
    nginx: 2

    Bytes (all unique except):
    374: 2

    All have the same index, ids are unique
  */

  return [
    {
      '_index': 'logstash-2014.09.09',
      '_type': 'apache',
      '_id': '61',
      '_score': 1,
      '_source': {
        'extension': 'html',
        'bytes': 360.20000000000005
      }
    },
    {
      '_index': 'logstash-2014.09.09',
      '_type': 'apache',
      '_id': '388',
      '_score': 1,
      '_source': {
        'extension': 'gif',
        'bytes': 5848.700000000001
      }
    },
    {
      '_index': 'logstash-2014.09.09',
      '_type': 'apache',
      '_id': '403',
      '_score': 1,
      '_source': {
        'extension': 'png',
        'bytes': 841.6
      }
    },
    {
      '_index': 'logstash-2014.09.09',
      '_type': 'apache',
      '_id': '415',
      '_score': 1,
      '_source': {
        'extension': 'html',
        'bytes': 1626.4
      }
    },
    {
      '_index': 'logstash-2014.09.09',
      '_type': 'apache',
      '_id': '460',
      '_score': 1,
      '_source': {
        'extension': 'php',
        'bytes': 2070.6,
        'phpmemory': 276080
      }
    },
    {
      '_index': 'logstash-2014.09.09',
      '_type': 'apache',
      '_id': '496',
      '_score': 1,
      '_source': {
        'extension': 'gif',
        'bytes': 8421.6
      }
    },
    {
      '_index': 'logstash-2014.09.09',
      '_type': 'apache',
      '_id': '511',
      '_score': 1,
      '_source': {
        'extension': 'html',
        'bytes': 994.8000000000001
      }
    },
    {
      '_index': 'logstash-2014.09.09',
      '_type': 'apache',
      '_id': '701',
      '_score': 1,
      '_source': {
        'extension': 'html',
        'bytes': 374
      }
    },
    {
      '_index': 'logstash-2014.09.09',
      '_type': 'apache',
      '_id': '838',
      '_score': 1,
      '_source': {
        'extension': 'php',
        'bytes': 506.09999999999997,
        'phpmemory': 67480
      }
    },
    {
      '_index': 'logstash-2014.09.09',
      '_type': 'apache',
      '_id': '890',
      '_score': 1,
      '_source': {
        'extension': 'php',
        'bytes': 506.09999999999997,
        'phpmemory': 67480
      }
    },
    {
      '_index': 'logstash-2014.09.09',
      '_type': 'nginx',
      '_id': '927',
      '_score': 1,
      '_source': {
        'extension': 'php',
        'bytes': 2591.1,
        'phpmemory': 345480
      }
    },
    {
      '_index': 'logstash-2014.09.09',
      '_type': 'apache',
      '_id': '1034',
      '_score': 1,
      '_source': {
        'extension': 'html',
        'bytes': 1450
      }
    },
    {
      '_index': 'logstash-2014.09.09',
      '_type': 'apache',
      '_id': '1142',
      '_score': 1,
      '_source': {
        'extension': 'php',
        'bytes': 1803.8999999999999,
        'phpmemory': 240520
      }
    },
    {
      '_index': 'logstash-2014.09.09',
      '_type': 'apache',
      '_id': '1180',
      '_score': 1,
      '_source': {
        'extension': 'html',
        'bytes': 1626.4
      }
    },
    {
      '_index': 'logstash-2014.09.09',
      '_type': 'nginx',
      '_id': '1224',
      '_score': 1,
      '_source': {
        'extension': 'gif',
        'bytes': 10617.2
      }
    },
    {
      '_index': 'logstash-2014.09.09',
      '_type': 'apache',
      '_id': '1243',
      '_score': 1,
      '_source': {
        'extension': 'gif',
        'bytes': 10961.5
      }
    },
    {
      '_index': 'logstash-2014.09.09',
      '_type': 'apache',
      '_id': '1510',
      '_score': 1,
      '_source': {
        'extension': 'html',
        'bytes': 382.8
      }
    },
    {
      '_index': 'logstash-2014.09.09',
      '_type': 'apache',
      '_id': '1628',
      '_score': 1,
      '_source': {
        'extension': 'html',
        'bytes': 374
      }
    },
    {
      '_index': 'logstash-2014.09.09',
      '_type': 'apache',
      '_id': '1729',
      '_score': 1,
      '_source': {
        'extension': 'png',
        'bytes': 3059.2000000000003
      }
    },
    {
      '_index': 'logstash-2014.09.09',
      '_type': 'apache',
      '_id': '1945',
      '_score': 1,
      '_source': {
        'extension': 'gif',
        'bytes': 10617.2
      }
    }
  ];
});
