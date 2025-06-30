/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { formatMatchFailure } from '../format_match_failure';
import { findGrokMatchFailure } from './find_grok_match_failure';

describe('findGrokMatchFailure', () => {
  it.each([
    {
      pattern:
        '%{IP:ip_address} %{WORD:process_name}[%{NUMBER:process_id}]: %{GREEDYDATA:log_message}',
      message: 'ACPI: Subsystem revision 20040816',
      error: {
        message: 'Could only partially match pattern',
        remaining: 'ACPI: Subsystem revision 20040816',
        matched: {},
        unmatched: [
          '%{IP:ip_address}',
          ' ',
          '%{WORD:process_name}',
          '[',
          '%{NUMBER:process_id}',
          ']: ',
          '%{GREEDYDATA:log_message}',
        ],
      },
    },
    {
      pattern:
        '^- %{NUMBER:unix_timestamp} %{YEAR:year}\\.%{MONTHNUM:month}\\.%{MONTHDAY:day} %{HOSTNAME:hostname} %{MONTH:month_name} %{MONTHDAY:month_day} %{TIME:time} %{USER:user}@%{HOSTNAME:host} %{DATA:process}\\[%{NUMBER:pid}\\]: %{GREEDYDATA:message_details}',
      message:
        '- 1748256063 2005.11.09 tbird-admin1 Nov 9 12:10:43 local@tbird-admin1 ACPI: LAPIC (acpi_id[0x03] lapic_id[0x01] enabled)',
      error: {
        message: 'Could only partially match pattern',
        remaining: '0x03] lapic_id[0x01] enabled)',
        matched: {
          ' ': ' ',
          '%{DATA:process}': 'ACPI: LAPIC (acpi_id',
          '%{HOSTNAME:hostname}': 'tbird-admin1',
          '%{HOSTNAME:host}': 'tbird-admin1',
          '%{MONTH:month_name}': 'Nov',
          '%{MONTHDAY:day}': '09',
          '%{MONTHDAY:month_day}': '9',
          '%{MONTHNUM:month}': '11',
          '%{NUMBER:unix_timestamp}': '1748256063',
          '%{TIME:time}': '12:10:43',
          '%{USER:user}': 'local',
          '%{YEAR:year}': '2005',
          '@': '@',
          '\\.': '.',
          '\\[': '[',
          '^- ': '- ',
        },
        unmatched: ['%{NUMBER:pid}', '\\]: ', '%{GREEDYDATA:message_details}'],
      },
    },
    {
      pattern:
        '^-%{NUMBER:unix_timestamp} %{YEAR:year}\\.%{MONTHNUM:month}\\.%{MONTHDAY:day} %{HOSTNAME:hostname} %{MONTH:month_name} %{MONTHDAY:day} %{TIME:time} %{USER:user}@%{HOSTNAME:host} %{DATA:process}\\[%{NUMBER:pid}\\]: %{GREEDYDATA:message_details}',
      message:
        '- 1748260387 2005.11.09 tbird-admin1 Nov 9 12:05:29 local@tbird-admin1 /apps/x86_64/system/ganglia-3.0.1/sbin/gmetad[1682]: data_thread() got not answer from any [Thunderbird_B2] datasource',
      error: {
        message: 'Could only partially match pattern',
        remaining:
          ' 1748260387 2005.11.09 tbird-admin1 Nov 9 12:05:29 local@tbird-admin1 /apps/x86_64/system/ganglia-3.0.1/sbin/gmetad[1682]: data_thread() got not answer from any [Thunderbird_B2] datasource',
        matched: {
          '^-': '-',
        },
        unmatched: [
          '%{NUMBER:unix_timestamp}',
          ' ',
          '%{YEAR:year}',
          '\\.',
          '%{MONTHNUM:month}',
          '\\.',
          '%{MONTHDAY:day}',
          ' ',
          '%{HOSTNAME:hostname}',
          ' ',
          '%{MONTH:month_name}',
          ' ',
          '%{MONTHDAY:day}',
          ' ',
          '%{TIME:time}',
          ' ',
          '%{USER:user}',
          '@',
          '%{HOSTNAME:host}',
          ' ',
          '%{DATA:process}',
          '\\[',
          '%{NUMBER:pid}',
          '\\]: ',
          '%{GREEDYDATA:message_details}',
        ],
      },
    },
    {
      pattern:
        '^-\\s%{NUMBER:timestamp} %{YEAR:year}\\.%{MONTHNUM:month}\\.%{MONTHDAY:day} %{HOSTNAME:hostname} %{MONTH:month_name} %{MONTHDAY:day_num} %{TIME:time} %{USER:user}@%{HOSTNAME:host} %{DATA:process}\\[%{NUMBER:pid}\\]: %{GREEDYDATA:message_details}',
      message:
        '- 1748259134 2005.11.09 #8# Nov 9 12:01:02 #8#/#8# crond[23474]: (root) CMD (run-parts /etc/cron.hourly)',
      error: {
        message: 'Could only partially match pattern',
        remaining:
          '#8# Nov 9 12:01:02 #8#/#8# crond[23474]: (root) CMD (run-parts /etc/cron.hourly)',
        matched: {
          ' ': ' ',
          '%{MONTHDAY:day}': '09',
          '%{MONTHNUM:month}': '11',
          '%{NUMBER:timestamp}': '1748259134',
          '%{YEAR:year}': '2005',
          '\\.': '.',
          '^-\\s': '- ',
        },
        unmatched: [
          '%{HOSTNAME:hostname}',
          ' ',
          '%{MONTH:month_name}',
          ' ',
          '%{MONTHDAY:day_num}',
          ' ',
          '%{TIME:time}',
          ' ',
          '%{USER:user}',
          '@',
          '%{HOSTNAME:host}',
          ' ',
          '%{DATA:process}',
          '\\[',
          '%{NUMBER:pid}',
          '\\]: ',
          '%{GREEDYDATA:message_details}',
        ],
      },
    },
    {
      pattern:
        '%{DATA:log_file} %{TIMESTAMP_ISO8601:timestamp} %{INT:process_id} %{LOGLEVEL:log_level} %{DATA:module} \\[%{DATA:request_id} %{DATA:user_id} %{DATA:project_id} - - -\\] %{GREEDYDATA:message_details}',
      message:
        'nova-api.log.1.2017-05-16_13:53:08 2025-05-27 09:30:10.623 25788 INFO nova.metadata.wsgi.server [-] 10.11.21.139,10.11.10.1 "GET /openstack/2013-10-17 HTTP/1.1" status: 200 len: 157 time: 0.0006461',
      error: {
        message: 'Could only partially match pattern',
        remaining: '"GET /openstack/2013-10-17 HTTP/1.1" status: 200 len: 157 time: 0.0006461',
        matched: {
          ' ': ' ',
          ' \\[': ' [',
          '%{DATA:log_file}': 'nova-api.log.1.2017-05-16_13:53:08',
          '%{DATA:module}': 'nova.metadata.wsgi.server',
          '%{DATA:request_id}': '-]',
          '%{DATA:user_id}': '10.11.21.139,10.11.10.1',
          '%{INT:process_id}': '25788',
          '%{LOGLEVEL:log_level}': 'INFO',
          '%{TIMESTAMP_ISO8601:timestamp}': '2025-05-27 09:30:10.623',
        },
        unmatched: ['%{DATA:project_id}', ' - - -\\] ', '%{GREEDYDATA:message_details}'],
      },
    },
    {
      pattern:
        '%{YEAR}-%{MONTHNUM}-%{MONTHDAY} %{HOUR}:%{MINUTE}:%{SECOND},%{NONNEGINT:timestamp} - %{LOGLEVEL:log_level} \\[%{GREEDYDATA:thread_info}\\] - %{GREEDYDATA:message_details}',
      message:
        '2025-05-27 11:22:33,614 - WARN  [SendWorker:188978561024:QuorumCnxManager$SendWorker@679] - Interrupted while waiting for message on queue',
      error: {
        matched: {
          ' ': ' ',
          ' - ': ' - ',
          '%{HOUR}': '11',
          '%{MINUTE}': '22',
          '%{MONTHDAY}': '27',
          '%{MONTHNUM}': '05',
          '%{NONNEGINT:timestamp}': '614',
          '%{SECOND}': '33',
          '%{YEAR}': '2025',
          ',': ',',
          '-': '-',
          ':': ':',
        },
        message: 'Could only partially match pattern',
        remaining:
          'WARN  [SendWorker:188978561024:QuorumCnxManager$SendWorker@679] - Interrupted while waiting for message on queue',
        unmatched: [
          '%{LOGLEVEL:log_level}',
          ' \\[',
          '%{GREEDYDATA:thread_info}',
          '\\] - ',
          '%{GREEDYDATA:message_details}',
        ],
      },
    },
  ])('%s', ({ pattern, message, error }) => {
    const failure = findGrokMatchFailure(pattern, message);

    if (failure) {
      expect(formatMatchFailure(failure)).toEqual(error);
    } else {
      expect(error).not.toBeDefined();
    }
  });
});
