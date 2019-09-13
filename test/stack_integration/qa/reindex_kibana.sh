#!/bin/bash

if [ -z "${CONFIG_DIR}" ]; then . ./.sh; fi

echo "See https://www.elastic.co/guide/en/kibana/6.0/migrating-6.0-index.html"

ESURL=https://elastic:changeit@localhost:9200

curl -k -XPUT "${ESURL}/.kibana/_settings" -H 'Content-Type: application/json' -d'
{
  "index.blocks.write": true
}'


# without     "index.format": 6,
curl -k -XPUT "${ESURL}/.kibana-6" -H 'Content-Type: application/json' -d'
{
  "settings" : {
    "number_of_shards" : 1,
    "index.mapper.dynamic": false
  },
  "mappings" : {
    "doc": {
      "properties": {
        "type": {
          "type": "keyword"
        },
        "updated_at": {
          "type": "date"
        },
        "config": {
          "properties": {
            "buildNum": {
              "type": "keyword"
            }
          }
        },
        "index-pattern": {
          "properties": {
            "fieldFormatMap": {
              "type": "text"
            },
            "fields": {
              "type": "text"
            },
            "intervalName": {
              "type": "keyword"
            },
            "notExpandable": {
              "type": "boolean"
            },
            "sourceFilters": {
              "type": "text"
            },
            "timeFieldName": {
              "type": "keyword"
            },
            "title": {
              "type": "text"
            }
          }
        },
        "visualization": {
          "properties": {
            "description": {
              "type": "text"
            },
            "kibanaSavedObjectMeta": {
              "properties": {
                "searchSourceJSON": {
                  "type": "text"
                }
              }
            },
            "savedSearchId": {
              "type": "keyword"
            },
            "title": {
              "type": "text"
            },
            "uiStateJSON": {
              "type": "text"
            },
            "version": {
              "type": "integer"
            },
            "visState": {
              "type": "text"
            }
          }
        },
        "search": {
          "properties": {
            "columns": {
              "type": "keyword"
            },
            "description": {
              "type": "text"
            },
            "hits": {
              "type": "integer"
            },
            "kibanaSavedObjectMeta": {
              "properties": {
                "searchSourceJSON": {
                  "type": "text"
                }
              }
            },
            "sort": {
              "type": "keyword"
            },
            "title": {
              "type": "text"
            },
            "version": {
              "type": "integer"
            }
          }
        },
        "dashboard": {
          "properties": {
            "description": {
              "type": "text"
            },
            "hits": {
              "type": "integer"
            },
            "kibanaSavedObjectMeta": {
              "properties": {
                "searchSourceJSON": {
                  "type": "text"
                }
              }
            },
            "optionsJSON": {
              "type": "text"
            },
            "panelsJSON": {
              "type": "text"
            },
            "refreshInterval": {
              "properties": {
                "display": {
                  "type": "keyword"
                },
                "pause": {
                  "type": "boolean"
                },
                "section": {
                  "type": "integer"
                },
                "value": {
                  "type": "integer"
                }
              }
            },
            "timeFrom": {
              "type": "keyword"
            },
            "timeRestore": {
              "type": "boolean"
            },
            "timeTo": {
              "type": "keyword"
            },
            "title": {
              "type": "text"
            },
            "uiStateJSON": {
              "type": "text"
            },
            "version": {
              "type": "integer"
            }
          }
        },
        "url": {
          "properties": {
            "accessCount": {
              "type": "long"
            },
            "accessDate": {
              "type": "date"
            },
            "createDate": {
              "type": "date"
            },
            "url": {
              "type": "text",
              "fields": {
                "keyword": {
                  "type": "keyword",
                  "ignore_above": 2048
                }
              }
            }
          }
        },
        "server": {
          "properties": {
            "uuid": {
              "type": "keyword"
            }
          }
        },
        "timelion-sheet": {
          "properties": {
            "description": {
              "type": "text"
            },
            "hits": {
              "type": "integer"
            },
            "kibanaSavedObjectMeta": {
              "properties": {
                "searchSourceJSON": {
                  "type": "text"
                }
              }
            },
            "timelion_chart_height": {
              "type": "integer"
            },
            "timelion_columns": {
              "type": "integer"
            },
            "timelion_interval": {
              "type": "keyword"
            },
            "timelion_other_interval": {
              "type": "keyword"
            },
            "timelion_rows": {
              "type": "integer"
            },
            "timelion_sheet": {
              "type": "text"
            },
            "title": {
              "type": "text"
            },
            "version": {
              "type": "integer"
            }
          }
        },
        "graph-workspace": {
          "properties": {
            "description": {
              "type": "text"
            },
            "kibanaSavedObjectMeta": {
              "properties": {
                "searchSourceJSON": {
                  "type": "text"
                }
              }
            },
            "numLinks": {
              "type": "integer"
            },
            "numVertices": {
              "type": "integer"
            },
            "title": {
              "type": "text"
            },
            "version": {
              "type": "integer"
            },
            "wsState": {
              "type": "text"
            }
          }
        }
      }
    }
  }
}'

curl -k -XPOST "${ESURL}/_reindex" -H 'Content-Type: application/json' -d'
{
  "source": {
    "index": ".kibana"
  },
  "dest": {
    "index": ".kibana-6"
  },
  "script": {
    "source": "ctx._source = [ ctx._type : ctx._source ]; ctx._source.type = ctx._type; ctx._id = ctx._type + \":\" + ctx._id; ctx._type = \"doc\"; "
  }
}'

