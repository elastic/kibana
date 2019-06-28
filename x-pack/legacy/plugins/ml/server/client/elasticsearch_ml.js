/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



export const elasticsearchJsPlugin = (Client, config, components) => {
  const ca = components.clientAction.factory;

  Client.prototype.ml = components.clientAction.namespaceFactory();
  const ml = Client.prototype.ml.prototype;

  /**
   * Perform a [ml.authenticate](Retrieve details about the currently authenticated user) request
   *
   * @param {Object} params - An object with parameters used to carry out this action
   */
  ml.jobs = ca({
    urls: [
      {
        fmt: '/_ml/anomaly_detectors/<%=jobId%>',
        req: {
          jobId: {
            type: 'list'
          }
        }
      },
      {
        fmt: '/_ml/anomaly_detectors/',
      }
    ],
    method: 'GET'
  });

  ml.jobStats = ca({
    urls: [
      {
        fmt: '/_ml/anomaly_detectors/<%=jobId%>/_stats',
        req: {
          jobId: {
            type: 'list'
          }
        }
      },
      {
        fmt: '/_ml/anomaly_detectors/_stats',
      }
    ],
    method: 'GET'
  });

  ml.addJob = ca({
    urls: [
      {
        fmt: '/_ml/anomaly_detectors/<%=jobId%>',
        req: {
          jobId: {
            type: 'string'
          }
        }
      }
    ],
    needBody: true,
    method: 'PUT'
  });

  ml.openJob = ca({
    urls: [
      {
        fmt: '/_ml/anomaly_detectors/<%=jobId%>/_open',
        req: {
          jobId: {
            type: 'string'
          }
        }
      }
    ],
    method: 'POST'
  });

  ml.closeJob = ca({
    urls: [
      {
        fmt: '/_ml/anomaly_detectors/<%=jobId%>/_close?force=<%=force%>',
        req: {
          jobId: {
            type: 'string'
          },
          force: {
            type: 'boolean'
          }
        }
      },
      {
        fmt: '/_ml/anomaly_detectors/<%=jobId%>/_close',
        req: {
          jobId: {
            type: 'string'
          }
        }
      }
    ],
    method: 'POST'
  });

  // Currently the endpoint uses a default size of 100 unless a size is supplied.
  // So until paging is supported in the UI, explicitly supply a size of 1000
  // to match the max number of docs that the endpoint can return.
  ml.getDataFrameTransforms = ca({
    urls: [
      {
        fmt: '/_data_frame/transforms/_all?size=1000',
      }
    ],
    method: 'GET'
  });

  ml.getDataFrameTransformsStats = ca({
    urls: [
      {
        fmt: '/_data_frame/transforms/<%=jobId%>/_stats',
        req: {
          jobId: {
            type: 'string'
          }
        }
      },
      {
        // Currently the endpoint uses a default size of 100 unless a size is supplied.
        // So until paging is supported in the UI, explicitly supply a size of 1000
        // to match the max number of docs that the endpoint can return.
        fmt: '/_data_frame/transforms/_all/_stats?size=1000',
      }
    ],
    method: 'GET'
  });

  ml.createDataFrameTransformsJob = ca({
    urls: [
      {
        fmt: '/_data_frame/transforms/<%=jobId%>',
        req: {
          jobId: {
            type: 'string'
          }
        }
      }
    ],
    needBody: true,
    method: 'PUT'
  });

  ml.deleteDataFrameTransformsJob = ca({
    urls: [
      {
        fmt: '/_data_frame/transforms/<%=jobId%>',
        req: {
          jobId: {
            type: 'string'
          }
        }
      }
    ],
    method: 'DELETE'
  });

  ml.getDataFrameTransformsPreview = ca({
    urls: [
      {
        fmt: '/_data_frame/transforms/_preview'
      }
    ],
    needBody: true,
    method: 'POST'
  });

  ml.startDataFrameTransformsJob = ca({
    urls: [
      {
        fmt: '/_data_frame/transforms/<%=jobId%>/_start',
        req: {
          jobId: {
            type: 'string'
          }
        }
      }
    ],
    method: 'POST'
  });

  ml.stopDataFrameTransformsJob = ca({
    urls: [
      {
        fmt: '/_data_frame/transforms/<%=jobId%>/_stop?&force=<%=force%>',
        req: {
          jobId: {
            type: 'string'
          },
          force: {
            type: 'boolean'
          }
        }
      }
    ],
    method: 'POST'
  });

  ml.deleteJob = ca({
    urls: [
      {
        fmt: '/_ml/anomaly_detectors/<%=jobId%>?&force=<%=force%>&wait_for_completion=false',
        req: {
          jobId: {
            type: 'string'
          },
          force: {
            type: 'boolean'
          }
        }
      },
      {
        fmt: '/_ml/anomaly_detectors/<%=jobId%>?&wait_for_completion=false',
        req: {
          jobId: {
            type: 'string'
          }
        }
      }
    ],
    method: 'DELETE'
  });

  ml.updateJob = ca({
    urls: [
      {
        fmt: '/_ml/anomaly_detectors/<%=jobId%>/_update',
        req: {
          jobId: {
            type: 'string'
          }
        }
      }
    ],
    needBody: true,
    method: 'POST'
  });

  ml.datafeeds = ca({
    urls: [
      {
        fmt: '/_ml/datafeeds/<%=datafeedId%>',
        req: {
          datafeedId: {
            type: 'list'
          }
        }
      },
      {
        fmt: '/_ml/datafeeds/',
      }
    ],
    method: 'GET'
  });

  ml.datafeedStats = ca({
    urls: [
      {
        fmt: '/_ml/datafeeds/<%=datafeedId%>/_stats',
        req: {
          datafeedId: {
            type: 'list'
          }
        }
      },
      {
        fmt: '/_ml/datafeeds/_stats',
      }
    ],
    method: 'GET'
  });

  ml.addDatafeed = ca({
    urls: [
      {
        fmt: '/_ml/datafeeds/<%=datafeedId%>',
        req: {
          datafeedId: {
            type: 'string'
          }
        }
      }
    ],
    needBody: true,
    method: 'PUT'
  });

  ml.updateDatafeed = ca({
    urls: [
      {
        fmt: '/_ml/datafeeds/<%=datafeedId%>/_update',
        req: {
          datafeedId: {
            type: 'string'
          }
        }
      }
    ],
    needBody: true,
    method: 'POST'
  });

  ml.deleteDatafeed = ca({
    urls: [
      {
        fmt: '/_ml/datafeeds/<%=datafeedId%>?force=<%=force%>',
        req: {
          datafeedId: {
            type: 'string'
          },
          force: {
            type: 'boolean'
          }
        }
      },
      {
        fmt: '/_ml/datafeeds/<%=datafeedId%>',
        req: {
          datafeedId: {
            type: 'string'
          }
        }
      }
    ],
    method: 'DELETE'
  });

  ml.startDatafeed = ca({
    urls: [
      {
        fmt: '/_ml/datafeeds/<%=datafeedId%>/_start?&start=<%=start%>&end=<%=end%>',
        req: {
          datafeedId: {
            type: 'string'
          },
          start: {
            type: 'string'
          },
          end: {
            type: 'string'
          }
        }
      },
      {
        fmt: '/_ml/datafeeds/<%=datafeedId%>/_start?&start=<%=start%>',
        req: {
          datafeedId: {
            type: 'string'
          },
          start: {
            type: 'string'
          }
        }
      },
      {
        fmt: '/_ml/datafeeds/<%=datafeedId%>/_start',
        req: {
          datafeedId: {
            type: 'string'
          }
        }
      }
    ],
    method: 'POST'
  });

  ml.stopDatafeed = ca({
    urls: [
      {
        fmt: '/_ml/datafeeds/<%=datafeedId%>/_stop',
        req: {
          datafeedId: {
            type: 'string'
          }
        }
      }
    ],
    method: 'POST'
  });

  ml.validateDetector = ca({
    url: {
      fmt: '/_ml/anomaly_detectors/_validate/detector'
    },
    needBody: true,
    method: 'POST'
  });

  ml.datafeedPreview = ca({
    url: {
      fmt: '/_ml/datafeeds/<%=datafeedId%>/_preview',
      req: {
        datafeedId: {
          type: 'string'
        }
      }
    },
    method: 'GET'
  });

  ml.forecast = ca({
    urls: [
      {
        fmt: '/_ml/anomaly_detectors/<%=jobId%>/_forecast?&duration=<%=duration%>',
        req: {
          jobId: {
            type: 'string'
          },
          duration: {
            type: 'string'
          }
        }
      },
      {
        fmt: '/_ml/anomaly_detectors/<%=jobId%>/_forecast',
        req: {
          jobId: {
            type: 'string'
          }
        }
      }
    ],
    method: 'POST'
  });

  ml.overallBuckets = ca({
    url: {
      fmt: '/_ml/anomaly_detectors/<%=jobId%>/results/overall_buckets',
      req: {
        jobId: {
          type: 'string'
        }
      }
    },
    method: 'POST'
  });

  ml.privilegeCheck = ca({
    url: {
      fmt: '/_security/user/_has_privileges'
    },
    needBody: true,
    method: 'POST'
  });

  ml.calendars = ca({
    urls: [
      {
        fmt: '/_ml/calendars/<%=calendarId%>',
        req: {
          calendarId: {
            type: 'string'
          }
        }
      },
      {
        fmt: '/_ml/calendars/',
      }
    ],
    method: 'GET'
  });

  ml.deleteCalendar = ca({
    url: {
      fmt: '/_ml/calendars/<%=calendarId%>',
      req: {
        calendarId: {
          type: 'string'
        }
      }
    },
    method: 'DELETE'
  });

  ml.addCalendar = ca({
    url: {
      fmt: '/_ml/calendars/<%=calendarId%>',
      req: {
        calendarId: {
          type: 'string'
        }
      }
    },
    needBody: true,
    method: 'PUT'
  });

  ml.addJobToCalendar = ca({
    url: {
      fmt: '/_ml/calendars/<%=calendarId%>/jobs/<%=jobId%>',
      req: {
        calendarId: {
          type: 'string'
        },
        jobId: {
          type: 'string'
        }
      }
    },
    method: 'PUT'
  });

  ml.removeJobFromCalendar = ca({
    url: {
      fmt: '/_ml/calendars/<%=calendarId%>/jobs/<%=jobId%>',
      req: {
        calendarId: {
          type: 'string'
        },
        jobId: {
          type: 'string'
        }
      }
    },
    method: 'DELETE'
  });

  ml.events = ca({
    urls: [
      {
        fmt: '/_ml/calendars/<%=calendarId%>/events',
        req: {
          calendarId: {
            type: 'string'
          }
        }
      },
      {
        fmt: '/_ml/calendars/<%=calendarId%>/events?&job_id=<%=jobId%>',
        req: {
          calendarId: {
            type: 'string'
          },
          jobId: {
            type: 'string'
          }
        }
      },
      {
        fmt: '/_ml/calendars/<%=calendarId%>/events?&after=<%=start%>&before=<%=end%>',
        req: {
          calendarId: {
            type: 'string'
          },
          start: {
            type: 'string'
          },
          end: {
            type: 'string'
          }
        }
      },
      {
        fmt: '/_ml/calendars/<%=calendarId%>/events?&after=<%=start%>&before=<%=end%>&job_id=<%=jobId%>',
        req: {
          calendarId: {
            type: 'string'
          },
          start: {
            type: 'string'
          },
          end: {
            type: 'string'
          },
          jobId: {
            type: 'string'
          }
        }
      }
    ],
    method: 'GET'
  });

  ml.addEvent = ca({
    url: {
      fmt: '/_ml/calendars/<%=calendarId%>/events',
      req: {
        calendarId: {
          type: 'string'
        }
      }
    },
    needBody: true,
    method: 'POST'
  });

  ml.deleteEvent = ca({
    url: {
      fmt: '/_ml/calendars/<%=calendarId%>/events/<%=eventId%>',
      req: {
        calendarId: {
          type: 'string'
        },
        eventId: {
          type: 'string'
        }
      }
    },
    method: 'DELETE'
  });

  ml.filters = ca({
    urls: [
      {
        fmt: '/_ml/filters/<%=filterId%>',
        req: {
          filterId: {
            type: 'string'
          }
        }
      },
      {
        fmt: '/_ml/filters/',
      }
    ],
    method: 'GET'
  });

  ml.addFilter = ca({
    url: {
      fmt: '/_ml/filters/<%=filterId%>',
      req: {
        filterId: {
          type: 'string'
        }
      }
    },
    needBody: true,
    method: 'PUT'
  });

  ml.updateFilter = ca({
    urls: [
      {
        fmt: '/_ml/filters/<%=filterId%>/_update',
        req: {
          filterId: {
            type: 'string'
          }
        }
      }
    ],
    needBody: true,
    method: 'POST'
  });

  ml.deleteFilter = ca({
    url: {
      fmt: '/_ml/filters/<%=filterId%>',
      req: {
        filterId: {
          type: 'string'
        }
      }
    },
    method: 'DELETE'
  });

  ml.info = ca({
    url: {
      fmt: '/_ml/info'
    },
    method: 'GET'
  });

  ml.fileStructure = ca({
    urls: [
      {
        // eslint-disable-next-line max-len
        fmt: '/_ml/find_file_structure?&charset=<%=charset%>&format=<%=format%>&has_header_row=<%=has_header_row%>&column_names=<%=column_names%>&delimiter=<%=delimiter%>&quote=<%=quote%>&should_trim_fields=<%=should_trim_fields%>&grok_pattern=<%=grok_pattern%>&timestamp_field=<%=timestamp_field%>&timestamp_format=<%=timestamp_format%>&lines_to_sample=<%=lines_to_sample%>',
        req: {
          charset: {
            type: 'string'
          },
          format: {
            type: 'string'
          },
          has_header_row: {
            type: 'string'
          },
          column_names: {
            type: 'string'
          },
          delimiter: {
            type: 'string'
          },
          quote: {
            type: 'string'
          },
          should_trim_fields: {
            type: 'string'
          },
          grok_pattern: {
            type: 'string'
          },
          timestamp_field: {
            type: 'string'
          },
          timestamp_format: {
            type: 'string'
          },
          lines_to_sample: {
            type: 'string'
          },
        }
      },
      {
        fmt: '/_ml/find_file_structure'
      }
    ],
    needBody: true,
    method: 'POST'
  });

};
