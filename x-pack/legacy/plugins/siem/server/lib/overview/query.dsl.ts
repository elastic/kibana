/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { createQueryFilterClauses } from '../../utils/build_query';
import { RequestBasicOptions } from '../framework';

export const buildOverviewNetworkQuery = ({
  filterQuery,
  timerange: { from, to },
  defaultIndex,
  sourceConfiguration: {
    fields: { timestamp },
  },
}: RequestBasicOptions) => {
  const filter = [
    ...createQueryFilterClauses(filterQuery),
    {
      range: {
        [timestamp]: {
          gte: from,
          lte: to,
        },
      },
    },
  ];

  const dslQuery = {
    allowNoIndices: true,
    index: defaultIndex,
    ignoreUnavailable: true,
    body: {
      aggregations: {
        unique_flow_count: {
          filter: {
            term: { type: 'flow' },
          },
        },
        unique_dns_count: {
          filter: {
            term: { type: 'dns' },
          },
        },
        unique_suricata_count: {
          filter: {
            term: { 'service.type': 'suricata' },
          },
        },
        unique_zeek_count: {
          filter: {
            term: { 'service.type': 'zeek' },
          },
        },
        unique_socket_count: {
          filter: {
            term: { 'event.dataset': 'socket' },
          },
        },
        unique_filebeat_count: {
          filter: {
            term: { 'agent.type': 'filebeat' },
          },
          aggs: {
            unique_netflow_count: {
              filter: {
                term: { 'input.type': 'netflow' },
              },
            },
            unique_panw_count: {
              filter: {
                term: { 'event.module': 'panw' },
              },
            },
            unique_cisco_count: {
              filter: {
                term: { 'event.module': 'cisco' },
              },
            },
          },
        },
        unique_packetbeat_count: {
          filter: {
            term: { 'agent.type': 'packetbeat' },
          },
          aggs: {
            unique_tls_count: {
              filter: {
                term: { 'network.protocol': 'tls' },
              },
            },
          },
        },
      },
      query: {
        bool: {
          filter,
        },
      },
      size: 0,
      track_total_hits: false,
    },
  };

  return dslQuery;
};

export const buildOverviewHostQuery = ({
  filterQuery,
  timerange: { from, to },
  defaultIndex,
  sourceConfiguration: {
    fields: { timestamp },
  },
}: RequestBasicOptions) => {
  const filter = [
    ...createQueryFilterClauses(filterQuery),
    {
      range: {
        [timestamp]: {
          gte: from,
          lte: to,
        },
      },
    },
  ];

  const dslQuery = {
    allowNoIndices: true,
    index: defaultIndex,
    ignoreUnavailable: true,
    body: {
      aggregations: {
        auditd_count: {
          filter: {
            term: {
              'event.module': 'auditd',
            },
          },
        },
        endgame_module: {
          filter: {
            term: {
              'event.module': 'endgame',
            },
          },
          aggs: {
            dns_event_count: {
              filter: {
                term: {
                  'endgame.event_type_full': 'dns_event',
                },
              },
            },
            file_event_count: {
              filter: {
                term: {
                  'endgame.event_type_full': 'file_event',
                },
              },
            },
            image_load_event_count: {
              filter: {
                term: {
                  'endgame.event_type_full': 'image_load_event',
                },
              },
            },
            network_event_count: {
              filter: {
                term: {
                  'endgame.event_type_full': 'network_event',
                },
              },
            },
            process_event_count: {
              filter: {
                term: {
                  'endgame.event_type_full': 'process_event',
                },
              },
            },
            registry_event: {
              filter: {
                term: {
                  'endgame.event_type_full': 'registry_event',
                },
              },
            },
            security_event_count: {
              filter: {
                term: {
                  'endgame.event_type_full': 'security_event',
                },
              },
            },
          },
        },
        fim_count: {
          filter: {
            term: {
              'event.module': 'file_integrity',
            },
          },
        },
        winlog_module: {
          filter: {
            term: {
              'agent.type': 'winlogbeat',
            },
          },
          aggs: {
            mwsysmon_operational_event_count: {
              filter: {
                term: {
                  'winlog.channel': 'Microsoft-Windows-Sysmon/Operational',
                },
              },
            },
            security_event_count: {
              filter: {
                term: {
                  'winlog.channel': 'Security',
                },
              },
            },
          },
        },
        system_module: {
          filter: {
            term: {
              'event.module': 'system',
            },
          },
          aggs: {
            login_count: {
              filter: {
                term: {
                  'event.dataset': 'login',
                },
              },
            },
            package_count: {
              filter: {
                term: {
                  'event.dataset': 'package',
                },
              },
            },
            process_count: {
              filter: {
                term: {
                  'event.dataset': 'process',
                },
              },
            },
            user_count: {
              filter: {
                term: {
                  'event.dataset': 'user',
                },
              },
            },
            filebeat_count: {
              filter: {
                term: {
                  'agent.type': 'filebeat',
                },
              },
            },
          },
        },
      },
      query: {
        bool: {
          filter,
        },
      },
      size: 0,
      track_total_hits: false,
    },
  };

  return dslQuery;
};