curl -k -XPOST "${ESURL}/_aliases" -H 'Content-Type: application/json' -d'
{
  "actions" : [
    { "add":  { "index": ".kibana-6", "alias": ".kibana" } },
    { "remove_index": { "index": ".kibana" } }
  ]
}'


# curl -k -XPUT "${ESURL}/.kibana-6" -H 'Content-Type: application/json' -d'
# {
#   "settings" : {
#     "number_of_shards" : 1,
#     "index.format": 6,
#     "index.mapper.dynamic": false
#   },
#   "mappings" : {
#     "doc": {
#       "properties": {
#         "type": {
#           "type": "keyword"
#         },
#         "updated_at": {
#           "type": "date"
#         },
#         "config": {
#           "properties": {
#             "buildNum": {
#               "type": "keyword"
#             }
#           }
#         },
#         "index-pattern": {
#           "properties": {
#             "fieldFormatMap": {
#               "type": "text"
#             },
#             "fields": {
#               "type": "text"
#             },
#             "intervalName": {
#               "type": "keyword"
#             },
#             "notExpandable": {
#               "type": "boolean"
#             },
#             "sourceFilters": {
#               "type": "text"
#             },
#             "timeFieldName": {
#               "type": "keyword"
#             },
#             "title": {
#               "type": "text"
#             }
#           }
#         },
#         "visualization": {
#           "properties": {
#             "description": {
#               "type": "text"
#             },
#             "kibanaSavedObjectMeta": {
#               "properties": {
#                 "searchSourceJSON": {
#                   "type": "text"
#                 }
#               }
#             },
#             "savedSearchId": {
#               "type": "keyword"
#             },
#             "title": {
#               "type": "text"
#             },
#             "uiStateJSON": {
#               "type": "text"
#             },
#             "version": {
#               "type": "integer"
#             },
#             "visState": {
#               "type": "text"
#             }
#           }
#         },
#         "search": {
#           "properties": {
#             "columns": {
#               "type": "keyword"
#             },
#             "description": {
#               "type": "text"
#             },
#             "hits": {
#               "type": "integer"
#             },
#             "kibanaSavedObjectMeta": {
#               "properties": {
#                 "searchSourceJSON": {
#                   "type": "text"
#                 }
#               }
#             },
#             "sort": {
#               "type": "keyword"
#             },
#             "title": {
#               "type": "text"
#             },
#             "version": {
#               "type": "integer"
#             }
#           }
#         },
#         "dashboard": {
#           "properties": {
#             "description": {
#               "type": "text"
#             },
#             "hits": {
#               "type": "integer"
#             },
#             "kibanaSavedObjectMeta": {
#               "properties": {
#                 "searchSourceJSON": {
#                   "type": "text"
#                 }
#               }
#             },
#             "optionsJSON": {
#               "type": "text"
#             },
#             "panelsJSON": {
#               "type": "text"
#             },
#             "refreshInterval": {
#               "properties": {
#                 "display": {
#                   "type": "keyword"
#                 },
#                 "pause": {
#                   "type": "boolean"
#                 },
#                 "section": {
#                   "type": "integer"
#                 },
#                 "value": {
#                   "type": "integer"
#                 }
#               }
#             },
#             "timeFrom": {
#               "type": "keyword"
#             },
#             "timeRestore": {
#               "type": "boolean"
#             },
#             "timeTo": {
#               "type": "keyword"
#             },
#             "title": {
#               "type": "text"
#             },
#             "uiStateJSON": {
#               "type": "text"
#             },
#             "version": {
#               "type": "integer"
#             }
#           }
#         },
#         "url": {
#           "properties": {
#             "accessCount": {
#               "type": "long"
#             },
#             "accessDate": {
#               "type": "date"
#             },
#             "createDate": {
#               "type": "date"
#             },
#             "url": {
#               "type": "text",
#               "fields": {
#                 "keyword": {
#                   "type": "keyword",
#                   "ignore_above": 2048
#                 }
#               }
#             }
#           }
#         },
#         "server": {
#           "properties": {
#             "uuid": {
#               "type": "keyword"
#             }
#           }
#         },
#         "timelion-sheet": {
#           "properties": {
#             "description": {
#               "type": "text"
#             },
#             "hits": {
#               "type": "integer"
#             },
#             "kibanaSavedObjectMeta": {
#               "properties": {
#                 "searchSourceJSON": {
#                   "type": "text"
#                 }
#               }
#             },
#             "timelion_chart_height": {
#               "type": "integer"
#             },
#             "timelion_columns": {
#               "type": "integer"
#             },
#             "timelion_interval": {
#               "type": "keyword"
#             },
#             "timelion_other_interval": {
#               "type": "keyword"
#             },
#             "timelion_rows": {
#               "type": "integer"
#             },
#             "timelion_sheet": {
#               "type": "text"
#             },
#             "title": {
#               "type": "text"
#             },
#             "version": {
#               "type": "integer"
#             }
#           }
#         },
#         "graph-workspace": {
#           "properties": {
#             "description": {
#               "type": "text"
#             },
#             "kibanaSavedObjectMeta": {
#               "properties": {
#                 "searchSourceJSON": {
#                   "type": "text"
#                 }
#               }
#             },
#             "numLinks": {
#               "type": "integer"
#             },
#             "numVertices": {
#               "type": "integer"
#             },
#             "title": {
#               "type": "text"
#             },
#             "version": {
#               "type": "integer"
#             },
#             "wsState": {
#               "type": "text"
#             }
#           }
#         }
#       }
#     }
#   }
# }'
