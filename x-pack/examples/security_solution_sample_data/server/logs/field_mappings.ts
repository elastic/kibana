/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export const fieldMappings = {
  "@timestamp": {
    "type": "date",
    "ignore_malformed": false
  },
  "destination": {
    "properties": {
      "bytes": {
        "type": "long"
      },
      "geo": {
        "properties": {
          "city_name": {
            "type": "keyword"
          },
          "continent_name": {
            "type": "keyword"
          },
          "country_iso_code": {
            "type": "keyword"
          },
          "country_name": {
            "type": "keyword"
          },
          "location": {
            "type": "geo_point"
          },
          "region_iso_code": {
            "type": "keyword"
          },
          "region_name": {
            "type": "keyword"
          },
          "timezone": {
            "type": "keyword",
            "ignore_above": 1024
          }
        }
      },
      "ip": {
        "type": "ip"
      }
    }
  },
  "ecs": {
    "properties": {
      "version": {
        "type": "keyword"
      }
    }
  },
  "event": {
    "properties": {
      "category": {
        "type": "keyword"
      },
      "kind": {
        "type": "keyword"
      },
      "type": {
        "type": "keyword"
      }
    }
  },
  "host": {
    "properties": {
      "geo": {
        "properties": {
          "city_name": {
            "type": "keyword"
          },
          "continent_name": {
            "type": "keyword"
          },
          "country_iso_code": {
            "type": "keyword"
          },
          "country_name": {
            "type": "keyword"
          },
          "location": {
            "type": "geo_point"
          },
          "region_iso_code": {
            "type": "keyword"
          },
          "region_name": {
            "type": "keyword"
          }
        }
      },
      "name": {
        "type": "keyword"
      }
    }
  },
  "source": {
    "properties": {
      "bytes": {
        "type": "long"
      },
      "geo": {
        "properties": {
          "city_name": {
            "type": "keyword"
          },
          "continent_name": {
            "type": "keyword"
          },
          "country_iso_code": {
            "type": "keyword"
          },
          "country_name": {
            "type": "keyword"
          },
          "location": {
            "type": "geo_point"
          },
          "region_iso_code": {
            "type": "keyword"
          },
          "region_name": {
            "type": "keyword"
          },
          "timezone": {
            "type": "keyword",
            "ignore_above": 1024
          }
        }
      },
      "ip": {
        "type": "ip"
      }
    }
  }
}