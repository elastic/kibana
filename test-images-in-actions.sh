#!/usr/bin/env bash

curl $KB_URL/api/actions/connector/slack-api/_execute \
  -H "content-type: application/json" \
  -H "kbn-xsrf: foo" \
  -d '{
    "params": {
      "subAction": "postMessage",
      "subActionParams": {
        "channels": ["kibana-alerting"],
        "text": "hello <kibana-chart-data>{\"values\":[{\"d\":\"2023-12-19T12:20:43.000Z\",\"v\":0,\"g\":\"group A\"},{\"d\":\"2023-12-19T12:20:44.000Z\",\"v\":1,\"g\":\"group A\"}],\"field\":\"some.field\",\"thresholds\":[2.5]}</kibana-chart-data> there"
      }
    }
  }'
