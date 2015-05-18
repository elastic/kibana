define(function (require) {

  // output from:
  //
  // curl 'http://localhost:9200/logstash-*/_search' -d '{size:0,query:{filtered:{query:{query_string:{analyze_wildcard:true,query:'*'}},filter:{bool:{must:[{range:{'timestamp:{gte:1431970062512,lte:1431970962513}}}],must_not:[]}}}},aggs:{2:{terms:{field:'@tags',size:5,order:{1:'desc'}},aggs:{ 1:{avg:{field:'bytes'}},3:{geohash_grid:{field:'geo.coordinates',precision:3},aggs:{1:{avg:{field:'bytes'}}}}}}}}'

  // for vis:
  //
  // vis = new Vis(indexPattern, {
  //   type: 'tile_map',
  //   aggs:[
  //     { schema: 'metric', type: 'avg', params: { field: 'bytes' } },
  //     { schema: 'split', type: 'terms', params: { field: '@tags' } },
  //     { schema: 'segment', type: 'geohash_grid', params: { field: 'geo.coordinates', precision: 3 } }
  //   ],
  //   params: {
  //     isDesaturated: true,
  //     mapType: 'Scaled%20Circle%20Markers'
  //   },
  // });
  //

  return function GeoHashGridAggResponseFixture() {
    return {
      took: 3,
      timed_out: false,
      _shards: {
        total: 4,
        successful: 4,
        failed: 0
      },
      hits: {
        total: 298,
        max_score: 0.0,
        hits: []
      },
      aggregations: {
        2: {
          doc_count_error_upper_bound: 0,
          sum_other_doc_count: 54,
          buckets: [{
            key: 'error',
            doc_count: 16,
            3: {
              buckets: [{
                key: 'dps',
                doc_count: 1,
                1: {
                  value: 16393.0
                }
              }, {
                key: 'dpq',
                doc_count: 1,
                1: {
                  value: 19950.0
                }
              }, {
                key: 'dpn',
                doc_count: 1,
                1: {
                  value: 5479.0
                }
              }, {
                key: 'dpm',
                doc_count: 1,
                1: {
                  value: 774.0
                }
              }, {
                key: 'dpe',
                doc_count: 1,
                1: {
                  value: 3799.0
                }
              }, {
                key: 'dp8',
                doc_count: 1,
                1: {
                  value: 9400.0
                }
              }, {
                key: 'djy',
                doc_count: 1,
                1: {
                  value: 6285.0
                }
              }, {
                key: 'djv',
                doc_count: 1,
                1: {
                  value: 3839.0
                }
              }, {
                key: 'dhy',
                doc_count: 1,
                1: {
                  value: 15927.0
                }
              }, {
                key: 'c2k',
                doc_count: 1,
                1: {
                  value: 5383.0
                }
              }, {
                key: '9ze',
                doc_count: 1,
                1: {
                  value: 4694.0
                }
              }, {
                key: '9yq',
                doc_count: 1,
                1: {
                  value: 3605.0
                }
              }, {
                key: '9yb',
                doc_count: 1,
                1: {
                  value: 3975.0
                }
              }, {
                key: '9vf',
                doc_count: 1,
                1: {
                  value: 9225.0
                }
              }, {
                key: '9rw',
                doc_count: 1,
                1: {
                  value: 6959.0
                }
              }, {
                key: '9q6',
                doc_count: 1,
                1: {
                  value: 4070.0
                }
              }]
            },
            1: {
              value: 7484.8125
            }
          }, {
            key: 'warning',
            doc_count: 27,
            3: {
              buckets: [{
                key: 'dq3',
                doc_count: 1,
                1: {
                  value: 6698.0
                }
              }, {
                key: 'dp1',
                doc_count: 1,
                1: {
                  value: 8.0
                }
              }, {
                key: 'dnu',
                doc_count: 1,
                1: {
                  value: 4876.0
                }
              }, {
                key: 'dnr',
                doc_count: 1,
                1: {
                  value: 1523.0
                }
              }, {
                key: 'dnm',
                doc_count: 1,
                1: {
                  value: 4698.0
                }
              }, {
                key: 'dn0',
                doc_count: 1,
                1: {
                  value: 4841.0
                }
              }, {
                key: 'cb4',
                doc_count: 1,
                1: {
                  value: 9676.0
                }
              }, {
                key: 'c82',
                doc_count: 1,
                1: {
                  value: 9531.0
                }
              }, {
                key: 'bsn',
                doc_count: 1,
                1: {
                  value: 7828.0
                }
              }, {
                key: 'bed',
                doc_count: 1,
                1: {
                  value: 9070.0
                }
              }, {
                key: 'bd4',
                doc_count: 1,
                1: {
                  value: 5225.0
                }
              }, {
                key: 'b75',
                doc_count: 1,
                1: {
                  value: 2034.0
                }
              }, {
                key: '9zx',
                doc_count: 1,
                1: {
                  value: 19729.0
                }
              }, {
                key: '9zw',
                doc_count: 1,
                1: {
                  value: 5627.0
                }
              }, {
                key: '9zp',
                doc_count: 1,
                1: {
                  value: 5971.0
                }
              }, {
                key: '9zm',
                doc_count: 1,
                1: {
                  value: 8803.0
                }
              }, {
                key: '9yu',
                doc_count: 1,
                1: {
                  value: 5979.0
                }
              }, {
                key: '9y6',
                doc_count: 1,
                1: {
                  value: 0.0
                }
              }, {
                key: '9xp',
                doc_count: 1,
                1: {
                  value: 9190.0
                }
              }, {
                key: '9wu',
                doc_count: 1,
                1: {
                  value: 7419.0
                }
              }, {
                key: '9vv',
                doc_count: 1,
                1: {
                  value: 2555.0
                }
              }, {
                key: '9vg',
                doc_count: 1,
                1: {
                  value: 7792.0
                }
              }, {
                key: '9vf',
                doc_count: 1,
                1: {
                  value: 9434.0
                }
              }, {
                key: '9rk',
                doc_count: 1,
                1: {
                  value: 9740.0
                }
              }, {
                key: '9q5',
                doc_count: 1,
                1: {
                  value: 8580.0
                }
              }, {
                key: '9pp',
                doc_count: 1,
                1: {
                  value: 9583.0
                }
              }, {
                key: '9mv',
                doc_count: 1,
                1: {
                  value: 2258.0
                }
              }]
            },
            1: {
              value: 6617.333333333333
            }
          }, {
            key: 'info',
            doc_count: 226,
            3: {
              buckets: [{
                key: 'drk',
                doc_count: 6,
                1: {
                  value: 5816.5
                }
              }, {
                key: 'dp8',
                doc_count: 5,
                1: {
                  value: 4725.6
                }
              }, {
                key: 'dr2',
                doc_count: 4,
                1: {
                  value: 5185.5
                }
              }, {
                key: 'dp4',
                doc_count: 3,
                1: {
                  value: 5492.666666666667
                }
              }, {
                key: 'dp2',
                doc_count: 3,
                1: {
                  value: 7114.666666666667
                }
              }, {
                key: 'djk',
                doc_count: 3,
                1: {
                  value: 7334.0
                }
              }, {
                key: 'dhv',
                doc_count: 3,
                1: {
                  value: 7685.0
                }
              }, {
                key: '9yw',
                doc_count: 3,
                1: {
                  value: 3650.6666666666665
                }
              }, {
                key: '9q6',
                doc_count: 3,
                1: {
                  value: 2266.3333333333335
                }
              }, {
                key: '9q5',
                doc_count: 3,
                1: {
                  value: 4570.666666666667
                }
              }, {
                key: 'drs',
                doc_count: 2,
                1: {
                  value: 13974.5
                }
              }, {
                key: 'dpp',
                doc_count: 2,
                1: {
                  value: 8868.0
                }
              }, {
                key: 'dpm',
                doc_count: 2,
                1: {
                  value: 780.0
                }
              }, {
                key: 'dpk',
                doc_count: 2,
                1: {
                  value: 5558.5
                }
              }, {
                key: 'dpd',
                doc_count: 2,
                1: {
                  value: 8409.5
                }
              }, {
                key: 'dp1',
                doc_count: 2,
                1: {
                  value: 879.0
                }
              }, {
                key: 'dnv',
                doc_count: 2,
                1: {
                  value: 15911.0
                }
              }, {
                key: 'dnc',
                doc_count: 2,
                1: {
                  value: 4627.5
                }
              }, {
                key: 'dn3',
                doc_count: 2,
                1: {
                  value: 6754.5
                }
              }, {
                key: 'de3',
                doc_count: 2,
                1: {
                  value: 11662.5
                }
              }, {
                key: 'cbx',
                doc_count: 2,
                1: {
                  value: 5404.0
                }
              }, {
                key: 'cb4',
                doc_count: 2,
                1: {
                  value: 5010.5
                }
              }, {
                key: 'c80',
                doc_count: 2,
                1: {
                  value: 11369.0
                }
              }, {
                key: 'c2m',
                doc_count: 2,
                1: {
                  value: 5512.5
                }
              }, {
                key: 'bfs',
                doc_count: 2,
                1: {
                  value: 3362.5
                }
              }, {
                key: 'bed',
                doc_count: 2,
                1: {
                  value: 6380.0
                }
              }, {
                key: 'bd7',
                doc_count: 2,
                1: {
                  value: 6226.0
                }
              }, {
                key: 'b75',
                doc_count: 2,
                1: {
                  value: 8579.0
                }
              }, {
                key: '9zv',
                doc_count: 2,
                1: {
                  value: 6966.0
                }
              }, {
                key: '9zm',
                doc_count: 2,
                1: {
                  value: 9360.0
                }
              }, {
                key: '9zd',
                doc_count: 2,
                1: {
                  value: 3168.0
                }
              }, {
                key: '9z7',
                doc_count: 2,
                1: {
                  value: 1946.5
                }
              }, {
                key: '9z3',
                doc_count: 2,
                1: {
                  value: 8152.0
                }
              }, {
                key: '9yu',
                doc_count: 2,
                1: {
                  value: 7185.0
                }
              }, {
                key: '9yj',
                doc_count: 2,
                1: {
                  value: 5479.0
                }
              }, {
                key: '9y7',
                doc_count: 2,
                1: {
                  value: 2714.5
                }
              }, {
                key: '9y6',
                doc_count: 2,
                1: {
                  value: 3731.5
                }
              }, {
                key: '9vz',
                doc_count: 2,
                1: {
                  value: 4638.5
                }
              }, {
                key: '9vf',
                doc_count: 2,
                1: {
                  value: 9329.5
                }
              }, {
                key: '9tf',
                doc_count: 2,
                1: {
                  value: 14842.5
                }
              }, {
                key: '9t9',
                doc_count: 2,
                1: {
                  value: 4606.5
                }
              }, {
                key: '9q9',
                doc_count: 2,
                1: {
                  value: 5614.5
                }
              }, {
                key: '9pp',
                doc_count: 2,
                1: {
                  value: 8451.5
                }
              }, {
                key: 'f05',
                doc_count: 1,
                1: {
                  value: 4194.0
                }
              }, {
                key: 'dry',
                doc_count: 1,
                1: {
                  value: 0.0
                }
              }, {
                key: 'dru',
                doc_count: 1,
                1: {
                  value: 9789.0
                }
              }, {
                key: 'drm',
                doc_count: 1,
                1: {
                  value: 11.0
                }
              }, {
                key: 'drf',
                doc_count: 1,
                1: {
                  value: 7691.0
                }
              }, {
                key: 'dr8',
                doc_count: 1,
                1: {
                  value: 6608.0
                }
              }, {
                key: 'dr5',
                doc_count: 1,
                1: {
                  value: 772.0
                }
              }, {
                key: 'dr4',
                doc_count: 1,
                1: {
                  value: 7810.0
                }
              }, {
                key: 'dr3',
                doc_count: 1,
                1: {
                  value: 4357.0
                }
              }, {
                key: 'dr0',
                doc_count: 1,
                1: {
                  value: 3102.0
                }
              }, {
                key: 'dq0',
                doc_count: 1,
                1: {
                  value: 4521.0
                }
              }, {
                key: 'dpx',
                doc_count: 1,
                1: {
                  value: 6593.0
                }
              }, {
                key: 'dps',
                doc_count: 1,
                1: {
                  value: 16393.0
                }
              }, {
                key: 'dpr',
                doc_count: 1,
                1: {
                  value: 6232.0
                }
              }, {
                key: 'dpq',
                doc_count: 1,
                1: {
                  value: 9885.0
                }
              }, {
                key: 'dpn',
                doc_count: 1,
                1: {
                  value: 5479.0
                }
              }, {
                key: 'dph',
                doc_count: 1,
                1: {
                  value: 8536.0
                }
              }, {
                key: 'dpe',
                doc_count: 1,
                1: {
                  value: 3799.0
                }
              }, {
                key: 'dpc',
                doc_count: 1,
                1: {
                  value: 4329.0
                }
              }, {
                key: 'dp7',
                doc_count: 1,
                1: {
                  value: 1916.0
                }
              }, {
                key: 'dp5',
                doc_count: 1,
                1: {
                  value: 3647.0
                }
              }, {
                key: 'dp3',
                doc_count: 1,
                1: {
                  value: 7806.0
                }
              }, {
                key: 'dny',
                doc_count: 1,
                1: {
                  value: 9560.0
                }
              }, {
                key: 'dnu',
                doc_count: 1,
                1: {
                  value: 4876.0
                }
              }, {
                key: 'dns',
                doc_count: 1,
                1: {
                  value: 9413.0
                }
              }, {
                key: 'dnn',
                doc_count: 1,
                1: {
                  value: 1764.0
                }
              }, {
                key: 'dnm',
                doc_count: 1,
                1: {
                  value: 4698.0
                }
              }, {
                key: 'dnb',
                doc_count: 1,
                1: {
                  value: 2211.0
                }
              }, {
                key: 'dn6',
                doc_count: 1,
                1: {
                  value: 9586.0
                }
              }, {
                key: 'dn1',
                doc_count: 1,
                1: {
                  value: 11234.0
                }
              }, {
                key: 'dn0',
                doc_count: 1,
                1: {
                  value: 1522.0
                }
              }, {
                key: 'djy',
                doc_count: 1,
                1: {
                  value: 6285.0
                }
              }, {
                key: 'djv',
                doc_count: 1,
                1: {
                  value: 3839.0
                }
              }, {
                key: 'dju',
                doc_count: 1,
                1: {
                  value: 8786.0
                }
              }, {
                key: 'djs',
                doc_count: 1,
                1: {
                  value: 5489.0
                }
              }, {
                key: 'djq',
                doc_count: 1,
                1: {
                  value: 1565.0
                }
              }, {
                key: 'djj',
                doc_count: 1,
                1: {
                  value: 9064.0
                }
              }, {
                key: 'djg',
                doc_count: 1,
                1: {
                  value: 6212.0
                }
              }, {
                key: 'djf',
                doc_count: 1,
                1: {
                  value: 9412.0
                }
              }, {
                key: 'djd',
                doc_count: 1,
                1: {
                  value: 5150.0
                }
              }, {
                key: 'djc',
                doc_count: 1,
                1: {
                  value: 6302.0
                }
              }, {
                key: 'dj9',
                doc_count: 1,
                1: {
                  value: 657.0
                }
              }, {
                key: 'dhy',
                doc_count: 1,
                1: {
                  value: 15927.0
                }
              }, {
                key: 'cbq',
                doc_count: 1,
                1: {
                  value: 9735.0
                }
              }, {
                key: 'cbp',
                doc_count: 1,
                1: {
                  value: 3752.0
                }
              }, {
                key: 'cb5',
                doc_count: 1,
                1: {
                  value: 5086.0
                }
              }, {
                key: 'c8t',
                doc_count: 1,
                1: {
                  value: 6766.0
                }
              }, {
                key: 'c8j',
                doc_count: 1,
                1: {
                  value: 6554.0
                }
              }, {
                key: 'c88',
                doc_count: 1,
                1: {
                  value: 238.0
                }
              }, {
                key: 'c84',
                doc_count: 1,
                1: {
                  value: 5856.0
                }
              }, {
                key: 'c83',
                doc_count: 1,
                1: {
                  value: 3852.0
                }
              }, {
                key: 'c82',
                doc_count: 1,
                1: {
                  value: 9531.0
                }
              }, {
                key: 'c2w',
                doc_count: 1,
                1: {
                  value: 8572.0
                }
              }, {
                key: 'c2t',
                doc_count: 1,
                1: {
                  value: 6718.0
                }
              }, {
                key: 'c2q',
                doc_count: 1,
                1: {
                  value: 0.0
                }
              }, {
                key: 'c2k',
                doc_count: 1,
                1: {
                  value: 5383.0
                }
              }, {
                key: 'c27',
                doc_count: 1,
                1: {
                  value: 3169.0
                }
              }, {
                key: 'c22',
                doc_count: 1,
                1: {
                  value: 9789.0
                }
              }, {
                key: 'c1f',
                doc_count: 1,
                1: {
                  value: 8930.0
                }
              }, {
                key: 'bk1',
                doc_count: 1,
                1: {
                  value: 3424.0
                }
              }, {
                key: 'bfx',
                doc_count: 1,
                1: {
                  value: 5247.0
                }
              }, {
                key: 'bff',
                doc_count: 1,
                1: {
                  value: 1651.0
                }
              }, {
                key: 'beu',
                doc_count: 1,
                1: {
                  value: 2003.0
                }
              }, {
                key: 'bd5',
                doc_count: 1,
                1: {
                  value: 5653.0
                }
              }, {
                key: 'bd4',
                doc_count: 1,
                1: {
                  value: 5225.0
                }
              }, {
                key: 'b7t',
                doc_count: 1,
                1: {
                  value: 8983.0
                }
              }, {
                key: 'b6y',
                doc_count: 1,
                1: {
                  value: 8869.0
                }
              }, {
                key: 'b6x',
                doc_count: 1,
                1: {
                  value: 15707.0
                }
              }, {
                key: 'b6s',
                doc_count: 1,
                1: {
                  value: 4106.0
                }
              }, {
                key: 'b6f',
                doc_count: 1,
                1: {
                  value: 7733.0
                }
              }, {
                key: 'b3y',
                doc_count: 1,
                1: {
                  value: 4456.0
                }
              }, {
                key: 'b3v',
                doc_count: 1,
                1: {
                  value: 6471.0
                }
              }, {
                key: 'b1k',
                doc_count: 1,
                1: {
                  value: 2814.0
                }
              }, {
                key: '9zx',
                doc_count: 1,
                1: {
                  value: 19729.0
                }
              }, {
                key: '9zt',
                doc_count: 1,
                1: {
                  value: 1904.0
                }
              }, {
                key: '9zr',
                doc_count: 1,
                1: {
                  value: 8056.0
                }
              }, {
                key: '9zq',
                doc_count: 1,
                1: {
                  value: 0.0
                }
              }, {
                key: '9zg',
                doc_count: 1,
                1: {
                  value: 3421.0
                }
              }, {
                key: '9zf',
                doc_count: 1,
                1: {
                  value: 15148.0
                }
              }, {
                key: '9z8',
                doc_count: 1,
                1: {
                  value: 7285.0
                }
              }, {
                key: '9yq',
                doc_count: 1,
                1: {
                  value: 3605.0
                }
              }, {
                key: '9yn',
                doc_count: 1,
                1: {
                  value: 8572.0
                }
              }, {
                key: '9ym',
                doc_count: 1,
                1: {
                  value: 17033.0
                }
              }, {
                key: '9yg',
                doc_count: 1,
                1: {
                  value: 2668.0
                }
              }, {
                key: '9yd',
                doc_count: 1,
                1: {
                  value: 6776.0
                }
              }, {
                key: '9y2',
                doc_count: 1,
                1: {
                  value: 1647.0
                }
              }, {
                key: '9xu',
                doc_count: 1,
                1: {
                  value: 2128.0
                }
              }, {
                key: '9xt',
                doc_count: 1,
                1: {
                  value: 5497.0
                }
              }, {
                key: '9xp',
                doc_count: 1,
                1: {
                  value: 9554.0
                }
              }, {
                key: '9xj',
                doc_count: 1,
                1: {
                  value: 3612.0
                }
              }, {
                key: '9xh',
                doc_count: 1,
                1: {
                  value: 7540.0
                }
              }, {
                key: '9x6',
                doc_count: 1,
                1: {
                  value: 2156.0
                }
              }, {
                key: '9x4',
                doc_count: 1,
                1: {
                  value: 11128.0
                }
              }, {
                key: '9x0',
                doc_count: 1,
                1: {
                  value: 8017.0
                }
              }, {
                key: '9wx',
                doc_count: 1,
                1: {
                  value: 7155.0
                }
              }, {
                key: '9wv',
                doc_count: 1,
                1: {
                  value: 9812.0
                }
              }, {
                key: '9wu',
                doc_count: 1,
                1: {
                  value: 7419.0
                }
              }, {
                key: '9wm',
                doc_count: 1,
                1: {
                  value: 7490.0
                }
              }, {
                key: '9wk',
                doc_count: 1,
                1: {
                  value: 5452.0
                }
              }, {
                key: '9w8',
                doc_count: 1,
                1: {
                  value: 617.0
                }
              }, {
                key: '9vx',
                doc_count: 1,
                1: {
                  value: 0.0
                }
              }, {
                key: '9vv',
                doc_count: 1,
                1: {
                  value: 2555.0
                }
              }, {
                key: '9vu',
                doc_count: 1,
                1: {
                  value: 9007.0
                }
              }, {
                key: '9vp',
                doc_count: 1,
                1: {
                  value: 15422.0
                }
              }, {
                key: '9vm',
                doc_count: 1,
                1: {
                  value: 5158.0
                }
              }, {
                key: '9vk',
                doc_count: 1,
                1: {
                  value: 0.0
                }
              }, {
                key: '9ve',
                doc_count: 1,
                1: {
                  value: 2654.0
                }
              }, {
                key: '9v6',
                doc_count: 1,
                1: {
                  value: 2503.0
                }
              }, {
                key: '9uf',
                doc_count: 1,
                1: {
                  value: 8226.0
                }
              }, {
                key: '9tv',
                doc_count: 1,
                1: {
                  value: 2870.0
                }
              }, {
                key: '9tt',
                doc_count: 1,
                1: {
                  value: 10154.0
                }
              }, {
                key: '9tb',
                doc_count: 1,
                1: {
                  value: 8253.0
                }
              }, {
                key: '9rw',
                doc_count: 1,
                1: {
                  value: 6959.0
                }
              }, {
                key: '9rk',
                doc_count: 1,
                1: {
                  value: 9740.0
                }
              }, {
                key: '9rc',
                doc_count: 1,
                1: {
                  value: 6436.0
                }
              }, {
                key: '9rb',
                doc_count: 1,
                1: {
                  value: 0.0
                }
              }, {
                key: '9r3',
                doc_count: 1,
                1: {
                  value: 35.0
                }
              }, {
                key: '9r2',
                doc_count: 1,
                1: {
                  value: 2409.0
                }
              }, {
                key: '9qh',
                doc_count: 1,
                1: {
                  value: 360.0
                }
              }, {
                key: '9qc',
                doc_count: 1,
                1: {
                  value: 2411.0
                }
              }, {
                key: '9nz',
                doc_count: 1,
                1: {
                  value: 3879.0
                }
              }, {
                key: '9mv',
                doc_count: 1,
                1: {
                  value: 2258.0
                }
              }, {
                key: '9mu',
                doc_count: 1,
                1: {
                  value: 0.0
                }
              }, {
                key: '87z',
                doc_count: 1,
                1: {
                  value: 4760.0
                }
              }]
            },
            1: {
              value: 6049.929203539823
            }
          }, {
            key: 'login',
            doc_count: 18,
            3: {
              buckets: [{
                key: '9yk',
                doc_count: 2,
                1: {
                  value: 7779.5
                }
              }, {
                key: 'drk',
                doc_count: 1,
                1: {
                  value: 9934.0
                }
              }, {
                key: 'dpu',
                doc_count: 1,
                1: {
                  value: 4143.0
                }
              }, {
                key: 'dnk',
                doc_count: 1,
                1: {
                  value: 9645.0
                }
              }, {
                key: 'djn',
                doc_count: 1,
                1: {
                  value: 3336.0
                }
              }, {
                key: 'djc',
                doc_count: 1,
                1: {
                  value: 8727.0
                }
              }, {
                key: 'cbn',
                doc_count: 1,
                1: {
                  value: 9120.0
                }
              }, {
                key: 'c8w',
                doc_count: 1,
                1: {
                  value: 8630.0
                }
              }, {
                key: 'c8m',
                doc_count: 1,
                1: {
                  value: 2883.0
                }
              }, {
                key: '9zs',
                doc_count: 1,
                1: {
                  value: 5011.0
                }
              }, {
                key: '9zn',
                doc_count: 1,
                1: {
                  value: 2085.0
                }
              }, {
                key: '9yp',
                doc_count: 1,
                1: {
                  value: 5994.0
                }
              }, {
                key: '9yd',
                doc_count: 1,
                1: {
                  value: 4162.0
                }
              }, {
                key: '9w5',
                doc_count: 1,
                1: {
                  value: 4259.0
                }
              }, {
                key: '9vm',
                doc_count: 1,
                1: {
                  value: 9483.0
                }
              }, {
                key: '9qq',
                doc_count: 1,
                1: {
                  value: 262.0
                }
              }, {
                key: '9q7',
                doc_count: 1,
                1: {
                  value: 2276.0
                }
              }]
            },
            1: {
              value: 5861.611111111111
            }
          }, {
            key: 'success',
            doc_count: 255,
            3: {
              buckets: [{
                key: 'drk',
                doc_count: 7,
                1: {
                  value: 6404.714285714285
                }
              }, {
                key: 'dr2',
                doc_count: 4,
                1: {
                  value: 5185.5
                }
              }, {
                key: 'dp8',
                doc_count: 4,
                1: {
                  value: 3557.0
                }
              }, {
                key: 'dhv',
                doc_count: 4,
                1: {
                  value: 7831.5
                }
              }, {
                key: 'drs',
                doc_count: 3,
                1: {
                  value: 9316.333333333334
                }
              }, {
                key: 'dpp',
                doc_count: 3,
                1: {
                  value: 7718.0
                }
              }, {
                key: 'dp4',
                doc_count: 3,
                1: {
                  value: 5492.666666666667
                }
              }, {
                key: 'dp2',
                doc_count: 3,
                1: {
                  value: 7114.666666666667
                }
              }, {
                key: 'dnc',
                doc_count: 3,
                1: {
                  value: 7833.333333333333
                }
              }, {
                key: 'dn3',
                doc_count: 3,
                1: {
                  value: 6232.666666666667
                }
              }, {
                key: 'djk',
                doc_count: 3,
                1: {
                  value: 7334.0
                }
              }, {
                key: '9yw',
                doc_count: 3,
                1: {
                  value: 3650.6666666666665
                }
              }, {
                key: '9qc',
                doc_count: 3,
                1: {
                  value: 3241.6666666666665
                }
              }, {
                key: '9q9',
                doc_count: 3,
                1: {
                  value: 5709.333333333333
                }
              }, {
                key: 'dr4',
                doc_count: 2,
                1: {
                  value: 8821.0
                }
              }, {
                key: 'dpk',
                doc_count: 2,
                1: {
                  value: 5558.5
                }
              }, {
                key: 'dph',
                doc_count: 2,
                1: {
                  value: 11828.5
                }
              }, {
                key: 'dpd',
                doc_count: 2,
                1: {
                  value: 8409.5
                }
              }, {
                key: 'dp3',
                doc_count: 2,
                1: {
                  value: 8733.0
                }
              }, {
                key: 'dny',
                doc_count: 2,
                1: {
                  value: 4780.0
                }
              }, {
                key: 'dnv',
                doc_count: 2,
                1: {
                  value: 15911.0
                }
              }, {
                key: 'dje',
                doc_count: 2,
                1: {
                  value: 4216.5
                }
              }, {
                key: 'djd',
                doc_count: 2,
                1: {
                  value: 2702.5
                }
              }, {
                key: 'djc',
                doc_count: 2,
                1: {
                  value: 7514.5
                }
              }, {
                key: 'de3',
                doc_count: 2,
                1: {
                  value: 11662.5
                }
              }, {
                key: 'cbx',
                doc_count: 2,
                1: {
                  value: 5404.0
                }
              }, {
                key: 'cbq',
                doc_count: 2,
                1: {
                  value: 9382.0
                }
              }, {
                key: 'c80',
                doc_count: 2,
                1: {
                  value: 11369.0
                }
              }, {
                key: 'c2m',
                doc_count: 2,
                1: {
                  value: 5512.5
                }
              }, {
                key: 'bfs',
                doc_count: 2,
                1: {
                  value: 3362.5
                }
              }, {
                key: 'bd7',
                doc_count: 2,
                1: {
                  value: 6226.0
                }
              }, {
                key: 'b75',
                doc_count: 2,
                1: {
                  value: 8579.0
                }
              }, {
                key: '9zv',
                doc_count: 2,
                1: {
                  value: 6966.0
                }
              }, {
                key: '9zd',
                doc_count: 2,
                1: {
                  value: 3168.0
                }
              }, {
                key: '9z7',
                doc_count: 2,
                1: {
                  value: 1946.5
                }
              }, {
                key: '9z3',
                doc_count: 2,
                1: {
                  value: 8152.0
                }
              }, {
                key: '9yk',
                doc_count: 2,
                1: {
                  value: 7779.5
                }
              }, {
                key: '9yj',
                doc_count: 2,
                1: {
                  value: 5479.0
                }
              }, {
                key: '9yd',
                doc_count: 2,
                1: {
                  value: 5469.0
                }
              }, {
                key: '9y7',
                doc_count: 2,
                1: {
                  value: 2714.5
                }
              }, {
                key: '9wx',
                doc_count: 2,
                1: {
                  value: 4946.5
                }
              }, {
                key: '9vz',
                doc_count: 2,
                1: {
                  value: 4638.5
                }
              }, {
                key: '9vm',
                doc_count: 2,
                1: {
                  value: 7320.5
                }
              }, {
                key: '9tf',
                doc_count: 2,
                1: {
                  value: 14842.5
                }
              }, {
                key: '9t9',
                doc_count: 2,
                1: {
                  value: 4606.5
                }
              }, {
                key: '9q6',
                doc_count: 2,
                1: {
                  value: 1364.5
                }
              }, {
                key: '9q5',
                doc_count: 2,
                1: {
                  value: 2566.0
                }
              }, {
                key: 'f05',
                doc_count: 1,
                1: {
                  value: 4194.0
                }
              }, {
                key: 'dry',
                doc_count: 1,
                1: {
                  value: 0.0
                }
              }, {
                key: 'dru',
                doc_count: 1,
                1: {
                  value: 9789.0
                }
              }, {
                key: 'drm',
                doc_count: 1,
                1: {
                  value: 11.0
                }
              }, {
                key: 'drf',
                doc_count: 1,
                1: {
                  value: 7691.0
                }
              }, {
                key: 'dr9',
                doc_count: 1,
                1: {
                  value: 9623.0
                }
              }, {
                key: 'dr8',
                doc_count: 1,
                1: {
                  value: 6608.0
                }
              }, {
                key: 'dr5',
                doc_count: 1,
                1: {
                  value: 772.0
                }
              }, {
                key: 'dr3',
                doc_count: 1,
                1: {
                  value: 4357.0
                }
              }, {
                key: 'dr0',
                doc_count: 1,
                1: {
                  value: 3102.0
                }
              }, {
                key: 'dqb',
                doc_count: 1,
                1: {
                  value: 5836.0
                }
              }, {
                key: 'dq9',
                doc_count: 1,
                1: {
                  value: 9405.0
                }
              }, {
                key: 'dq0',
                doc_count: 1,
                1: {
                  value: 4521.0
                }
              }, {
                key: 'dpx',
                doc_count: 1,
                1: {
                  value: 6593.0
                }
              }, {
                key: 'dpu',
                doc_count: 1,
                1: {
                  value: 4143.0
                }
              }, {
                key: 'dpr',
                doc_count: 1,
                1: {
                  value: 6232.0
                }
              }, {
                key: 'dpq',
                doc_count: 1,
                1: {
                  value: 9885.0
                }
              }, {
                key: 'dpm',
                doc_count: 1,
                1: {
                  value: 786.0
                }
              }, {
                key: 'dpc',
                doc_count: 1,
                1: {
                  value: 4329.0
                }
              }, {
                key: 'dp7',
                doc_count: 1,
                1: {
                  value: 1916.0
                }
              }, {
                key: 'dp5',
                doc_count: 1,
                1: {
                  value: 3647.0
                }
              }, {
                key: 'dp1',
                doc_count: 1,
                1: {
                  value: 1750.0
                }
              }, {
                key: 'dnt',
                doc_count: 1,
                1: {
                  value: 2400.0
                }
              }, {
                key: 'dns',
                doc_count: 1,
                1: {
                  value: 9413.0
                }
              }, {
                key: 'dnp',
                doc_count: 1,
                1: {
                  value: 3508.0
                }
              }, {
                key: 'dnn',
                doc_count: 1,
                1: {
                  value: 1764.0
                }
              }, {
                key: 'dnk',
                doc_count: 1,
                1: {
                  value: 9645.0
                }
              }, {
                key: 'dnj',
                doc_count: 1,
                1: {
                  value: 4097.0
                }
              }, {
                key: 'dnh',
                doc_count: 1,
                1: {
                  value: 9312.0
                }
              }, {
                key: 'dnb',
                doc_count: 1,
                1: {
                  value: 2211.0
                }
              }, {
                key: 'dn8',
                doc_count: 1,
                1: {
                  value: 0.0
                }
              }, {
                key: 'dn7',
                doc_count: 1,
                1: {
                  value: 5071.0
                }
              }, {
                key: 'dn6',
                doc_count: 1,
                1: {
                  value: 9586.0
                }
              }, {
                key: 'dn4',
                doc_count: 1,
                1: {
                  value: 3918.0
                }
              }, {
                key: 'dn1',
                doc_count: 1,
                1: {
                  value: 11234.0
                }
              }, {
                key: 'dn0',
                doc_count: 1,
                1: {
                  value: 1522.0
                }
              }, {
                key: 'dju',
                doc_count: 1,
                1: {
                  value: 8786.0
                }
              }, {
                key: 'djt',
                doc_count: 1,
                1: {
                  value: 3441.0
                }
              }, {
                key: 'djs',
                doc_count: 1,
                1: {
                  value: 5489.0
                }
              }, {
                key: 'djq',
                doc_count: 1,
                1: {
                  value: 1565.0
                }
              }, {
                key: 'djn',
                doc_count: 1,
                1: {
                  value: 3336.0
                }
              }, {
                key: 'djj',
                doc_count: 1,
                1: {
                  value: 9064.0
                }
              }, {
                key: 'djg',
                doc_count: 1,
                1: {
                  value: 6212.0
                }
              }, {
                key: 'djf',
                doc_count: 1,
                1: {
                  value: 9412.0
                }
              }, {
                key: 'dj9',
                doc_count: 1,
                1: {
                  value: 657.0
                }
              }, {
                key: 'dhy',
                doc_count: 1,
                1: {
                  value: 0.0
                }
              }, {
                key: 'cbr',
                doc_count: 1,
                1: {
                  value: 7813.0
                }
              }, {
                key: 'cbp',
                doc_count: 1,
                1: {
                  value: 3752.0
                }
              }, {
                key: 'cbn',
                doc_count: 1,
                1: {
                  value: 9120.0
                }
              }, {
                key: 'cb7',
                doc_count: 1,
                1: {
                  value: 3324.0
                }
              }, {
                key: 'cb5',
                doc_count: 1,
                1: {
                  value: 5086.0
                }
              }, {
                key: 'cb4',
                doc_count: 1,
                1: {
                  value: 345.0
                }
              }, {
                key: 'c8w',
                doc_count: 1,
                1: {
                  value: 8630.0
                }
              }, {
                key: 'c8t',
                doc_count: 1,
                1: {
                  value: 6766.0
                }
              }, {
                key: 'c8m',
                doc_count: 1,
                1: {
                  value: 2883.0
                }
              }, {
                key: 'c8j',
                doc_count: 1,
                1: {
                  value: 6554.0
                }
              }, {
                key: 'c88',
                doc_count: 1,
                1: {
                  value: 238.0
                }
              }, {
                key: 'c84',
                doc_count: 1,
                1: {
                  value: 5856.0
                }
              }, {
                key: 'c83',
                doc_count: 1,
                1: {
                  value: 3852.0
                }
              }, {
                key: 'c2w',
                doc_count: 1,
                1: {
                  value: 8572.0
                }
              }, {
                key: 'c2t',
                doc_count: 1,
                1: {
                  value: 6718.0
                }
              }, {
                key: 'c2q',
                doc_count: 1,
                1: {
                  value: 0.0
                }
              }, {
                key: 'c2k',
                doc_count: 1,
                1: {
                  value: 9301.0
                }
              }, {
                key: 'c28',
                doc_count: 1,
                1: {
                  value: 5607.0
                }
              }, {
                key: 'c27',
                doc_count: 1,
                1: {
                  value: 3169.0
                }
              }, {
                key: 'c23',
                doc_count: 1,
                1: {
                  value: 5636.0
                }
              }, {
                key: 'c22',
                doc_count: 1,
                1: {
                  value: 9789.0
                }
              }, {
                key: 'c1f',
                doc_count: 1,
                1: {
                  value: 8930.0
                }
              }, {
                key: 'bk1',
                doc_count: 1,
                1: {
                  value: 3424.0
                }
              }, {
                key: 'bfx',
                doc_count: 1,
                1: {
                  value: 5247.0
                }
              }, {
                key: 'bff',
                doc_count: 1,
                1: {
                  value: 1651.0
                }
              }, {
                key: 'beu',
                doc_count: 1,
                1: {
                  value: 2003.0
                }
              }, {
                key: 'bed',
                doc_count: 1,
                1: {
                  value: 3690.0
                }
              }, {
                key: 'bd5',
                doc_count: 1,
                1: {
                  value: 5653.0
                }
              }, {
                key: 'b7t',
                doc_count: 1,
                1: {
                  value: 8983.0
                }
              }, {
                key: 'b6y',
                doc_count: 1,
                1: {
                  value: 8869.0
                }
              }, {
                key: 'b6x',
                doc_count: 1,
                1: {
                  value: 15707.0
                }
              }, {
                key: 'b6s',
                doc_count: 1,
                1: {
                  value: 4106.0
                }
              }, {
                key: 'b6f',
                doc_count: 1,
                1: {
                  value: 7733.0
                }
              }, {
                key: 'b3y',
                doc_count: 1,
                1: {
                  value: 4456.0
                }
              }, {
                key: 'b3v',
                doc_count: 1,
                1: {
                  value: 6471.0
                }
              }, {
                key: 'b1k',
                doc_count: 1,
                1: {
                  value: 2814.0
                }
              }, {
                key: '9zt',
                doc_count: 1,
                1: {
                  value: 1904.0
                }
              }, {
                key: '9zs',
                doc_count: 1,
                1: {
                  value: 5011.0
                }
              }, {
                key: '9zr',
                doc_count: 1,
                1: {
                  value: 8056.0
                }
              }, {
                key: '9zq',
                doc_count: 1,
                1: {
                  value: 0.0
                }
              }, {
                key: '9zp',
                doc_count: 1,
                1: {
                  value: 3585.0
                }
              }, {
                key: '9zn',
                doc_count: 1,
                1: {
                  value: 2085.0
                }
              }, {
                key: '9zm',
                doc_count: 1,
                1: {
                  value: 9917.0
                }
              }, {
                key: '9zk',
                doc_count: 1,
                1: {
                  value: 2115.0
                }
              }, {
                key: '9zg',
                doc_count: 1,
                1: {
                  value: 3421.0
                }
              }, {
                key: '9zf',
                doc_count: 1,
                1: {
                  value: 15148.0
                }
              }, {
                key: '9z8',
                doc_count: 1,
                1: {
                  value: 7285.0
                }
              }, {
                key: '9yu',
                doc_count: 1,
                1: {
                  value: 8391.0
                }
              }, {
                key: '9yp',
                doc_count: 1,
                1: {
                  value: 5994.0
                }
              }, {
                key: '9yn',
                doc_count: 1,
                1: {
                  value: 8572.0
                }
              }, {
                key: '9ym',
                doc_count: 1,
                1: {
                  value: 17033.0
                }
              }, {
                key: '9yg',
                doc_count: 1,
                1: {
                  value: 2668.0
                }
              }, {
                key: '9y8',
                doc_count: 1,
                1: {
                  value: 1505.0
                }
              }, {
                key: '9y6',
                doc_count: 1,
                1: {
                  value: 7463.0
                }
              }, {
                key: '9y2',
                doc_count: 1,
                1: {
                  value: 1647.0
                }
              }, {
                key: '9y1',
                doc_count: 1,
                1: {
                  value: 7033.0
                }
              }, {
                key: '9xu',
                doc_count: 1,
                1: {
                  value: 2128.0
                }
              }, {
                key: '9xt',
                doc_count: 1,
                1: {
                  value: 5497.0
                }
              }, {
                key: '9xp',
                doc_count: 1,
                1: {
                  value: 9554.0
                }
              }, {
                key: '9xj',
                doc_count: 1,
                1: {
                  value: 3612.0
                }
              }, {
                key: '9xh',
                doc_count: 1,
                1: {
                  value: 7540.0
                }
              }, {
                key: '9xf',
                doc_count: 1,
                1: {
                  value: 9364.0
                }
              }, {
                key: '9x6',
                doc_count: 1,
                1: {
                  value: 2156.0
                }
              }, {
                key: '9x4',
                doc_count: 1,
                1: {
                  value: 11128.0
                }
              }, {
                key: '9x0',
                doc_count: 1,
                1: {
                  value: 8017.0
                }
              }, {
                key: '9wv',
                doc_count: 1,
                1: {
                  value: 9812.0
                }
              }, {
                key: '9wm',
                doc_count: 1,
                1: {
                  value: 7490.0
                }
              }, {
                key: '9wk',
                doc_count: 1,
                1: {
                  value: 5452.0
                }
              }, {
                key: '9w8',
                doc_count: 1,
                1: {
                  value: 617.0
                }
              }, {
                key: '9w5',
                doc_count: 1,
                1: {
                  value: 4259.0
                }
              }, {
                key: '9w4',
                doc_count: 1,
                1: {
                  value: 0.0
                }
              }, {
                key: '9vx',
                doc_count: 1,
                1: {
                  value: 0.0
                }
              }, {
                key: '9vu',
                doc_count: 1,
                1: {
                  value: 9007.0
                }
              }, {
                key: '9vp',
                doc_count: 1,
                1: {
                  value: 15422.0
                }
              }, {
                key: '9vk',
                doc_count: 1,
                1: {
                  value: 0.0
                }
              }, {
                key: '9ve',
                doc_count: 1,
                1: {
                  value: 2654.0
                }
              }, {
                key: '9v6',
                doc_count: 1,
                1: {
                  value: 2503.0
                }
              }, {
                key: '9uf',
                doc_count: 1,
                1: {
                  value: 8226.0
                }
              }, {
                key: '9tv',
                doc_count: 1,
                1: {
                  value: 2870.0
                }
              }, {
                key: '9tt',
                doc_count: 1,
                1: {
                  value: 10154.0
                }
              }, {
                key: '9tb',
                doc_count: 1,
                1: {
                  value: 8253.0
                }
              }, {
                key: '9rc',
                doc_count: 1,
                1: {
                  value: 6436.0
                }
              }, {
                key: '9rb',
                doc_count: 1,
                1: {
                  value: 0.0
                }
              }, {
                key: '9r3',
                doc_count: 1,
                1: {
                  value: 35.0
                }
              }, {
                key: '9r2',
                doc_count: 1,
                1: {
                  value: 2409.0
                }
              }, {
                key: '9qq',
                doc_count: 1,
                1: {
                  value: 262.0
                }
              }, {
                key: '9qh',
                doc_count: 1,
                1: {
                  value: 360.0
                }
              }, {
                key: '9qb',
                doc_count: 1,
                1: {
                  value: 1742.0
                }
              }, {
                key: '9q7',
                doc_count: 1,
                1: {
                  value: 2276.0
                }
              }, {
                key: '9pp',
                doc_count: 1,
                1: {
                  value: 7320.0
                }
              }, {
                key: '9nz',
                doc_count: 1,
                1: {
                  value: 3879.0
                }
              }, {
                key: '9mu',
                doc_count: 1,
                1: {
                  value: 0.0
                }
              }, {
                key: '8e9',
                doc_count: 1,
                1: {
                  value: 3324.0
                }
              }, {
                key: '87z',
                doc_count: 1,
                1: {
                  value: 4760.0
                }
              }]
            },
            1: {
              value: 5775.901960784314
            }
          }]
        }
      }
    };
  };
});
