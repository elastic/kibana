/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';

export const estimateBucketSpanSchema = {
  aggTypes: schema.arrayOf(schema.nullable(schema.string())),
  duration: schema.object({ start: schema.number(), end: schema.number() }),
  fields: schema.arrayOf(schema.nullable(schema.string())),
  index: schema.string(),
  query: schema.any(),
  splitField: schema.maybe(schema.string()),
  timeField: schema.maybe(schema.string()),
};

export const validateCardinalitySchema = {};

// ---- 3. VALIDATE CARDINALITY --- {
//   "job_id": "",
//   "description": "",
//   "groups": [],
//   "analysis_config": {
//     "bucket_span": "15m",
//     "detectors": [
//       {
//         "function": "mean",
//         "field_name": "CPUUtilization",
//         "over_field_name": "region"
//       }
//     ],
//     "influencers": [
//       "region"
//     ]
//   },
//   "data_description": {
//     "time_field": "@timestamp"
//   },
//   "model_plot_config": {
//     "enabled": true
//   },
//   "datafeed_config": {
//     "datafeed_id": "datafeed-",
//     "indices": [
//       "cloudwatch-2019*"
//     ],
//     "query": {
//       "bool": {
//         "must": [
//           {
//             "match_all": {}
//           }
//         ]
//       }
//     },
//     "job_id": ""
//   }
// }

// ---- 3. VALIDATE CARDINALITY --- {
//   "job_id": "",
//   "description": "",
//   "groups": [],
//   "analysis_config": {
//     "bucket_span": "15m",
//     "detectors": [
//       {
//         "function": "sum",
//         "field_name": "products.base_price"
//       }
//     ],
//     "influencers": [],
//     "summary_count_field_name": "doc_count"
//   },
//   "data_description": {
//     "time_field": "order_date"
//   },
//   "analysis_limits": {
//     "model_memory_limit": "10MB"
//   },
//   "model_plot_config": {
//     "enabled": true
//   },
//   "datafeed_config": {
//     "datafeed_id": "",
//     "indices": [
//       "kibana_sample_data_ecommerce"
//     ],
//     "query": {
//       "bool": {
//         "must": [
//           {
//             "match_all": {}
//           }
//         ],
//         "filter": [],
//         "must_not": []
//       }
//     },
//     "aggregations": {
//       "buckets": {
//         "date_histogram": {
//           "field": "order_date",
//           "fixed_interval": "90000ms"
//         },
//         "aggregations": {
//           "products.base_price": {
//             "sum": {
//               "field": "products.base_price"
//             }
//           },
//           "order_date": {
//             "max": {
//               "field": "order_date"
//             }
//           }
//         }
//       }
//     }
//   }
// }

// ---- 4. VALIDATE JOB --- {
//   "duration": {
//     "start": 1572220800000,
//     "end": 1573479060000
//   },
//   "job": {
//     "job_id": "mean-cpu-single-metric",
//     "description": "test",
//     "groups": [
//       "cloudwatch"
//     ],
//     "analysis_config": {
//       "bucket_span": "15m",
//       "detectors": [
//         {
//           "function": "mean",
//           "field_name": "CPUUtilization"
//         }
//       ],
//       "influencers": [],
//       "summary_count_field_name": "doc_count"
//     },
//     "data_description": {
//       "time_field": "@timestamp"
//     },
//     "custom_settings": {
//       "created_by": "single-metric-wizard",
//       "custom_urls": [
//         {
//           "url_name": "test-one",
//           "url_value": "kibana#/dashboard/722b74f0-b882-11e8-a6d9-e546fe2bba5f?_g=(time:(from:'$earliest$',mode:absolute,to:'$latest$'))&_a=(filters:!(),query:(language:kuery,query:''))",
//           "time_range": "auto"
//         }
//       ]
//     },
//     "analysis_limits": {
//       "model_memory_limit": "10MB"
//     },
//     "model_plot_config": {
//       "enabled": true
//     },
//     "datafeed_config": {
//       "datafeed_id": "datafeed-mean-cpu-single-metric",
//       "indices": [
//         "cloudwatch-2019*"
//       ],
//       "query": {
//         "bool": {
//           "must": [
//             {
//               "match_all": {}
//             }
//           ]
//         }
//       },
//       "aggregations": {
//         "buckets": {
//           "date_histogram": {
//             "field": "@timestamp",
//             "fixed_interval": "90000ms"
//           },
//           "aggregations": {
//             "CPUUtilization": {
//               "avg": {
//                 "field": "CPUUtilization"
//               }
//             },
//             "@timestamp": {
//               "max": {
//                 "field": "@timestamp"
//               }
//             }
//           }
//         }
//       },
//       "job_id": "mean-cpu-single-metric"
//     }
//   }
// }
