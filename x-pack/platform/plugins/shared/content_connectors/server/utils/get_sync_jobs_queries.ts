/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';

import { ConnectorStatus, CRAWLER_SERVICE_TYPE, SyncStatus } from '@kbn/search-connectors';

export const getOrphanedJobsCountQuery = (ids: string[], isCrawler?: boolean) => {
  if (isCrawler === undefined) {
    return {
      bool: {
        must_not: [
          {
            terms: {
              'connector.id': ids,
            },
          },
        ],
      },
    };
  }

  if (isCrawler) {
    return {
      bool: {
        must: [
          {
            term: {
              'connector.service_type': CRAWLER_SERVICE_TYPE,
            },
          },
        ],
        must_not: [
          {
            terms: {
              'connector.id': ids,
            },
          },
        ],
      },
    };
  }

  return {
    bool: {
      must_not: [
        {
          terms: {
            'connector.id': ids,
          },
        },
        {
          term: {
            'connector.service_type': CRAWLER_SERVICE_TYPE,
          },
        },
      ],
    },
  };
};

export const getInProgressJobsCountQuery = (isCrawler?: boolean) => {
  if (isCrawler === undefined) {
    return {
      bool: {
        must: [
          {
            term: {
              status: SyncStatus.IN_PROGRESS,
            },
          },
        ],
      },
    };
  }

  if (isCrawler) {
    return {
      bool: {
        must: [
          {
            term: {
              status: SyncStatus.IN_PROGRESS,
            },
          },
        ],
        filter: [
          {
            bool: {
              must: {
                term: {
                  'connector.service_type': CRAWLER_SERVICE_TYPE,
                },
              },
            },
          },
        ],
      },
    };
  }
  return {
    bool: {
      must: [
        {
          term: {
            status: SyncStatus.IN_PROGRESS,
          },
        },
      ],
      filter: [
        {
          bool: {
            must_not: {
              term: {
                'connector.service_type': CRAWLER_SERVICE_TYPE,
              },
            },
          },
        },
      ],
    },
  };
};

export const getIdleJobsCountQuery = () => {
  return {
    bool: {
      filter: [
        {
          term: {
            status: SyncStatus.IN_PROGRESS,
          },
        },
        {
          bool: {
            must_not: {
              term: {
                'connector.service_type': CRAWLER_SERVICE_TYPE,
              },
            },
          },
        },
        {
          range: {
            last_seen: {
              lt: moment().subtract(5, 'minute').toISOString(),
            },
          },
        },
      ],
    },
  };
};

export const getErrorCountQuery = (isCrawler?: boolean) => {
  if (isCrawler === undefined) {
    return {
      bool: {
        must: [
          {
            term: {
              last_sync_status: SyncStatus.ERROR,
            },
          },
        ],
      },
    };
  }

  if (isCrawler) {
    return {
      bool: {
        must: [
          {
            term: {
              last_sync_status: SyncStatus.ERROR,
            },
          },
        ],
        filter: [
          {
            term: {
              service_type: CRAWLER_SERVICE_TYPE,
            },
          },
        ],
      },
    };
  }

  return {
    bool: {
      must: [
        {
          term: {
            last_sync_status: SyncStatus.ERROR,
          },
        },
      ],
      filter: [
        {
          bool: {
            must_not: {
              term: {
                service_type: CRAWLER_SERVICE_TYPE,
              },
            },
          },
        },
      ],
    },
  };
};

export const getConnectedCountQuery = (isCrawler?: boolean) => {
  if (isCrawler === undefined) {
    return {
      bool: {
        filter: [
          {
            term: {
              status: ConnectorStatus.CONNECTED,
            },
          },
          {
            range: {
              last_seen: {
                gte: moment().subtract(30, 'minutes').toISOString(),
              },
            },
          },
        ],
      },
    };
  }
  if (isCrawler) {
    return {
      bool: {
        filter: [
          {
            term: {
              status: ConnectorStatus.CONNECTED,
            },
          },
          {
            term: {
              service_type: CRAWLER_SERVICE_TYPE,
            },
          },
        ],
      },
    };
  }
  return {
    bool: {
      filter: [
        {
          term: {
            status: ConnectorStatus.CONNECTED,
          },
        },
        {
          bool: {
            must_not: {
              term: {
                service_type: CRAWLER_SERVICE_TYPE,
              },
            },
          },
        },
        {
          range: {
            last_seen: {
              gte: moment().subtract(30, 'minutes').toISOString(),
            },
          },
        },
      ],
    },
  };
};

export const getIncompleteCountQuery = (isCrawler?: boolean) => {
  if (isCrawler === undefined) {
    return {
      bool: {
        should: [
          {
            bool: {
              must_not: {
                terms: {
                  status: [ConnectorStatus.CONNECTED, ConnectorStatus.ERROR],
                },
              },
            },
          },
          {
            range: {
              last_seen: {
                lt: moment().subtract(30, 'minutes').toISOString(),
              },
            },
          },
        ],
      },
    };
  }
  if (isCrawler) {
    return {
      bool: {
        must_not: [
          {
            terms: {
              status: [ConnectorStatus.CONNECTED, ConnectorStatus.ERROR],
            },
          },
        ],
        filter: [
          {
            term: {
              service_type: CRAWLER_SERVICE_TYPE,
            },
          },
        ],
      },
    };
  }
  return {
    bool: {
      must_not: {
        terms: {
          status: [ConnectorStatus.CONNECTED, ConnectorStatus.ERROR],
        },
      },
      must: {
        range: {
          last_seen: {
            lt: moment().subtract(30, 'minutes').toISOString(),
          },
        },
      },
      filter: [
        {
          bool: {
            must_not: {
              term: {
                service_type: CRAWLER_SERVICE_TYPE,
              },
            },
          },
        },
      ],
    },
  };
};
