/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const reportingUsageMapping = {
  PNG: {
    available: {
      type: 'boolean',
    },
    total: {
      type: 'long',
    },
  },
  _all: {
    type: 'long',
  },
  available: {
    type: 'boolean',
  },
  browser_type: {
    type: 'keyword',
  },
  csv: {
    available: {
      type: 'boolean',
    },
    total: {
      type: 'long',
    },
  },
  enabled: {
    type: 'boolean',
  },
  last7Days: {
    PNG: {
      available: {
        type: 'boolean',
      },
      total: {
        type: 'long',
      },
    },
    _all: {
      type: 'long',
    },
    csv: {
      available: {
        type: 'boolean',
      },
      total: {
        type: 'long',
      },
    },
    printable_pdf: {
      app: {
        'canvas workpad': {
          type: 'long',
        },
        dashboard: {
          type: 'long',
        },
        visualization: {
          type: 'long',
        },
      },
      available: {
        type: 'boolean',
      },
      layout: {
        preserve_layout: {
          type: 'long',
        },
        print: {
          type: 'long',
        },
      },
      total: {
        type: 'long',
      },
    },
    status: {
      cancelled: {
        type: 'long',
      },
      completed: {
        type: 'long',
      },
      completed_with_warnings: {
        type: 'long',
      },
      failed: {
        type: 'long',
      },
      pending: {
        type: 'long',
      },
      processing: {
        type: 'long',
      },
    },
    statuses: {
      cancelled: {
        PNG: {
          'canvas workpad': {
            type: 'long',
          },
          dashboard: {
            type: 'long',
          },
          visualization: {
            type: 'long',
          },
        },
        printable_pdf: {
          'canvas workpad': {
            type: 'long',
          },
          dashboard: {
            type: 'long',
          },
          visualization: {
            type: 'long',
          },
        },
      },
      completed: {
        PNG: {
          'canvas workpad': {
            type: 'long',
          },
          dashboard: {
            type: 'long',
          },
          visualization: {
            type: 'long',
          },
        },
        printable_pdf: {
          'canvas workpad': {
            type: 'long',
          },
          dashboard: {
            type: 'long',
          },
          visualization: {
            type: 'long',
          },
        },
      },
      failed: {
        PNG: {
          'canvas workpad': {
            type: 'long',
          },
          dashboard: {
            type: 'long',
          },
          visualization: {
            type: 'long',
          },
        },
        printable_pdf: {
          'canvas workpad': {
            type: 'long',
          },
          dashboard: {
            type: 'long',
          },
          visualization: {
            type: 'long',
          },
        },
      },
      pending: {
        PNG: {
          'canvas workpad': {
            type: 'long',
          },
          dashboard: {
            type: 'long',
          },
          visualization: {
            type: 'long',
          },
        },
        printable_pdf: {
          'canvas workpad': {
            type: 'long',
          },
          dashboard: {
            type: 'long',
          },
          visualization: {
            type: 'long',
          },
        },
      },
      processing: {
        PNG: {
          'canvas workpad': {
            type: 'long',
          },
          dashboard: {
            type: 'long',
          },
          visualization: {
            type: 'long',
          },
        },
        printable_pdf: {
          'canvas workpad': {
            type: 'long',
          },
          dashboard: {
            type: 'long',
          },
          visualization: {
            type: 'long',
          },
        },
      },
    },
  },
  printable_pdf: {
    app: {
      'canvas workpad': {
        type: 'long',
      },
      dashboard: {
        type: 'long',
      },
      visualization: {
        type: 'long',
      },
    },
    available: {
      type: 'boolean',
    },
    layout: {
      preserve_layout: {
        type: 'long',
      },
      print: {
        type: 'long',
      },
    },
    total: {
      type: 'long',
    },
  },
  status: {
    completed: {
      type: 'long',
    },
    failed: {
      type: 'long',
    },
    pending: {
      type: 'long',
    },
    processing: {
      type: 'long',
    },
  },
  statuses: {
    cancelled: {
      PNG: {
        'canvas workpad': {
          type: 'long',
        },
        dashboard: {
          type: 'long',
        },
        visualization: {
          type: 'long',
        },
      },
      printable_pdf: {
        'canvas workpad': {
          type: 'long',
        },
        dashboard: {
          type: 'long',
        },
        visualization: {
          type: 'long',
        },
      },
    },
    completed: {
      PNG: {
        'canvas workpad': {
          type: 'long',
        },
        dashboard: {
          type: 'long',
        },
        visualization: {
          type: 'long',
        },
      },
      printable_pdf: {
        'canvas workpad': {
          type: 'long',
        },
        dashboard: {
          type: 'long',
        },
        visualization: {
          type: 'long',
        },
      },
    },
    failed: {
      PNG: {
        'canvas workpad': {
          type: 'long',
        },
        dashboard: {
          type: 'long',
        },
        visualization: {
          type: 'long',
        },
      },
      printable_pdf: {
        'canvas workpad': {
          type: 'long',
        },
        dashboard: {
          type: 'long',
        },
        visualization: {
          type: 'long',
        },
      },
    },
    pending: {
      PNG: {
        'canvas workpad': {
          type: 'long',
        },
        dashboard: {
          type: 'long',
        },
        visualization: {
          type: 'long',
        },
      },
      printable_pdf: {
        'canvas workpad': {
          type: 'long',
        },
        dashboard: {
          type: 'long',
        },
        visualization: {
          type: 'long',
        },
      },
    },
    processing: {
      PNG: {
        'canvas workpad': {
          type: 'long',
        },
        dashboard: {
          type: 'long',
        },
        visualization: {
          type: 'long',
        },
      },
      printable_pdf: {
        'canvas workpad': {
          type: 'long',
        },
        dashboard: {
          type: 'long',
        },
        visualization: {
          type: 'long',
        },
      },
    },
  },
};
