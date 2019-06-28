/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ESResponse } from '../fetcher';

export const timeseriesResponse = ({
  took: 368,
  timed_out: false,
  _shards: {
    total: 90,
    successful: 90,
    skipped: 0,
    failed: 0
  },
  hits: {
    total: 1297673,
    max_score: 0,
    hits: []
  },
  aggregations: {
    transaction_results: {
      doc_count_error_upper_bound: 0,
      sum_other_doc_count: 0,
      buckets: [
        {
          key: 'A Custom Bucket (that should be last)',
          doc_count: 0,
          timeseries: { buckets: [] }
        },
        {
          key: 'HTTP 2xx',
          doc_count: 1127080,
          timeseries: {
            buckets: [
              {
                key_as_string: '2018-06-04T12:00:00.000Z',
                key: 1528113600000,
                doc_count: 16446
              },
              {
                key_as_string: '2018-06-04T15:00:00.000Z',
                key: 1528124400000,
                doc_count: 16292
              },
              {
                key_as_string: '2018-06-04T18:00:00.000Z',
                key: 1528135200000,
                doc_count: 16464
              },
              {
                key_as_string: '2018-06-04T21:00:00.000Z',
                key: 1528146000000,
                doc_count: 16497
              },
              {
                key_as_string: '2018-06-05T00:00:00.000Z',
                key: 1528156800000,
                doc_count: 16799
              },
              {
                key_as_string: '2018-06-05T03:00:00.000Z',
                key: 1528167600000,
                doc_count: 16561
              },
              {
                key_as_string: '2018-06-05T06:00:00.000Z',
                key: 1528178400000,
                doc_count: 16431
              },
              {
                key_as_string: '2018-06-05T09:00:00.000Z',
                key: 1528189200000,
                doc_count: 16383
              },
              {
                key_as_string: '2018-06-05T12:00:00.000Z',
                key: 1528200000000,
                doc_count: 16295
              },
              {
                key_as_string: '2018-06-05T15:00:00.000Z',
                key: 1528210800000,
                doc_count: 16702
              },
              {
                key_as_string: '2018-06-05T18:00:00.000Z',
                key: 1528221600000,
                doc_count: 16469
              },
              {
                key_as_string: '2018-06-05T21:00:00.000Z',
                key: 1528232400000,
                doc_count: 16466
              },
              {
                key_as_string: '2018-06-06T00:00:00.000Z',
                key: 1528243200000,
                doc_count: 16551
              },
              {
                key_as_string: '2018-06-06T03:00:00.000Z',
                key: 1528254000000,
                doc_count: 16675
              },
              {
                key_as_string: '2018-06-06T06:00:00.000Z',
                key: 1528264800000,
                doc_count: 16410
              },
              {
                key_as_string: '2018-06-06T09:00:00.000Z',
                key: 1528275600000,
                doc_count: 16247
              },
              {
                key_as_string: '2018-06-06T12:00:00.000Z',
                key: 1528286400000,
                doc_count: 15145
              },
              {
                key_as_string: '2018-06-06T15:00:00.000Z',
                key: 1528297200000,
                doc_count: 16178
              },
              {
                key_as_string: '2018-06-06T18:00:00.000Z',
                key: 1528308000000,
                doc_count: 16530
              },
              {
                key_as_string: '2018-06-06T21:00:00.000Z',
                key: 1528318800000,
                doc_count: 16211
              },
              {
                key_as_string: '2018-06-07T00:00:00.000Z',
                key: 1528329600000,
                doc_count: 16453
              },
              {
                key_as_string: '2018-06-07T03:00:00.000Z',
                key: 1528340400000,
                doc_count: 16503
              },
              {
                key_as_string: '2018-06-07T06:00:00.000Z',
                key: 1528351200000,
                doc_count: 16604
              },
              {
                key_as_string: '2018-06-07T09:00:00.000Z',
                key: 1528362000000,
                doc_count: 16522
              },
              {
                key_as_string: '2018-06-07T12:00:00.000Z',
                key: 1528372800000,
                doc_count: 16164
              },
              {
                key_as_string: '2018-06-07T15:00:00.000Z',
                key: 1528383600000,
                doc_count: 16520
              },
              {
                key_as_string: '2018-06-07T18:00:00.000Z',
                key: 1528394400000,
                doc_count: 16534
              },
              {
                key_as_string: '2018-06-07T21:00:00.000Z',
                key: 1528405200000,
                doc_count: 16311
              },
              {
                key_as_string: '2018-06-08T00:00:00.000Z',
                key: 1528416000000,
                doc_count: 16670
              },
              {
                key_as_string: '2018-06-08T03:00:00.000Z',
                key: 1528426800000,
                doc_count: 16192
              },
              {
                key_as_string: '2018-06-08T06:00:00.000Z',
                key: 1528437600000,
                doc_count: 16579
              },
              {
                key_as_string: '2018-06-08T09:00:00.000Z',
                key: 1528448400000,
                doc_count: 16330
              },
              {
                key_as_string: '2018-06-08T12:00:00.000Z',
                key: 1528459200000,
                doc_count: 16565
              },
              {
                key_as_string: '2018-06-08T15:00:00.000Z',
                key: 1528470000000,
                doc_count: 16543
              },
              {
                key_as_string: '2018-06-08T18:00:00.000Z',
                key: 1528480800000,
                doc_count: 16492
              },
              {
                key_as_string: '2018-06-08T21:00:00.000Z',
                key: 1528491600000,
                doc_count: 16404
              },
              {
                key_as_string: '2018-06-09T00:00:00.000Z',
                key: 1528502400000,
                doc_count: 4528
              },
              {
                key_as_string: '2018-06-09T03:00:00.000Z',
                key: 1528513200000,
                doc_count: 4557
              },
              {
                key_as_string: '2018-06-09T06:00:00.000Z',
                key: 1528524000000,
                doc_count: 4566
              },
              {
                key_as_string: '2018-06-09T09:00:00.000Z',
                key: 1528534800000,
                doc_count: 4586
              },
              {
                key_as_string: '2018-06-09T12:00:00.000Z',
                key: 1528545600000,
                doc_count: 4672
              },
              {
                key_as_string: '2018-06-09T15:00:00.000Z',
                key: 1528556400000,
                doc_count: 4685
              },
              {
                key_as_string: '2018-06-09T18:00:00.000Z',
                key: 1528567200000,
                doc_count: 4521
              },
              {
                key_as_string: '2018-06-09T21:00:00.000Z',
                key: 1528578000000,
                doc_count: 4612
              },
              {
                key_as_string: '2018-06-10T00:00:00.000Z',
                key: 1528588800000,
                doc_count: 4535
              },
              {
                key_as_string: '2018-06-10T03:00:00.000Z',
                key: 1528599600000,
                doc_count: 4606
              },
              {
                key_as_string: '2018-06-10T06:00:00.000Z',
                key: 1528610400000,
                doc_count: 4614
              },
              {
                key_as_string: '2018-06-10T09:00:00.000Z',
                key: 1528621200000,
                doc_count: 4507
              },
              {
                key_as_string: '2018-06-10T12:00:00.000Z',
                key: 1528632000000,
                doc_count: 4611
              },
              {
                key_as_string: '2018-06-10T15:00:00.000Z',
                key: 1528642800000,
                doc_count: 4587
              },
              {
                key_as_string: '2018-06-10T18:00:00.000Z',
                key: 1528653600000,
                doc_count: 4582
              },
              {
                key_as_string: '2018-06-10T21:00:00.000Z',
                key: 1528664400000,
                doc_count: 4615
              },
              {
                key_as_string: '2018-06-11T00:00:00.000Z',
                key: 1528675200000,
                doc_count: 16251
              },
              {
                key_as_string: '2018-06-11T03:00:00.000Z',
                key: 1528686000000,
                doc_count: 16825
              },
              {
                key_as_string: '2018-06-11T06:00:00.000Z',
                key: 1528696800000,
                doc_count: 16288
              },
              {
                key_as_string: '2018-06-11T09:00:00.000Z',
                key: 1528707600000,
                doc_count: 16492
              },
              {
                key_as_string: '2018-06-11T12:00:00.000Z',
                key: 1528718400000,
                doc_count: 16434
              },
              {
                key_as_string: '2018-06-11T15:00:00.000Z',
                key: 1528729200000,
                doc_count: 17003
              },
              {
                key_as_string: '2018-06-11T18:00:00.000Z',
                key: 1528740000000,
                doc_count: 16364
              },
              {
                key_as_string: '2018-06-11T21:00:00.000Z',
                key: 1528750800000,
                doc_count: 16645
              },
              {
                key_as_string: '2018-06-12T00:00:00.000Z',
                key: 1528761600000,
                doc_count: 16695
              },
              {
                key_as_string: '2018-06-12T03:00:00.000Z',
                key: 1528772400000,
                doc_count: 16498
              },
              {
                key_as_string: '2018-06-12T06:00:00.000Z',
                key: 1528783200000,
                doc_count: 16588
              },
              {
                key_as_string: '2018-06-12T09:00:00.000Z',
                key: 1528794000000,
                doc_count: 16685
              },
              {
                key_as_string: '2018-06-12T12:00:00.000Z',
                key: 1528804800000,
                doc_count: 16361
              },
              {
                key_as_string: '2018-06-12T15:00:00.000Z',
                key: 1528815600000,
                doc_count: 16658
              },
              {
                key_as_string: '2018-06-12T18:00:00.000Z',
                key: 1528826400000,
                doc_count: 16507
              },
              {
                key_as_string: '2018-06-12T21:00:00.000Z',
                key: 1528837200000,
                doc_count: 16418
              },
              {
                key_as_string: '2018-06-13T00:00:00.000Z',
                key: 1528848000000,
                doc_count: 16477
              },
              {
                key_as_string: '2018-06-13T03:00:00.000Z',
                key: 1528858800000,
                doc_count: 16755
              },
              {
                key_as_string: '2018-06-13T06:00:00.000Z',
                key: 1528869600000,
                doc_count: 16594
              },
              {
                key_as_string: '2018-06-13T09:00:00.000Z',
                key: 1528880400000,
                doc_count: 16812
              },
              {
                key_as_string: '2018-06-13T12:00:00.000Z',
                key: 1528891200000,
                doc_count: 16863
              },
              {
                key_as_string: '2018-06-13T15:00:00.000Z',
                key: 1528902000000,
                doc_count: 16655
              },
              {
                key_as_string: '2018-06-13T18:00:00.000Z',
                key: 1528912800000,
                doc_count: 16723
              },
              {
                key_as_string: '2018-06-13T21:00:00.000Z',
                key: 1528923600000,
                doc_count: 16577
              },
              {
                key_as_string: '2018-06-14T00:00:00.000Z',
                key: 1528934400000,
                doc_count: 15125
              },
              {
                key_as_string: '2018-06-14T03:00:00.000Z',
                key: 1528945200000,
                doc_count: 16432
              },
              {
                key_as_string: '2018-06-14T06:00:00.000Z',
                key: 1528956000000,
                doc_count: 16464
              },
              {
                key_as_string: '2018-06-14T09:00:00.000Z',
                key: 1528966800000,
                doc_count: 16369
              },
              {
                key_as_string: '2018-06-14T12:00:00.000Z',
                key: 1528977600000,
                doc_count: 0
              }
            ]
          }
        },
        {
          key: 'HTTP 5xx',
          doc_count: 82036,
          timeseries: {
            buckets: [
              {
                key_as_string: '2018-06-04T12:00:00.000Z',
                key: 1528113600000,
                doc_count: 1209
              },
              {
                key_as_string: '2018-06-04T15:00:00.000Z',
                key: 1528124400000,
                doc_count: 1203
              },
              {
                key_as_string: '2018-06-04T18:00:00.000Z',
                key: 1528135200000,
                doc_count: 1196
              },
              {
                key_as_string: '2018-06-04T21:00:00.000Z',
                key: 1528146000000,
                doc_count: 1230
              },
              {
                key_as_string: '2018-06-05T00:00:00.000Z',
                key: 1528156800000,
                doc_count: 1233
              },
              {
                key_as_string: '2018-06-05T03:00:00.000Z',
                key: 1528167600000,
                doc_count: 1272
              },
              {
                key_as_string: '2018-06-05T06:00:00.000Z',
                key: 1528178400000,
                doc_count: 1218
              },
              {
                key_as_string: '2018-06-05T09:00:00.000Z',
                key: 1528189200000,
                doc_count: 1217
              },
              {
                key_as_string: '2018-06-05T12:00:00.000Z',
                key: 1528200000000,
                doc_count: 1235
              },
              {
                key_as_string: '2018-06-05T15:00:00.000Z',
                key: 1528210800000,
                doc_count: 1249
              },
              {
                key_as_string: '2018-06-05T18:00:00.000Z',
                key: 1528221600000,
                doc_count: 1158
              },
              {
                key_as_string: '2018-06-05T21:00:00.000Z',
                key: 1528232400000,
                doc_count: 1215
              },
              {
                key_as_string: '2018-06-06T00:00:00.000Z',
                key: 1528243200000,
                doc_count: 1191
              },
              {
                key_as_string: '2018-06-06T03:00:00.000Z',
                key: 1528254000000,
                doc_count: 1235
              },
              {
                key_as_string: '2018-06-06T06:00:00.000Z',
                key: 1528264800000,
                doc_count: 1212
              },
              {
                key_as_string: '2018-06-06T09:00:00.000Z',
                key: 1528275600000,
                doc_count: 1180
              },
              {
                key_as_string: '2018-06-06T12:00:00.000Z',
                key: 1528286400000,
                doc_count: 1091
              },
              {
                key_as_string: '2018-06-06T15:00:00.000Z',
                key: 1528297200000,
                doc_count: 1176
              },
              {
                key_as_string: '2018-06-06T18:00:00.000Z',
                key: 1528308000000,
                doc_count: 1243
              },
              {
                key_as_string: '2018-06-06T21:00:00.000Z',
                key: 1528318800000,
                doc_count: 1208
              },
              {
                key_as_string: '2018-06-07T00:00:00.000Z',
                key: 1528329600000,
                doc_count: 1202
              },
              {
                key_as_string: '2018-06-07T03:00:00.000Z',
                key: 1528340400000,
                doc_count: 1288
              },
              {
                key_as_string: '2018-06-07T06:00:00.000Z',
                key: 1528351200000,
                doc_count: 1241
              },
              {
                key_as_string: '2018-06-07T09:00:00.000Z',
                key: 1528362000000,
                doc_count: 1215
              },
              {
                key_as_string: '2018-06-07T12:00:00.000Z',
                key: 1528372800000,
                doc_count: 1152
              },
              {
                key_as_string: '2018-06-07T15:00:00.000Z',
                key: 1528383600000,
                doc_count: 1241
              },
              {
                key_as_string: '2018-06-07T18:00:00.000Z',
                key: 1528394400000,
                doc_count: 1177
              },
              {
                key_as_string: '2018-06-07T21:00:00.000Z',
                key: 1528405200000,
                doc_count: 1243
              },
              {
                key_as_string: '2018-06-08T00:00:00.000Z',
                key: 1528416000000,
                doc_count: 1255
              },
              {
                key_as_string: '2018-06-08T03:00:00.000Z',
                key: 1528426800000,
                doc_count: 1189
              },
              {
                key_as_string: '2018-06-08T06:00:00.000Z',
                key: 1528437600000,
                doc_count: 1183
              },
              {
                key_as_string: '2018-06-08T09:00:00.000Z',
                key: 1528448400000,
                doc_count: 1215
              },
              {
                key_as_string: '2018-06-08T12:00:00.000Z',
                key: 1528459200000,
                doc_count: 1282
              },
              {
                key_as_string: '2018-06-08T15:00:00.000Z',
                key: 1528470000000,
                doc_count: 1177
              },
              {
                key_as_string: '2018-06-08T18:00:00.000Z',
                key: 1528480800000,
                doc_count: 1199
              },
              {
                key_as_string: '2018-06-08T21:00:00.000Z',
                key: 1528491600000,
                doc_count: 1234
              },
              {
                key_as_string: '2018-06-09T00:00:00.000Z',
                key: 1528502400000,
                doc_count: 284
              },
              {
                key_as_string: '2018-06-09T03:00:00.000Z',
                key: 1528513200000,
                doc_count: 307
              },
              {
                key_as_string: '2018-06-09T06:00:00.000Z',
                key: 1528524000000,
                doc_count: 283
              },
              {
                key_as_string: '2018-06-09T09:00:00.000Z',
                key: 1528534800000,
                doc_count: 303
              },
              {
                key_as_string: '2018-06-09T12:00:00.000Z',
                key: 1528545600000,
                doc_count: 326
              },
              {
                key_as_string: '2018-06-09T15:00:00.000Z',
                key: 1528556400000,
                doc_count: 269
              },
              {
                key_as_string: '2018-06-09T18:00:00.000Z',
                key: 1528567200000,
                doc_count: 297
              },
              {
                key_as_string: '2018-06-09T21:00:00.000Z',
                key: 1528578000000,
                doc_count: 278
              },
              {
                key_as_string: '2018-06-10T00:00:00.000Z',
                key: 1528588800000,
                doc_count: 289
              },
              {
                key_as_string: '2018-06-10T03:00:00.000Z',
                key: 1528599600000,
                doc_count: 272
              },
              {
                key_as_string: '2018-06-10T06:00:00.000Z',
                key: 1528610400000,
                doc_count: 279
              },
              {
                key_as_string: '2018-06-10T09:00:00.000Z',
                key: 1528621200000,
                doc_count: 238
              },
              {
                key_as_string: '2018-06-10T12:00:00.000Z',
                key: 1528632000000,
                doc_count: 288
              },
              {
                key_as_string: '2018-06-10T15:00:00.000Z',
                key: 1528642800000,
                doc_count: 258
              },
              {
                key_as_string: '2018-06-10T18:00:00.000Z',
                key: 1528653600000,
                doc_count: 264
              },
              {
                key_as_string: '2018-06-10T21:00:00.000Z',
                key: 1528664400000,
                doc_count: 296
              },
              {
                key_as_string: '2018-06-11T00:00:00.000Z',
                key: 1528675200000,
                doc_count: 1213
              },
              {
                key_as_string: '2018-06-11T03:00:00.000Z',
                key: 1528686000000,
                doc_count: 1254
              },
              {
                key_as_string: '2018-06-11T06:00:00.000Z',
                key: 1528696800000,
                doc_count: 1135
              },
              {
                key_as_string: '2018-06-11T09:00:00.000Z',
                key: 1528707600000,
                doc_count: 1240
              },
              {
                key_as_string: '2018-06-11T12:00:00.000Z',
                key: 1528718400000,
                doc_count: 1215
              },
              {
                key_as_string: '2018-06-11T15:00:00.000Z',
                key: 1528729200000,
                doc_count: 1239
              },
              {
                key_as_string: '2018-06-11T18:00:00.000Z',
                key: 1528740000000,
                doc_count: 1209
              },
              {
                key_as_string: '2018-06-11T21:00:00.000Z',
                key: 1528750800000,
                doc_count: 1208
              },
              {
                key_as_string: '2018-06-12T00:00:00.000Z',
                key: 1528761600000,
                doc_count: 1176
              },
              {
                key_as_string: '2018-06-12T03:00:00.000Z',
                key: 1528772400000,
                doc_count: 1207
              },
              {
                key_as_string: '2018-06-12T06:00:00.000Z',
                key: 1528783200000,
                doc_count: 1198
              },
              {
                key_as_string: '2018-06-12T09:00:00.000Z',
                key: 1528794000000,
                doc_count: 1165
              },
              {
                key_as_string: '2018-06-12T12:00:00.000Z',
                key: 1528804800000,
                doc_count: 1188
              },
              {
                key_as_string: '2018-06-12T15:00:00.000Z',
                key: 1528815600000,
                doc_count: 1245
              },
              {
                key_as_string: '2018-06-12T18:00:00.000Z',
                key: 1528826400000,
                doc_count: 1238
              },
              {
                key_as_string: '2018-06-12T21:00:00.000Z',
                key: 1528837200000,
                doc_count: 1283
              },
              {
                key_as_string: '2018-06-13T00:00:00.000Z',
                key: 1528848000000,
                doc_count: 1198
              },
              {
                key_as_string: '2018-06-13T03:00:00.000Z',
                key: 1528858800000,
                doc_count: 1172
              },
              {
                key_as_string: '2018-06-13T06:00:00.000Z',
                key: 1528869600000,
                doc_count: 1229
              },
              {
                key_as_string: '2018-06-13T09:00:00.000Z',
                key: 1528880400000,
                doc_count: 1239
              },
              {
                key_as_string: '2018-06-13T12:00:00.000Z',
                key: 1528891200000,
                doc_count: 1231
              },
              {
                key_as_string: '2018-06-13T15:00:00.000Z',
                key: 1528902000000,
                doc_count: 1248
              },
              {
                key_as_string: '2018-06-13T18:00:00.000Z',
                key: 1528912800000,
                doc_count: 1220
              },
              {
                key_as_string: '2018-06-13T21:00:00.000Z',
                key: 1528923600000,
                doc_count: 1224
              },
              {
                key_as_string: '2018-06-14T00:00:00.000Z',
                key: 1528934400000,
                doc_count: 1088
              },
              {
                key_as_string: '2018-06-14T03:00:00.000Z',
                key: 1528945200000,
                doc_count: 1235
              },
              {
                key_as_string: '2018-06-14T06:00:00.000Z',
                key: 1528956000000,
                doc_count: 1161
              },
              {
                key_as_string: '2018-06-14T09:00:00.000Z',
                key: 1528966800000,
                doc_count: 1183
              },
              {
                key_as_string: '2018-06-14T12:00:00.000Z',
                key: 1528977600000,
                doc_count: 0
              }
            ]
          }
        },
        {
          key: 'HTTP 4xx',
          doc_count: 81907,
          timeseries: {
            buckets: [
              {
                key_as_string: '2018-06-04T12:00:00.000Z',
                key: 1528113600000,
                doc_count: 1186
              },
              {
                key_as_string: '2018-06-04T15:00:00.000Z',
                key: 1528124400000,
                doc_count: 1213
              },
              {
                key_as_string: '2018-06-04T18:00:00.000Z',
                key: 1528135200000,
                doc_count: 1205
              },
              {
                key_as_string: '2018-06-04T21:00:00.000Z',
                key: 1528146000000,
                doc_count: 1162
              },
              {
                key_as_string: '2018-06-05T00:00:00.000Z',
                key: 1528156800000,
                doc_count: 1238
              },
              {
                key_as_string: '2018-06-05T03:00:00.000Z',
                key: 1528167600000,
                doc_count: 1191
              },
              {
                key_as_string: '2018-06-05T06:00:00.000Z',
                key: 1528178400000,
                doc_count: 1274
              },
              {
                key_as_string: '2018-06-05T09:00:00.000Z',
                key: 1528189200000,
                doc_count: 1234
              },
              {
                key_as_string: '2018-06-05T12:00:00.000Z',
                key: 1528200000000,
                doc_count: 1164
              },
              {
                key_as_string: '2018-06-05T15:00:00.000Z',
                key: 1528210800000,
                doc_count: 1233
              },
              {
                key_as_string: '2018-06-05T18:00:00.000Z',
                key: 1528221600000,
                doc_count: 1223
              },
              {
                key_as_string: '2018-06-05T21:00:00.000Z',
                key: 1528232400000,
                doc_count: 1216
              },
              {
                key_as_string: '2018-06-06T00:00:00.000Z',
                key: 1528243200000,
                doc_count: 1200
              },
              {
                key_as_string: '2018-06-06T03:00:00.000Z',
                key: 1528254000000,
                doc_count: 1237
              },
              {
                key_as_string: '2018-06-06T06:00:00.000Z',
                key: 1528264800000,
                doc_count: 1231
              },
              {
                key_as_string: '2018-06-06T09:00:00.000Z',
                key: 1528275600000,
                doc_count: 1182
              },
              {
                key_as_string: '2018-06-06T12:00:00.000Z',
                key: 1528286400000,
                doc_count: 1125
              },
              {
                key_as_string: '2018-06-06T15:00:00.000Z',
                key: 1528297200000,
                doc_count: 1243
              },
              {
                key_as_string: '2018-06-06T18:00:00.000Z',
                key: 1528308000000,
                doc_count: 1247
              },
              {
                key_as_string: '2018-06-06T21:00:00.000Z',
                key: 1528318800000,
                doc_count: 1163
              },
              {
                key_as_string: '2018-06-07T00:00:00.000Z',
                key: 1528329600000,
                doc_count: 1220
              },
              {
                key_as_string: '2018-06-07T03:00:00.000Z',
                key: 1528340400000,
                doc_count: 1202
              },
              {
                key_as_string: '2018-06-07T06:00:00.000Z',
                key: 1528351200000,
                doc_count: 1192
              },
              {
                key_as_string: '2018-06-07T09:00:00.000Z',
                key: 1528362000000,
                doc_count: 1248
              },
              {
                key_as_string: '2018-06-07T12:00:00.000Z',
                key: 1528372800000,
                doc_count: 1189
              },
              {
                key_as_string: '2018-06-07T15:00:00.000Z',
                key: 1528383600000,
                doc_count: 1230
              },
              {
                key_as_string: '2018-06-07T18:00:00.000Z',
                key: 1528394400000,
                doc_count: 1206
              },
              {
                key_as_string: '2018-06-07T21:00:00.000Z',
                key: 1528405200000,
                doc_count: 1190
              },
              {
                key_as_string: '2018-06-08T00:00:00.000Z',
                key: 1528416000000,
                doc_count: 1232
              },
              {
                key_as_string: '2018-06-08T03:00:00.000Z',
                key: 1528426800000,
                doc_count: 1171
              },
              {
                key_as_string: '2018-06-08T06:00:00.000Z',
                key: 1528437600000,
                doc_count: 1232
              },
              {
                key_as_string: '2018-06-08T09:00:00.000Z',
                key: 1528448400000,
                doc_count: 1253
              },
              {
                key_as_string: '2018-06-08T12:00:00.000Z',
                key: 1528459200000,
                doc_count: 1250
              },
              {
                key_as_string: '2018-06-08T15:00:00.000Z',
                key: 1528470000000,
                doc_count: 1167
              },
              {
                key_as_string: '2018-06-08T18:00:00.000Z',
                key: 1528480800000,
                doc_count: 1258
              },
              {
                key_as_string: '2018-06-08T21:00:00.000Z',
                key: 1528491600000,
                doc_count: 1148
              },
              {
                key_as_string: '2018-06-09T00:00:00.000Z',
                key: 1528502400000,
                doc_count: 284
              },
              {
                key_as_string: '2018-06-09T03:00:00.000Z',
                key: 1528513200000,
                doc_count: 240
              },
              {
                key_as_string: '2018-06-09T06:00:00.000Z',
                key: 1528524000000,
                doc_count: 273
              },
              {
                key_as_string: '2018-06-09T09:00:00.000Z',
                key: 1528534800000,
                doc_count: 295
              },
              {
                key_as_string: '2018-06-09T12:00:00.000Z',
                key: 1528545600000,
                doc_count: 281
              },
              {
                key_as_string: '2018-06-09T15:00:00.000Z',
                key: 1528556400000,
                doc_count: 300
              },
              {
                key_as_string: '2018-06-09T18:00:00.000Z',
                key: 1528567200000,
                doc_count: 264
              },
              {
                key_as_string: '2018-06-09T21:00:00.000Z',
                key: 1528578000000,
                doc_count: 260
              },
              {
                key_as_string: '2018-06-10T00:00:00.000Z',
                key: 1528588800000,
                doc_count: 279
              },
              {
                key_as_string: '2018-06-10T03:00:00.000Z',
                key: 1528599600000,
                doc_count: 259
              },
              {
                key_as_string: '2018-06-10T06:00:00.000Z',
                key: 1528610400000,
                doc_count: 291
              },
              {
                key_as_string: '2018-06-10T09:00:00.000Z',
                key: 1528621200000,
                doc_count: 248
              },
              {
                key_as_string: '2018-06-10T12:00:00.000Z',
                key: 1528632000000,
                doc_count: 311
              },
              {
                key_as_string: '2018-06-10T15:00:00.000Z',
                key: 1528642800000,
                doc_count: 277
              },
              {
                key_as_string: '2018-06-10T18:00:00.000Z',
                key: 1528653600000,
                doc_count: 279
              },
              {
                key_as_string: '2018-06-10T21:00:00.000Z',
                key: 1528664400000,
                doc_count: 275
              },
              {
                key_as_string: '2018-06-11T00:00:00.000Z',
                key: 1528675200000,
                doc_count: 1167
              },
              {
                key_as_string: '2018-06-11T03:00:00.000Z',
                key: 1528686000000,
                doc_count: 1270
              },
              {
                key_as_string: '2018-06-11T06:00:00.000Z',
                key: 1528696800000,
                doc_count: 1163
              },
              {
                key_as_string: '2018-06-11T09:00:00.000Z',
                key: 1528707600000,
                doc_count: 1155
              },
              {
                key_as_string: '2018-06-11T12:00:00.000Z',
                key: 1528718400000,
                doc_count: 1217
              },
              {
                key_as_string: '2018-06-11T15:00:00.000Z',
                key: 1528729200000,
                doc_count: 1227
              },
              {
                key_as_string: '2018-06-11T18:00:00.000Z',
                key: 1528740000000,
                doc_count: 1194
              },
              {
                key_as_string: '2018-06-11T21:00:00.000Z',
                key: 1528750800000,
                doc_count: 1153
              },
              {
                key_as_string: '2018-06-12T00:00:00.000Z',
                key: 1528761600000,
                doc_count: 1211
              },
              {
                key_as_string: '2018-06-12T03:00:00.000Z',
                key: 1528772400000,
                doc_count: 1203
              },
              {
                key_as_string: '2018-06-12T06:00:00.000Z',
                key: 1528783200000,
                doc_count: 1269
              },
              {
                key_as_string: '2018-06-12T09:00:00.000Z',
                key: 1528794000000,
                doc_count: 1197
              },
              {
                key_as_string: '2018-06-12T12:00:00.000Z',
                key: 1528804800000,
                doc_count: 1184
              },
              {
                key_as_string: '2018-06-12T15:00:00.000Z',
                key: 1528815600000,
                doc_count: 1176
              },
              {
                key_as_string: '2018-06-12T18:00:00.000Z',
                key: 1528826400000,
                doc_count: 1162
              },
              {
                key_as_string: '2018-06-12T21:00:00.000Z',
                key: 1528837200000,
                doc_count: 1270
              },
              {
                key_as_string: '2018-06-13T00:00:00.000Z',
                key: 1528848000000,
                doc_count: 1224
              },
              {
                key_as_string: '2018-06-13T03:00:00.000Z',
                key: 1528858800000,
                doc_count: 1255
              },
              {
                key_as_string: '2018-06-13T06:00:00.000Z',
                key: 1528869600000,
                doc_count: 1207
              },
              {
                key_as_string: '2018-06-13T09:00:00.000Z',
                key: 1528880400000,
                doc_count: 1206
              },
              {
                key_as_string: '2018-06-13T12:00:00.000Z',
                key: 1528891200000,
                doc_count: 1254
              },
              {
                key_as_string: '2018-06-13T15:00:00.000Z',
                key: 1528902000000,
                doc_count: 1216
              },
              {
                key_as_string: '2018-06-13T18:00:00.000Z',
                key: 1528912800000,
                doc_count: 1263
              },
              {
                key_as_string: '2018-06-13T21:00:00.000Z',
                key: 1528923600000,
                doc_count: 1277
              },
              {
                key_as_string: '2018-06-14T00:00:00.000Z',
                key: 1528934400000,
                doc_count: 1183
              },
              {
                key_as_string: '2018-06-14T03:00:00.000Z',
                key: 1528945200000,
                doc_count: 1221
              },
              {
                key_as_string: '2018-06-14T06:00:00.000Z',
                key: 1528956000000,
                doc_count: 1198
              },
              {
                key_as_string: '2018-06-14T09:00:00.000Z',
                key: 1528966800000,
                doc_count: 1214
              },
              {
                key_as_string: '2018-06-14T12:00:00.000Z',
                key: 1528977600000,
                doc_count: 0
              }
            ]
          }
        },
        {
          key: 'HTTP 3xx',
          doc_count: 6650,
          timeseries: {
            buckets: [
              {
                key_as_string: '2018-06-04T12:00:00.000Z',
                key: 1528113600000,
                doc_count: 0
              },
              {
                key_as_string: '2018-06-04T15:00:00.000Z',
                key: 1528124400000,
                doc_count: 0
              },
              {
                key_as_string: '2018-06-04T18:00:00.000Z',
                key: 1528135200000,
                doc_count: 0
              },
              {
                key_as_string: '2018-06-04T21:00:00.000Z',
                key: 1528146000000,
                doc_count: 0
              },
              {
                key_as_string: '2018-06-05T00:00:00.000Z',
                key: 1528156800000,
                doc_count: 0
              },
              {
                key_as_string: '2018-06-05T03:00:00.000Z',
                key: 1528167600000,
                doc_count: 0
              },
              {
                key_as_string: '2018-06-05T06:00:00.000Z',
                key: 1528178400000,
                doc_count: 0
              },
              {
                key_as_string: '2018-06-05T09:00:00.000Z',
                key: 1528189200000,
                doc_count: 0
              },
              {
                key_as_string: '2018-06-05T12:00:00.000Z',
                key: 1528200000000,
                doc_count: 0
              },
              {
                key_as_string: '2018-06-05T15:00:00.000Z',
                key: 1528210800000,
                doc_count: 0
              },
              {
                key_as_string: '2018-06-05T18:00:00.000Z',
                key: 1528221600000,
                doc_count: 0
              },
              {
                key_as_string: '2018-06-05T21:00:00.000Z',
                key: 1528232400000,
                doc_count: 0
              },
              {
                key_as_string: '2018-06-06T00:00:00.000Z',
                key: 1528243200000,
                doc_count: 0
              },
              {
                key_as_string: '2018-06-06T03:00:00.000Z',
                key: 1528254000000,
                doc_count: 0
              },
              {
                key_as_string: '2018-06-06T06:00:00.000Z',
                key: 1528264800000,
                doc_count: 0
              },
              {
                key_as_string: '2018-06-06T09:00:00.000Z',
                key: 1528275600000,
                doc_count: 0
              },
              {
                key_as_string: '2018-06-06T12:00:00.000Z',
                key: 1528286400000,
                doc_count: 4041
              },
              {
                key_as_string: '2018-06-06T15:00:00.000Z',
                key: 1528297200000,
                doc_count: 454
              },
              {
                key_as_string: '2018-06-06T18:00:00.000Z',
                key: 1528308000000,
                doc_count: 0
              },
              {
                key_as_string: '2018-06-06T21:00:00.000Z',
                key: 1528318800000,
                doc_count: 0
              },
              {
                key_as_string: '2018-06-07T00:00:00.000Z',
                key: 1528329600000,
                doc_count: 0
              },
              {
                key_as_string: '2018-06-07T03:00:00.000Z',
                key: 1528340400000,
                doc_count: 0
              },
              {
                key_as_string: '2018-06-07T06:00:00.000Z',
                key: 1528351200000,
                doc_count: 0
              },
              {
                key_as_string: '2018-06-07T09:00:00.000Z',
                key: 1528362000000,
                doc_count: 0
              },
              {
                key_as_string: '2018-06-07T12:00:00.000Z',
                key: 1528372800000,
                doc_count: 0
              },
              {
                key_as_string: '2018-06-07T15:00:00.000Z',
                key: 1528383600000,
                doc_count: 0
              },
              {
                key_as_string: '2018-06-07T18:00:00.000Z',
                key: 1528394400000,
                doc_count: 0
              },
              {
                key_as_string: '2018-06-07T21:00:00.000Z',
                key: 1528405200000,
                doc_count: 0
              },
              {
                key_as_string: '2018-06-08T00:00:00.000Z',
                key: 1528416000000,
                doc_count: 0
              },
              {
                key_as_string: '2018-06-08T03:00:00.000Z',
                key: 1528426800000,
                doc_count: 0
              },
              {
                key_as_string: '2018-06-08T06:00:00.000Z',
                key: 1528437600000,
                doc_count: 0
              },
              {
                key_as_string: '2018-06-08T09:00:00.000Z',
                key: 1528448400000,
                doc_count: 0
              },
              {
                key_as_string: '2018-06-08T12:00:00.000Z',
                key: 1528459200000,
                doc_count: 0
              },
              {
                key_as_string: '2018-06-08T15:00:00.000Z',
                key: 1528470000000,
                doc_count: 0
              },
              {
                key_as_string: '2018-06-08T18:00:00.000Z',
                key: 1528480800000,
                doc_count: 0
              },
              {
                key_as_string: '2018-06-08T21:00:00.000Z',
                key: 1528491600000,
                doc_count: 0
              },
              {
                key_as_string: '2018-06-09T00:00:00.000Z',
                key: 1528502400000,
                doc_count: 0
              },
              {
                key_as_string: '2018-06-09T03:00:00.000Z',
                key: 1528513200000,
                doc_count: 0
              },
              {
                key_as_string: '2018-06-09T06:00:00.000Z',
                key: 1528524000000,
                doc_count: 0
              },
              {
                key_as_string: '2018-06-09T09:00:00.000Z',
                key: 1528534800000,
                doc_count: 0
              },
              {
                key_as_string: '2018-06-09T12:00:00.000Z',
                key: 1528545600000,
                doc_count: 0
              },
              {
                key_as_string: '2018-06-09T15:00:00.000Z',
                key: 1528556400000,
                doc_count: 0
              },
              {
                key_as_string: '2018-06-09T18:00:00.000Z',
                key: 1528567200000,
                doc_count: 0
              },
              {
                key_as_string: '2018-06-09T21:00:00.000Z',
                key: 1528578000000,
                doc_count: 0
              },
              {
                key_as_string: '2018-06-10T00:00:00.000Z',
                key: 1528588800000,
                doc_count: 0
              },
              {
                key_as_string: '2018-06-10T03:00:00.000Z',
                key: 1528599600000,
                doc_count: 0
              },
              {
                key_as_string: '2018-06-10T06:00:00.000Z',
                key: 1528610400000,
                doc_count: 0
              },
              {
                key_as_string: '2018-06-10T09:00:00.000Z',
                key: 1528621200000,
                doc_count: 0
              },
              {
                key_as_string: '2018-06-10T12:00:00.000Z',
                key: 1528632000000,
                doc_count: 0
              },
              {
                key_as_string: '2018-06-10T15:00:00.000Z',
                key: 1528642800000,
                doc_count: 0
              },
              {
                key_as_string: '2018-06-10T18:00:00.000Z',
                key: 1528653600000,
                doc_count: 0
              },
              {
                key_as_string: '2018-06-10T21:00:00.000Z',
                key: 1528664400000,
                doc_count: 0
              },
              {
                key_as_string: '2018-06-11T00:00:00.000Z',
                key: 1528675200000,
                doc_count: 0
              },
              {
                key_as_string: '2018-06-11T03:00:00.000Z',
                key: 1528686000000,
                doc_count: 0
              },
              {
                key_as_string: '2018-06-11T06:00:00.000Z',
                key: 1528696800000,
                doc_count: 0
              },
              {
                key_as_string: '2018-06-11T09:00:00.000Z',
                key: 1528707600000,
                doc_count: 0
              },
              {
                key_as_string: '2018-06-11T12:00:00.000Z',
                key: 1528718400000,
                doc_count: 0
              },
              {
                key_as_string: '2018-06-11T15:00:00.000Z',
                key: 1528729200000,
                doc_count: 0
              },
              {
                key_as_string: '2018-06-11T18:00:00.000Z',
                key: 1528740000000,
                doc_count: 0
              },
              {
                key_as_string: '2018-06-11T21:00:00.000Z',
                key: 1528750800000,
                doc_count: 0
              },
              {
                key_as_string: '2018-06-12T00:00:00.000Z',
                key: 1528761600000,
                doc_count: 0
              },
              {
                key_as_string: '2018-06-12T03:00:00.000Z',
                key: 1528772400000,
                doc_count: 0
              },
              {
                key_as_string: '2018-06-12T06:00:00.000Z',
                key: 1528783200000,
                doc_count: 0
              },
              {
                key_as_string: '2018-06-12T09:00:00.000Z',
                key: 1528794000000,
                doc_count: 0
              },
              {
                key_as_string: '2018-06-12T12:00:00.000Z',
                key: 1528804800000,
                doc_count: 0
              },
              {
                key_as_string: '2018-06-12T15:00:00.000Z',
                key: 1528815600000,
                doc_count: 0
              },
              {
                key_as_string: '2018-06-12T18:00:00.000Z',
                key: 1528826400000,
                doc_count: 0
              },
              {
                key_as_string: '2018-06-12T21:00:00.000Z',
                key: 1528837200000,
                doc_count: 0
              },
              {
                key_as_string: '2018-06-13T00:00:00.000Z',
                key: 1528848000000,
                doc_count: 0
              },
              {
                key_as_string: '2018-06-13T03:00:00.000Z',
                key: 1528858800000,
                doc_count: 0
              },
              {
                key_as_string: '2018-06-13T06:00:00.000Z',
                key: 1528869600000,
                doc_count: 0
              },
              {
                key_as_string: '2018-06-13T09:00:00.000Z',
                key: 1528880400000,
                doc_count: 0
              },
              {
                key_as_string: '2018-06-13T12:00:00.000Z',
                key: 1528891200000,
                doc_count: 0
              },
              {
                key_as_string: '2018-06-13T15:00:00.000Z',
                key: 1528902000000,
                doc_count: 0
              },
              {
                key_as_string: '2018-06-13T18:00:00.000Z',
                key: 1528912800000,
                doc_count: 0
              },
              {
                key_as_string: '2018-06-13T21:00:00.000Z',
                key: 1528923600000,
                doc_count: 0
              },
              {
                key_as_string: '2018-06-14T00:00:00.000Z',
                key: 1528934400000,
                doc_count: 2155
              },
              {
                key_as_string: '2018-06-14T03:00:00.000Z',
                key: 1528945200000,
                doc_count: 0
              },
              {
                key_as_string: '2018-06-14T06:00:00.000Z',
                key: 1528956000000,
                doc_count: 0
              },
              {
                key_as_string: '2018-06-14T09:00:00.000Z',
                key: 1528966800000,
                doc_count: 0
              },
              {
                key_as_string: '2018-06-14T12:00:00.000Z',
                key: 1528977600000,
                doc_count: 0
              }
            ]
          }
        }
      ]
    },
    response_times: {
      buckets: [
        {
          key_as_string: '2018-06-04T12:00:00.000Z',
          key: 1528113600000,
          doc_count: 18841,
          pct: {
            values: {
              '95.0': 82172.85648714812,
              '99.0': 293866.3866666665
            }
          },
          avg: {
            value: 26310.63483891513
          }
        },
        {
          key_as_string: '2018-06-04T15:00:00.000Z',
          key: 1528124400000,
          doc_count: 18708,
          pct: {
            values: {
              '95.0': 80738.78571428556,
              '99.0': 293257.27333333343
            }
          },
          avg: {
            value: 26193.277795595466
          }
        },
        {
          key_as_string: '2018-06-04T18:00:00.000Z',
          key: 1528135200000,
          doc_count: 18865,
          pct: {
            values: {
              '95.0': 77058.03529411761,
              '99.0': 290195.8800000004
            }
          },
          avg: {
            value: 25291.787065995228
          }
        },
        {
          key_as_string: '2018-06-04T21:00:00.000Z',
          key: 1528146000000,
          doc_count: 18889,
          pct: {
            values: {
              '95.0': 77892.20721980717,
              '99.0': 278548.1649999994
            }
          },
          avg: {
            value: 24690.306474667796
          }
        },
        {
          key_as_string: '2018-06-05T00:00:00.000Z',
          key: 1528156800000,
          doc_count: 19270,
          pct: {
            values: {
              '95.0': 77085.86687499998,
              '99.0': 290701.8973333341
            }
          },
          avg: {
            value: 24809.8953814219
          }
        },
        {
          key_as_string: '2018-06-05T03:00:00.000Z',
          key: 1528167600000,
          doc_count: 19024,
          pct: {
            values: {
              '95.0': 80048.3462981744,
              '99.0': 286839.5897777779
            }
          },
          avg: {
            value: 25460.0394764508
          }
        },
        {
          key_as_string: '2018-06-05T06:00:00.000Z',
          key: 1528178400000,
          doc_count: 18923,
          pct: {
            values: {
              '95.0': 84089.21370223971,
              '99.0': 287979.5149999999
            }
          },
          avg: {
            value: 26360.440733498916
          }
        },
        {
          key_as_string: '2018-06-05T09:00:00.000Z',
          key: 1528189200000,
          doc_count: 18834,
          pct: {
            values: {
              '95.0': 84880.90143416924,
              '99.0': 300107.5009999992
            }
          },
          avg: {
            value: 27050.95205479452
          }
        },
        {
          key_as_string: '2018-06-05T12:00:00.000Z',
          key: 1528200000000,
          doc_count: 18694,
          pct: {
            values: {
              '95.0': 84554.8884781166,
              '99.0': 294402.2179999999
            }
          },
          avg: {
            value: 26555.857333903925
          }
        },
        {
          key_as_string: '2018-06-05T15:00:00.000Z',
          key: 1528210800000,
          doc_count: 19184,
          pct: {
            values: {
              '95.0': 81839.39583333326,
              '99.0': 289849.459333332
            }
          },
          avg: {
            value: 26164.343359049206
          }
        },
        {
          key_as_string: '2018-06-05T18:00:00.000Z',
          key: 1528221600000,
          doc_count: 18850,
          pct: {
            values: {
              '95.0': 85993.55410163336,
              '99.0': 296942.86299999955
            }
          },
          avg: {
            value: 26989.84546419098
          }
        },
        {
          key_as_string: '2018-06-05T21:00:00.000Z',
          key: 1528232400000,
          doc_count: 18897,
          pct: {
            values: {
              '95.0': 85001.44588628765,
              '99.0': 292048.20571428596
            }
          },
          avg: {
            value: 26314.409430068266
          }
        },
        {
          key_as_string: '2018-06-06T00:00:00.000Z',
          key: 1528243200000,
          doc_count: 18942,
          pct: {
            values: {
              '95.0': 86980.16445312503,
              '99.0': 299308.7371666667
            }
          },
          avg: {
            value: 27460.774575018477
          }
        },
        {
          key_as_string: '2018-06-06T03:00:00.000Z',
          key: 1528254000000,
          doc_count: 19147,
          pct: {
            values: {
              '95.0': 84961.8710743802,
              '99.0': 292151.2377777781
            }
          },
          avg: {
            value: 26461.469107431974
          }
        },
        {
          key_as_string: '2018-06-06T06:00:00.000Z',
          key: 1528264800000,
          doc_count: 18853,
          pct: {
            values: {
              '95.0': 88906.54601889332,
              '99.0': 302274.4192592592
            }
          },
          avg: {
            value: 27657.584946692834
          }
        },
        {
          key_as_string: '2018-06-06T09:00:00.000Z',
          key: 1528275600000,
          doc_count: 18609,
          pct: {
            values: {
              '95.0': 90198.34708994703,
              '99.0': 299457.1612121209
            }
          },
          avg: {
            value: 27940.445967005213
          }
        },
        {
          key_as_string: '2018-06-06T12:00:00.000Z',
          key: 1528286400000,
          doc_count: 21402,
          pct: {
            values: {
              '95.0': 135627.71242424246,
              '99.0': 350398.59259259375
            }
          },
          avg: {
            value: 34454.377581534434
          }
        },
        {
          key_as_string: '2018-06-06T15:00:00.000Z',
          key: 1528297200000,
          doc_count: 19051,
          pct: {
            values: {
              '95.0': 167037.1993837535,
              '99.0': 421204.23333333334
            }
          },
          avg: {
            value: 44024.31809353839
          }
        },
        {
          key_as_string: '2018-06-06T18:00:00.000Z',
          key: 1528308000000,
          doc_count: 19020,
          pct: {
            values: {
              '95.0': 128293.12184873945,
              '99.0': 368166.68976190523
            }
          },
          avg: {
            value: 36374.53333333333
          }
        },
        {
          key_as_string: '2018-06-06T21:00:00.000Z',
          key: 1528318800000,
          doc_count: 18582,
          pct: {
            values: {
              '95.0': 130653.54236263742,
              '99.0': 367193.6128571426
            }
          },
          avg: {
            value: 36991.29442471209
          }
        },
        {
          key_as_string: '2018-06-07T00:00:00.000Z',
          key: 1528329600000,
          doc_count: 18875,
          pct: {
            values: {
              '95.0': 131630.8902645502,
              '99.0': 375658.10190476174
            }
          },
          avg: {
            value: 37178.002701986756
          }
        },
        {
          key_as_string: '2018-06-07T03:00:00.000Z',
          key: 1528340400000,
          doc_count: 18993,
          pct: {
            values: {
              '95.0': 133581.33541666638,
              '99.0': 368152.03822222137
            }
          },
          avg: {
            value: 37605.57078923814
          }
        },
        {
          key_as_string: '2018-06-07T06:00:00.000Z',
          key: 1528351200000,
          doc_count: 19037,
          pct: {
            values: {
              '95.0': 132697.92762266204,
              '99.0': 365705.8319999995
            }
          },
          avg: {
            value: 37319.89767295267
          }
        },
        {
          key_as_string: '2018-06-07T09:00:00.000Z',
          key: 1528362000000,
          doc_count: 18985,
          pct: {
            values: {
              '95.0': 140003.6918918918,
              '99.0': 380075.48533333326
            }
          },
          avg: {
            value: 38709.5041348433
          }
        },
        {
          key_as_string: '2018-06-07T12:00:00.000Z',
          key: 1528372800000,
          doc_count: 18505,
          pct: {
            values: {
              '95.0': 138149.5673529411,
              '99.0': 375697.1923809518
            }
          },
          avg: {
            value: 38140.131856255066
          }
        },
        {
          key_as_string: '2018-06-07T15:00:00.000Z',
          key: 1528383600000,
          doc_count: 18991,
          pct: {
            values: {
              '95.0': 121872.37504835591,
              '99.0': 351080.94111111073
            }
          },
          avg: {
            value: 34564.81091043125
          }
        },
        {
          key_as_string: '2018-06-07T18:00:00.000Z',
          key: 1528394400000,
          doc_count: 18917,
          pct: {
            values: {
              '95.0': 116378.03873517792,
              '99.0': 339294.12799999997
            }
          },
          avg: {
            value: 33256.37743828302
          }
        },
        {
          key_as_string: '2018-06-07T21:00:00.000Z',
          key: 1528405200000,
          doc_count: 18744,
          pct: {
            values: {
              '95.0': 131545.40999999995,
              '99.0': 378902.90649999987
            }
          },
          avg: {
            value: 37251.5625266752
          }
        },
        {
          key_as_string: '2018-06-08T00:00:00.000Z',
          key: 1528416000000,
          doc_count: 19157,
          pct: {
            values: {
              '95.0': 133111.25804878055,
              '99.0': 384483.3233333327
            }
          },
          avg: {
            value: 38681.89084929791
          }
        },
        {
          key_as_string: '2018-06-08T03:00:00.000Z',
          key: 1528426800000,
          doc_count: 18552,
          pct: {
            values: {
              '95.0': 144821.9855278593,
              '99.0': 394692.25000000105
            }
          },
          avg: {
            value: 40677.801045709355
          }
        },
        {
          key_as_string: '2018-06-08T06:00:00.000Z',
          key: 1528437600000,
          doc_count: 18994,
          pct: {
            values: {
              '95.0': 134737.3997727272,
              '99.0': 403362.50399999996
            }
          },
          avg: {
            value: 39987.86453616932
          }
        },
        {
          key_as_string: '2018-06-08T09:00:00.000Z',
          key: 1528448400000,
          doc_count: 18798,
          pct: {
            values: {
              '95.0': 141206.57726666646,
              '99.0': 396559.0274999993
            }
          },
          avg: {
            value: 41059.392914139804
          }
        },
        {
          key_as_string: '2018-06-08T12:00:00.000Z',
          key: 1528459200000,
          doc_count: 19097,
          pct: {
            values: {
              '95.0': 137731.8994082841,
              '99.0': 371815.8320000008
            }
          },
          avg: {
            value: 39630.710111535845
          }
        },
        {
          key_as_string: '2018-06-08T15:00:00.000Z',
          key: 1528470000000,
          doc_count: 18887,
          pct: {
            values: {
              '95.0': 141476.23189033198,
              '99.0': 405477.6133333326
            }
          },
          avg: {
            value: 41561.81331074284
          }
        },
        {
          key_as_string: '2018-06-08T18:00:00.000Z',
          key: 1528480800000,
          doc_count: 18949,
          pct: {
            values: {
              '95.0': 149636.31340909077,
              '99.0': 413542.18133333366
            }
          },
          avg: {
            value: 43079.490738297536
          }
        },
        {
          key_as_string: '2018-06-08T21:00:00.000Z',
          key: 1528491600000,
          doc_count: 18786,
          pct: {
            values: {
              '95.0': 151934.55000000002,
              '99.0': 424399.340000001
            }
          },
          avg: {
            value: 43925.39609283509
          }
        },
        {
          key_as_string: '2018-06-09T00:00:00.000Z',
          key: 1528502400000,
          doc_count: 5096,
          pct: {
            values: {
              '95.0': 82198.17857142858,
              '99.0': 303815.9000000001
            }
          },
          avg: {
            value: 25821.91424646782
          }
        },
        {
          key_as_string: '2018-06-09T03:00:00.000Z',
          key: 1528513200000,
          doc_count: 5104,
          pct: {
            values: {
              '95.0': 85946.43199999983,
              '99.0': 306305.0800000006
            }
          },
          avg: {
            value: 27343.60011755486
          }
        },
        {
          key_as_string: '2018-06-09T06:00:00.000Z',
          key: 1528524000000,
          doc_count: 5122,
          pct: {
            values: {
              '95.0': 78617.66249999996,
              '99.0': 297521.94999999984
            }
          },
          avg: {
            value: 25249.95060523233
          }
        },
        {
          key_as_string: '2018-06-09T09:00:00.000Z',
          key: 1528534800000,
          doc_count: 5184,
          pct: {
            values: {
              '95.0': 79606.48333333322,
              '99.0': 317938.0900000003
            }
          },
          avg: {
            value: 25492.77199074074
          }
        },
        {
          key_as_string: '2018-06-09T12:00:00.000Z',
          key: 1528545600000,
          doc_count: 5279,
          pct: {
            values: {
              '95.0': 76297.93999999986,
              '99.0': 312262.3000000003
            }
          },
          avg: {
            value: 25991.647281682137
          }
        },
        {
          key_as_string: '2018-06-09T15:00:00.000Z',
          key: 1528556400000,
          doc_count: 5254,
          pct: {
            values: {
              '95.0': 80742.63333333324,
              '99.0': 318428.8700000002
            }
          },
          avg: {
            value: 26273.31290445375
          }
        },
        {
          key_as_string: '2018-06-09T18:00:00.000Z',
          key: 1528567200000,
          doc_count: 5082,
          pct: {
            values: {
              '95.0': 81291.45969696966,
              '99.0': 295421.4099999999
            }
          },
          avg: {
            value: 26234.98976780795
          }
        },
        {
          key_as_string: '2018-06-09T21:00:00.000Z',
          key: 1528578000000,
          doc_count: 5150,
          pct: {
            values: {
              '95.0': 73467.02500000004,
              '99.0': 293067.86000000004
            }
          },
          avg: {
            value: 23494.54873786408
          }
        },
        {
          key_as_string: '2018-06-10T00:00:00.000Z',
          key: 1528588800000,
          doc_count: 5103,
          pct: {
            values: {
              '95.0': 69177.66999999993,
              '99.0': 264935.71999999933
            }
          },
          avg: {
            value: 22008.80482069371
          }
        },
        {
          key_as_string: '2018-06-10T03:00:00.000Z',
          key: 1528599600000,
          doc_count: 5137,
          pct: {
            values: {
              '95.0': 71956.06111111109,
              '99.0': 282795.0400000003
            }
          },
          avg: {
            value: 22828.136655635586
          }
        },
        {
          key_as_string: '2018-06-10T06:00:00.000Z',
          key: 1528610400000,
          doc_count: 5184,
          pct: {
            values: {
              '95.0': 68480.91142857139,
              '99.0': 285390.8400000001
            }
          },
          avg: {
            value: 22138.7081404321
          }
        },
        {
          key_as_string: '2018-06-10T09:00:00.000Z',
          key: 1528621200000,
          doc_count: 4993,
          pct: {
            values: {
              '95.0': 68957.0999999999,
              '99.0': 290402.24
            }
          },
          avg: {
            value: 22634.985579811735
          }
        },
        {
          key_as_string: '2018-06-10T12:00:00.000Z',
          key: 1528632000000,
          doc_count: 5210,
          pct: {
            values: {
              '95.0': 67489.50416666668,
              '99.0': 293655.53
            }
          },
          avg: {
            value: 22202.780998080616
          }
        },
        {
          key_as_string: '2018-06-10T15:00:00.000Z',
          key: 1528642800000,
          doc_count: 5122,
          pct: {
            values: {
              '95.0': 71556.91249999998,
              '99.0': 292723.56999999995
            }
          },
          avg: {
            value: 23084.082780163997
          }
        },
        {
          key_as_string: '2018-06-10T18:00:00.000Z',
          key: 1528653600000,
          doc_count: 5125,
          pct: {
            values: {
              '95.0': 72157.65128205132,
              '99.0': 301051.32000000105
            }
          },
          avg: {
            value: 23109.666146341464
          }
        },
        {
          key_as_string: '2018-06-10T21:00:00.000Z',
          key: 1528664400000,
          doc_count: 5186,
          pct: {
            values: {
              '95.0': 76124.5625,
              '99.0': 291322.0499999998
            }
          },
          avg: {
            value: 23306.89028152719
          }
        },
        {
          key_as_string: '2018-06-11T00:00:00.000Z',
          key: 1528675200000,
          doc_count: 18631,
          pct: {
            values: {
              '95.0': 141709.34661835746,
              '99.0': 379855.2444444447
            }
          },
          avg: {
            value: 39341.022704095325
          }
        },
        {
          key_as_string: '2018-06-11T03:00:00.000Z',
          key: 1528686000000,
          doc_count: 19349,
          pct: {
            values: {
              '95.0': 132371.48641975303,
              '99.0': 371175.2592000001
            }
          },
          avg: {
            value: 37467.17153341258
          }
        },
        {
          key_as_string: '2018-06-11T06:00:00.000Z',
          key: 1528696800000,
          doc_count: 18586,
          pct: {
            values: {
              '95.0': 186783.51503759398,
              '99.0': 498378.4238888898
            }
          },
          avg: {
            value: 52457.50554180566
          }
        },
        {
          key_as_string: '2018-06-11T09:00:00.000Z',
          key: 1528707600000,
          doc_count: 18887,
          pct: {
            values: {
              '95.0': 99540.17819499348,
              '99.0': 331118.6599999997
            }
          },
          avg: {
            value: 31327.95780166252
          }
        },
        {
          key_as_string: '2018-06-11T12:00:00.000Z',
          key: 1528718400000,
          doc_count: 18866,
          pct: {
            values: {
              '95.0': 95982.62454212455,
              '99.0': 328101.3999999988
            }
          },
          avg: {
            value: 30695.334941163997
          }
        },
        {
          key_as_string: '2018-06-11T15:00:00.000Z',
          key: 1528729200000,
          doc_count: 19469,
          pct: {
            values: {
              '95.0': 89559.3525925925,
              '99.0': 313951.54249999986
            }
          },
          avg: {
            value: 28895.042785967435
          }
        },
        {
          key_as_string: '2018-06-11T18:00:00.000Z',
          key: 1528740000000,
          doc_count: 18767,
          pct: {
            values: {
              '95.0': 95769.83153735634,
              '99.0': 323340.5274074075
            }
          },
          avg: {
            value: 30649.363989982416
          }
        },
        {
          key_as_string: '2018-06-11T21:00:00.000Z',
          key: 1528750800000,
          doc_count: 19006,
          pct: {
            values: {
              '95.0': 94063.90833755062,
              '99.0': 315055.5047619052
            }
          },
          avg: {
            value: 29802.63622014101
          }
        },
        {
          key_as_string: '2018-06-12T00:00:00.000Z',
          key: 1528761600000,
          doc_count: 19082,
          pct: {
            values: {
              '95.0': 96399.67269119772,
              '99.0': 330070.03599999985
            }
          },
          avg: {
            value: 30759.03002829892
          }
        },
        {
          key_as_string: '2018-06-12T03:00:00.000Z',
          key: 1528772400000,
          doc_count: 18908,
          pct: {
            values: {
              '95.0': 96436.42520161276,
              '99.0': 320531.54416666675
            }
          },
          avg: {
            value: 30399.76549608631
          }
        },
        {
          key_as_string: '2018-06-12T06:00:00.000Z',
          key: 1528783200000,
          doc_count: 19055,
          pct: {
            values: {
              '95.0': 91860.16988095238,
              '99.0': 315137.16628571344
            }
          },
          avg: {
            value: 29421.610233534506
          }
        },
        {
          key_as_string: '2018-06-12T09:00:00.000Z',
          key: 1528794000000,
          doc_count: 19047,
          pct: {
            values: {
              '95.0': 105989.8333333334,
              '99.0': 337251.4042424246
            }
          },
          avg: {
            value: 32641.679897096656
          }
        },
        {
          key_as_string: '2018-06-12T12:00:00.000Z',
          key: 1528804800000,
          doc_count: 18733,
          pct: {
            values: {
              '95.0': 97937.60342555979,
              '99.0': 327054.9243636365
            }
          },
          avg: {
            value: 30621.65440666204
          }
        },
        {
          key_as_string: '2018-06-12T15:00:00.000Z',
          key: 1528815600000,
          doc_count: 19079,
          pct: {
            values: {
              '95.0': 98967.2249999999,
              '99.0': 327653.0000000006
            }
          },
          avg: {
            value: 31039.60391005818
          }
        },
        {
          key_as_string: '2018-06-12T18:00:00.000Z',
          key: 1528826400000,
          doc_count: 18907,
          pct: {
            values: {
              '95.0': 97561.02469135808,
              '99.0': 324505.1399999999
            }
          },
          avg: {
            value: 30954.760723541545
          }
        },
        {
          key_as_string: '2018-06-12T21:00:00.000Z',
          key: 1528837200000,
          doc_count: 18971,
          pct: {
            values: {
              '95.0': 102557.78813357186,
              '99.0': 338040.3999999998
            }
          },
          avg: {
            value: 31902.050234568553
          }
        },
        {
          key_as_string: '2018-06-13T00:00:00.000Z',
          key: 1528848000000,
          doc_count: 18899,
          pct: {
            values: {
              '95.0': 100137.87578595306,
              '99.0': 328600.5173333335
            }
          },
          avg: {
            value: 31594.350653473728
          }
        },
        {
          key_as_string: '2018-06-13T03:00:00.000Z',
          key: 1528858800000,
          doc_count: 19182,
          pct: {
            values: {
              '95.0': 98412.97120445351,
              '99.0': 334060.93628571345
            }
          },
          avg: {
            value: 31343.87243248879
          }
        },
        {
          key_as_string: '2018-06-13T06:00:00.000Z',
          key: 1528869600000,
          doc_count: 19030,
          pct: {
            values: {
              '95.0': 101607.8328012912,
              '99.0': 328569.4964999998
            }
          },
          avg: {
            value: 31200.14450867052
          }
        },
        {
          key_as_string: '2018-06-13T09:00:00.000Z',
          key: 1528880400000,
          doc_count: 19257,
          pct: {
            values: {
              '95.0': 92000.51368421057,
              '99.0': 320227.32399999973
            }
          },
          avg: {
            value: 28560.946668743833
          }
        },
        {
          key_as_string: '2018-06-13T12:00:00.000Z',
          key: 1528891200000,
          doc_count: 19348,
          pct: {
            values: {
              '95.0': 78027.29473684198,
              '99.0': 292019.2899999998
            }
          },
          avg: {
            value: 24700.216146371717
          }
        },
        {
          key_as_string: '2018-06-13T15:00:00.000Z',
          key: 1528902000000,
          doc_count: 19119,
          pct: {
            values: {
              '95.0': 80762.078801789,
              '99.0': 297757.72666666657
            }
          },
          avg: {
            value: 25261.025210523563
          }
        },
        {
          key_as_string: '2018-06-13T18:00:00.000Z',
          key: 1528912800000,
          doc_count: 19206,
          pct: {
            values: {
              '95.0': 81160.83425925927,
              '99.0': 308034.4466666669
            }
          },
          avg: {
            value: 26041.39789649068
          }
        },
        {
          key_as_string: '2018-06-13T21:00:00.000Z',
          key: 1528923600000,
          doc_count: 19078,
          pct: {
            values: {
              '95.0': 84215.58945578222,
              '99.0': 301128.4895238093
            }
          },
          avg: {
            value: 26123.556295209142
          }
        },
        {
          key_as_string: '2018-06-14T00:00:00.000Z',
          key: 1528934400000,
          doc_count: 19551,
          pct: {
            values: {
              '95.0': 194188.21428571426,
              '99.0': 447266.9
            }
          },
          avg: {
            value: 46231.36177177638
          }
        },
        {
          key_as_string: '2018-06-14T03:00:00.000Z',
          key: 1528945200000,
          doc_count: 18888,
          pct: {
            values: {
              '95.0': 172616.2293896504,
              '99.0': 409147.332500001
            }
          },
          avg: {
            value: 45350.42005506141
          }
        },
        {
          key_as_string: '2018-06-14T06:00:00.000Z',
          key: 1528956000000,
          doc_count: 18823,
          pct: {
            values: {
              '95.0': 182653.81858220184,
              '99.0': 423121.9773333328
            }
          },
          avg: {
            value: 48256.049354513096
          }
        },
        {
          key_as_string: '2018-06-14T09:00:00.000Z',
          key: 1528966800000,
          doc_count: 18766,
          pct: {
            values: {
              '95.0': 194970.75667682925,
              '99.0': 473485.4199999998
            }
          },
          avg: {
            value: 52360.30017052116
          }
        },
        {
          key_as_string: '2018-06-14T12:00:00.000Z',
          key: 1528977600000,
          doc_count: 0,
          pct: {
            values: {
              '95.0': 'NaN',
              '99.0': 'NaN'
            }
          },
          avg: {
            value: null
          }
        }
      ]
    },
    overall_avg_duration: {
      value: 32861.15660262639
    }
  }
} as unknown) as ESResponse;
