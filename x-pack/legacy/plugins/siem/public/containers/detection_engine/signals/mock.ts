/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SignalSearchResponse, SignalsIndex, Privilege } from './types';

export const signalsMock: SignalSearchResponse<unknown, unknown> = {
  took: 7,
  timed_out: false,
  _shards: {
    total: 1,
    successful: 1,
    skipped: 0,
    failed: 0,
  },
  hits: {
    total: {
      value: 10000,
      relation: 'gte',
    },
    max_score: 0,
    hits: [
      {
        _index: '.siem-signals-default-000001',
        _id: '820e05ab0a10a2110d6f0ab2e1864402724a88680d5b49840ecc17dd069d7646',
        _score: 0,
        _source: {
          '@timestamp': '2020-02-15T00:15:19.231Z',
          event: {
            kind: 'signal',
            code: 4625,
            created: '2020-02-15T00:09:19.454Z',
            module: 'security',
            type: 'authentication_failure',
            outcome: 'failure',
            provider: 'Microsoft-Windows-Security-Auditing',
            action: 'logon-failed',
            category: 'authentication',
          },
          winlog: {
            record_id: 4864460,
            task: 'Logon',
            logon: {
              failure: {
                reason: 'Unknown user name or bad password.',
                status: 'This is either due to a bad username or authentication information',
                sub_status: 'User logon with misspelled or bad user account',
              },
              type: 'Network',
            },
            channel: 'Security',
            event_id: 4625,
            process: {
              pid: 548,
              thread: {
                id: 292,
              },
            },
            api: 'wineventlog',
            opcode: 'Info',
            computer_name: 'siem-windows',
            keywords: ['Audit Failure'],
            activity_id: '{96816605-032c-0000-eaad-4c5f58e1d501}',
            provider_guid: '{54849625-5478-4994-a5ba-3e3b0328c30d}',
            event_data: {
              Status: '0xc000006d',
              LmPackageName: '-',
              SubjectUserSid: 'S-1-0-0',
              SubjectLogonId: '0x0',
              TransmittedServices: '-',
              SubjectDomainName: '-',
              LogonProcessName: 'NtLmSsp ',
              AuthenticationPackageName: 'NTLM',
              KeyLength: '0',
              SubjectUserName: '-',
              TargetUserSid: 'S-1-0-0',
              FailureReason: '%%2313',
              SubStatus: '0xc0000064',
              LogonType: '3',
              TargetUserName: 'ADMIN',
            },
            provider_name: 'Microsoft-Windows-Security-Auditing',
          },
          process: {
            pid: 0,
            executable: '-',
            name: '-',
          },
          agent: {
            type: 'winlogbeat',
            ephemeral_id: 'cbee8ae0-2c75-4999-ba16-71d482247f52',
            hostname: 'siem-windows',
            id: '19b2de73-7b9a-4e92-b3e7-82383ac5f389',
            version: '7.5.1',
          },
          cloud: {
            availability_zone: 'us-east1-b',
            project: {
              id: 'elastic-beats',
            },
            provider: 'gcp',
            instance: {
              id: '3849238371046563697',
              name: 'siem-windows',
            },
            machine: {
              type: 'g1-small',
            },
          },
          log: {
            level: 'information',
          },
          message:
            'An account failed to log on.\n\nSubject:\n\tSecurity ID:\t\tS-1-0-0\n\tAccount Name:\t\t-\n\tAccount Domain:\t\t-\n\tLogon ID:\t\t0x0\n\nLogon Type:\t\t\t3\n\nAccount For Which Logon Failed:\n\tSecurity ID:\t\tS-1-0-0\n\tAccount Name:\t\tADMIN\n\tAccount Domain:\t\t\n\nFailure Information:\n\tFailure Reason:\t\tUnknown user name or bad password.\n\tStatus:\t\t\t0xC000006D\n\tSub Status:\t\t0xC0000064\n\nProcess Information:\n\tCaller Process ID:\t0x0\n\tCaller Process Name:\t-\n\nNetwork Information:\n\tWorkstation Name:\t-\n\tSource Network Address:\t185.209.0.96\n\tSource Port:\t\t0\n\nDetailed Authentication Information:\n\tLogon Process:\t\tNtLmSsp \n\tAuthentication Package:\tNTLM\n\tTransited Services:\t-\n\tPackage Name (NTLM only):\t-\n\tKey Length:\t\t0\n\nThis event is generated when a logon request fails. It is generated on the computer where access was attempted.\n\nThe Subject fields indicate the account on the local system which requested the logon. This is most commonly a service such as the Server service, or a local process such as Winlogon.exe or Services.exe.\n\nThe Logon Type field indicates the kind of logon that was requested. The most common types are 2 (interactive) and 3 (network).\n\nThe Process Information fields indicate which account and process on the system requested the logon.\n\nThe Network Information fields indicate where a remote logon request originated. Workstation name is not always available and may be left blank in some cases.\n\nThe authentication information fields provide detailed information about this specific logon request.\n\t- Transited services indicate which intermediate services have participated in this logon request.\n\t- Package name indicates which sub-protocol was used among the NTLM protocols.\n\t- Key length indicates the length of the generated session key. This will be 0 if no session key was requested.',
          user: {
            name: 'ADMIN',
            id: 'S-1-0-0',
          },
          source: {
            ip: '185.209.0.96',
            port: 0,
            domain: '-',
          },
          ecs: {
            version: '1.1.0',
          },
          host: {
            name: 'siem-windows',
            os: {
              name: 'Windows Server 2019 Datacenter',
              kernel: '10.0.17763.1039 (WinBuild.160101.0800)',
              build: '17763.1039',
              platform: 'windows',
              version: '10.0',
              family: 'windows',
            },
            id: 'ae32054e-0d4a-4c4d-88ec-b840f992e1c2',
            hostname: 'siem-windows',
            architecture: 'x86_64',
          },
          signal: {
            parent: {
              rule: '2df3a613-f5a8-4b55-bf6a-487fc820b842',
              id: 'AdctRnABMQha2n6boR1M',
              type: 'event',
              index: 'winlogbeat-7.5.1-2020.01.15-000001',
              depth: 1,
            },
            ancestors: [
              {
                rule: '2df3a613-f5a8-4b55-bf6a-487fc820b842',
                id: 'AdctRnABMQha2n6boR1M',
                type: 'event',
                index: 'winlogbeat-7.5.1-2020.01.15-000001',
                depth: 1,
              },
            ],
            original_time: '2020-02-15T00:09:18.714Z',
            status: 'open',
            rule: {
              id: '2df3a613-f5a8-4b55-bf6a-487fc820b842',
              rule_id: '82b2b065-a2ee-49fc-9d6d-781a75c3d280',
              false_positives: [],
              meta: {
                from: '1m',
              },
              max_signals: 100,
              risk_score: 79,
              output_index: '.siem-signals-default',
              description: 'matches most events',
              from: 'now-360s',
              immutable: false,
              index: [
                'apm-*-transaction*',
                'auditbeat-*',
                'endgame-*',
                'filebeat-*',
                'packetbeat-*',
                'winlogbeat-*',
              ],
              interval: '5m',
              language: 'kuery',
              name: 'matches host.name exists',
              query: 'host.name : *',
              references: ['https://google.com'],
              severity: 'high',
              tags: [
                'host.name exists',
                'for testing',
                '__internal_rule_id:82b2b065-a2ee-49fc-9d6d-781a75c3d280',
                '__internal_immutable:false',
              ],
              type: 'query',
              to: 'now',
              enabled: true,
              filters: [],
              created_by: 'elastic',
              updated_by: 'elastic',
              threat: [
                {
                  framework: 'MITRE ATT&CK',
                  technique: [
                    {
                      reference: 'https://attack.mitre.org/techniques/T1110',
                      name: 'Brute Force',
                      id: 'T1110',
                    },
                    {
                      reference: 'https://attack.mitre.org/techniques/T1098',
                      name: 'Account Manipulation',
                      id: 'T1098',
                    },
                    {
                      reference: 'https://attack.mitre.org/techniques/T1081',
                      name: 'Credentials in Files',
                      id: 'T1081',
                    },
                  ],
                  tactic: {
                    reference: 'https://attack.mitre.org/tactics/TA0006',
                    name: 'Credential Access',
                    id: 'TA0006',
                  },
                },
                {
                  framework: 'MITRE ATT&CK',
                  technique: [
                    {
                      reference: 'https://attack.mitre.org/techniques/T1530',
                      name: 'Data from Cloud Storage Object',
                      id: 'T1530',
                    },
                  ],
                  tactic: {
                    reference: 'https://attack.mitre.org/tactics/TA0009',
                    name: 'Collection',
                    id: 'TA0009',
                  },
                },
              ],
              version: 1,
              created_at: '2020-02-12T19:49:29.417Z',
              updated_at: '2020-02-14T23:15:06.186Z',
            },
            original_event: {
              kind: 'event',
              code: 4625,
              created: '2020-02-15T00:09:19.454Z',
              module: 'security',
              type: 'authentication_failure',
              outcome: 'failure',
              provider: 'Microsoft-Windows-Security-Auditing',
              action: 'logon-failed',
              category: 'authentication',
            },
          },
        },
      },
      {
        _index: '.siem-signals-default-000001',
        _id: 'f461e2132bdf3926ef1fe10c83e671707ff3f12348ce600b8490c97a0c704086',
        _score: 0,
        _source: {
          '@timestamp': '2020-02-15T00:15:19.231Z',
          source: {
            ip: '10.142.0.7',
            port: 42774,
            packets: 2,
            bytes: 80,
          },
          server: {
            bytes: 10661,
            ip: '169.254.169.254',
            port: 80,
            packets: 3,
          },
          service: {
            type: 'system',
          },
          system: {
            audit: {
              socket: {
                egid: 0,
                kernel_sock_address: '0xffff8dd0103d2000',
                uid: 0,
                gid: 0,
                euid: 0,
              },
            },
          },
          destination: {
            bytes: 10661,
            ip: '169.254.169.254',
            port: 80,
            packets: 3,
          },
          host: {
            architecture: 'x86_64',
            os: {
              name: 'Debian GNU/Linux',
              kernel: '4.9.0-8-amd64',
              codename: 'stretch',
              platform: 'debian',
              version: '9 (stretch)',
              family: 'debian',
            },
            id: 'aa7ca589f1b8220002f2fc61c64cfbf1',
            containerized: false,
            hostname: 'siem-kibana',
            name: 'siem-kibana',
          },
          agent: {
            type: 'auditbeat',
            ephemeral_id: '60adc2c2-ab48-4e5c-b557-e73549400a79',
            hostname: 'siem-kibana',
            id: '03ccb0ce-f65c-4279-a619-05f1d5bb000b',
            version: '7.5.0',
          },
          client: {
            ip: '10.142.0.7',
            port: 42774,
            packets: 2,
            bytes: 80,
          },
          cloud: {
            machine: {
              type: 'n1-standard-2',
            },
            availability_zone: 'us-east1-b',
            instance: {
              name: 'siem-kibana',
              id: '5412578377715150143',
            },
            project: {
              id: 'elastic-beats',
            },
            provider: 'gcp',
          },
          network: {
            type: 'ipv4',
            transport: 'tcp',
            packets: 5,
            bytes: 10741,
            community_id: '1:qTY0+fxFYZvNHSUM4xTnCKjq8hM=',
            direction: 'outbound',
          },
          group: {
            name: 'root',
            id: '0',
          },
          tags: ['7.5.0-bc2'],
          ecs: {
            version: '1.1.0',
          },
          user: {
            id: '0',
            name: 'root',
          },
          event: {
            dataset: 'socket',
            kind: 'signal',
            action: 'network_flow',
            category: 'network_traffic',
            start: '2020-02-15T00:09:18.360Z',
            end: '2020-02-15T00:09:18.361Z',
            duration: 746181,
            module: 'system',
          },
          process: {
            pid: 746,
            name: 'google_accounts',
            args: ['/usr/bin/python3', '/usr/bin/google_accounts_daemon'],
            executable: '/usr/bin/python3.5',
            created: '2020-02-14T18:31:08.280Z',
          },
          flow: {
            final: true,
            complete: false,
          },
          signal: {
            parent: {
              rule: '2df3a613-f5a8-4b55-bf6a-487fc820b842',
              id: '59ctRnABMQha2n6bmhzN',
              type: 'event',
              index: 'auditbeat-7.5.0-2020.01.14-000002',
              depth: 1,
            },
            ancestors: [
              {
                rule: '2df3a613-f5a8-4b55-bf6a-487fc820b842',
                id: '59ctRnABMQha2n6bmhzN',
                type: 'event',
                index: 'auditbeat-7.5.0-2020.01.14-000002',
                depth: 1,
              },
            ],
            original_time: '2020-02-15T00:09:18.795Z',
            status: 'open',
            rule: {
              id: '2df3a613-f5a8-4b55-bf6a-487fc820b842',
              rule_id: '82b2b065-a2ee-49fc-9d6d-781a75c3d280',
              false_positives: [],
              meta: {
                from: '1m',
              },
              max_signals: 100,
              risk_score: 79,
              output_index: '.siem-signals-default',
              description: 'matches most events',
              from: 'now-360s',
              immutable: false,
              index: [
                'apm-*-transaction*',
                'auditbeat-*',
                'endgame-*',
                'filebeat-*',
                'packetbeat-*',
                'winlogbeat-*',
              ],
              interval: '5m',
              language: 'kuery',
              name: 'matches host.name exists',
              query: 'host.name : *',
              references: ['https://google.com'],
              severity: 'high',
              tags: [
                'host.name exists',
                'for testing',
                '__internal_rule_id:82b2b065-a2ee-49fc-9d6d-781a75c3d280',
                '__internal_immutable:false',
              ],
              type: 'query',
              to: 'now',
              enabled: true,
              filters: [],
              created_by: 'elastic',
              updated_by: 'elastic',
              threat: [
                {
                  framework: 'MITRE ATT&CK',
                  technique: [
                    {
                      reference: 'https://attack.mitre.org/techniques/T1110',
                      name: 'Brute Force',
                      id: 'T1110',
                    },
                    {
                      reference: 'https://attack.mitre.org/techniques/T1098',
                      name: 'Account Manipulation',
                      id: 'T1098',
                    },
                    {
                      reference: 'https://attack.mitre.org/techniques/T1081',
                      name: 'Credentials in Files',
                      id: 'T1081',
                    },
                  ],
                  tactic: {
                    reference: 'https://attack.mitre.org/tactics/TA0006',
                    name: 'Credential Access',
                    id: 'TA0006',
                  },
                },
                {
                  framework: 'MITRE ATT&CK',
                  technique: [
                    {
                      reference: 'https://attack.mitre.org/techniques/T1530',
                      name: 'Data from Cloud Storage Object',
                      id: 'T1530',
                    },
                  ],
                  tactic: {
                    reference: 'https://attack.mitre.org/tactics/TA0009',
                    name: 'Collection',
                    id: 'TA0009',
                  },
                },
              ],
              version: 1,
              created_at: '2020-02-12T19:49:29.417Z',
              updated_at: '2020-02-14T23:15:06.186Z',
            },
            original_event: {
              dataset: 'socket',
              kind: 'event',
              action: 'network_flow',
              category: 'network_traffic',
              start: '2020-02-15T00:09:18.360Z',
              end: '2020-02-15T00:09:18.361Z',
              duration: 746181,
              module: 'system',
            },
          },
        },
      },
      {
        _index: '.siem-signals-default-000001',
        _id: '428551fed9382740e808f27ea64ce53b4d3b8cc82401d83afd47969339a0f6e3',
        _score: 0,
        _source: {
          '@timestamp': '2020-02-15T00:15:19.231Z',
          service: {
            type: 'system',
          },
          message: 'Process sleep (PID: 317535) by user root STARTED',
          ecs: {
            version: '1.0.0',
          },
          host: {
            name: 'beats-ci-immutable-ubuntu-1604-1581723302100990071',
            hostname: 'beats-ci-immutable-ubuntu-1604-1581723302100990071',
            architecture: 'x86_64',
            os: {
              platform: 'ubuntu',
              version: '16.04.6 LTS (Xenial Xerus)',
              family: 'debian',
              name: 'Ubuntu',
              kernel: '4.15.0-1052-gcp',
              codename: 'xenial',
            },
            id: 'c428794c81ade2eb0633d2bbea7ecf51',
            containerized: false,
          },
          cloud: {
            machine: {
              type: 'n1-highmem-4',
            },
            availability_zone: 'us-central1-b',
            project: {
              id: 'elastic-ci-prod',
            },
            provider: 'gcp',
            instance: {
              id: '5167639562480685129',
              name: 'beats-ci-immutable-ubuntu-1604-1581723302100990071',
            },
          },
          event: {
            kind: 'signal',
            action: 'process_started',
            module: 'system',
            dataset: 'process',
          },
          process: {
            executable: '/bin/sleep',
            start: '2020-02-15T00:09:17.850Z',
            args: ['sleep', '1'],
            working_directory: '/',
            name: 'sleep',
            ppid: 239348,
            pid: 317535,
            hash: {
              sha1: '9dc3644a028d1a4c853924c427f5e7d668c38ef7',
            },
            entity_id: 'vtgDN10edfL0mX5p',
          },
          user: {
            id: '0',
            group: {
              id: '0',
              name: 'root',
            },
            effective: {
              id: '0',
              group: {
                id: '0',
              },
            },
            saved: {
              id: '0',
              group: {
                id: '0',
              },
            },
            name: 'root',
          },
          agent: {
            id: '4ae34f08-4770-4e5b-bd5b-c8b13741eafa',
            version: '7.2.0',
            type: 'auditbeat',
            ephemeral_id: '3b3939af-dc90-4be8-b20b-a3d9f555d379',
            hostname: 'beats-ci-immutable-ubuntu-1604-1581723302100990071',
          },
          signal: {
            parent: {
              rule: '2df3a613-f5a8-4b55-bf6a-487fc820b842',
              id: '7tctRnABMQha2n6bnxxQ',
              type: 'event',
              index: 'auditbeat-7.2.0',
              depth: 1,
            },
            ancestors: [
              {
                rule: '2df3a613-f5a8-4b55-bf6a-487fc820b842',
                id: '7tctRnABMQha2n6bnxxQ',
                type: 'event',
                index: 'auditbeat-7.2.0',
                depth: 1,
              },
            ],
            original_time: '2020-02-15T00:09:18.860Z',
            status: 'open',
            rule: {
              id: '2df3a613-f5a8-4b55-bf6a-487fc820b842',
              rule_id: '82b2b065-a2ee-49fc-9d6d-781a75c3d280',
              false_positives: [],
              meta: {
                from: '1m',
              },
              max_signals: 100,
              risk_score: 79,
              output_index: '.siem-signals-default',
              description: 'matches most events',
              from: 'now-360s',
              immutable: false,
              index: [
                'apm-*-transaction*',
                'auditbeat-*',
                'endgame-*',
                'filebeat-*',
                'packetbeat-*',
                'winlogbeat-*',
              ],
              interval: '5m',
              language: 'kuery',
              name: 'matches host.name exists',
              query: 'host.name : *',
              references: ['https://google.com'],
              severity: 'high',
              tags: [
                'host.name exists',
                'for testing',
                '__internal_rule_id:82b2b065-a2ee-49fc-9d6d-781a75c3d280',
                '__internal_immutable:false',
              ],
              type: 'query',
              to: 'now',
              enabled: true,
              filters: [],
              created_by: 'elastic',
              updated_by: 'elastic',
              threat: [
                {
                  framework: 'MITRE ATT&CK',
                  technique: [
                    {
                      reference: 'https://attack.mitre.org/techniques/T1110',
                      name: 'Brute Force',
                      id: 'T1110',
                    },
                    {
                      reference: 'https://attack.mitre.org/techniques/T1098',
                      name: 'Account Manipulation',
                      id: 'T1098',
                    },
                    {
                      reference: 'https://attack.mitre.org/techniques/T1081',
                      name: 'Credentials in Files',
                      id: 'T1081',
                    },
                  ],
                  tactic: {
                    reference: 'https://attack.mitre.org/tactics/TA0006',
                    name: 'Credential Access',
                    id: 'TA0006',
                  },
                },
                {
                  framework: 'MITRE ATT&CK',
                  technique: [
                    {
                      reference: 'https://attack.mitre.org/techniques/T1530',
                      name: 'Data from Cloud Storage Object',
                      id: 'T1530',
                    },
                  ],
                  tactic: {
                    reference: 'https://attack.mitre.org/tactics/TA0009',
                    name: 'Collection',
                    id: 'TA0009',
                  },
                },
              ],
              version: 1,
              created_at: '2020-02-12T19:49:29.417Z',
              updated_at: '2020-02-14T23:15:06.186Z',
            },
            original_event: {
              kind: 'event',
              action: 'process_started',
              module: 'system',
              dataset: 'process',
            },
          },
        },
      },
      {
        _index: '.siem-signals-default-000001',
        _id: '9f6d771532d8f2b314c65b5007b1b9e2fcd206dca352b9b244c971341a09f5ce',
        _score: 0,
        _source: {
          '@timestamp': '2020-02-15T00:15:19.231Z',
          service: {
            type: 'system',
          },
          event: {
            dataset: 'process',
            kind: 'signal',
            action: 'process_error',
            module: 'system',
          },
          message:
            'ERROR for PID 317759: failed to hash executable / for PID 317759: failed to calculate file hashes: read /: is a directory',
          cloud: {
            instance: {
              id: '5167639562480685129',
              name: 'beats-ci-immutable-ubuntu-1604-1581723302100990071',
            },
            machine: {
              type: 'n1-highmem-4',
            },
            availability_zone: 'us-central1-b',
            project: {
              id: 'elastic-ci-prod',
            },
            provider: 'gcp',
          },
          host: {
            architecture: 'x86_64',
            os: {
              platform: 'ubuntu',
              version: '16.04.6 LTS (Xenial Xerus)',
              family: 'debian',
              name: 'Ubuntu',
              kernel: '4.15.0-1052-gcp',
              codename: 'xenial',
            },
            name: 'beats-ci-immutable-ubuntu-1604-1581723302100990071',
            id: 'c428794c81ade2eb0633d2bbea7ecf51',
            containerized: false,
            hostname: 'beats-ci-immutable-ubuntu-1604-1581723302100990071',
          },
          agent: {
            ephemeral_id: '3b3939af-dc90-4be8-b20b-a3d9f555d379',
            hostname: 'beats-ci-immutable-ubuntu-1604-1581723302100990071',
            id: '4ae34f08-4770-4e5b-bd5b-c8b13741eafa',
            version: '7.2.0',
            type: 'auditbeat',
          },
          error: {
            message:
              'failed to hash executable / for PID 317759: failed to calculate file hashes: read /: is a directory',
          },
          process: {
            entity_id: 'ahsj04Ppla09U8Q2',
            name: 'runc:[2:INIT]',
            args: ['runc', 'init'],
            pid: 317759,
            ppid: 317706,
            working_directory: '/',
            executable: '/',
            start: '2020-02-15T00:09:18.360Z',
          },
          user: {
            name: 'root',
            id: '0',
            group: {
              id: '0',
              name: 'root',
            },
            effective: {
              id: '0',
              group: {
                id: '0',
              },
            },
            saved: {
              id: '0',
              group: {
                id: '0',
              },
            },
          },
          ecs: {
            version: '1.0.0',
          },
          signal: {
            parent: {
              rule: '2df3a613-f5a8-4b55-bf6a-487fc820b842',
              id: '79ctRnABMQha2n6bnxxQ',
              type: 'event',
              index: 'auditbeat-7.2.0',
              depth: 1,
            },
            ancestors: [
              {
                rule: '2df3a613-f5a8-4b55-bf6a-487fc820b842',
                id: '79ctRnABMQha2n6bnxxQ',
                type: 'event',
                index: 'auditbeat-7.2.0',
                depth: 1,
              },
            ],
            original_time: '2020-02-15T00:09:18.860Z',
            status: 'open',
            rule: {
              id: '2df3a613-f5a8-4b55-bf6a-487fc820b842',
              rule_id: '82b2b065-a2ee-49fc-9d6d-781a75c3d280',
              false_positives: [],
              meta: {
                from: '1m',
              },
              max_signals: 100,
              risk_score: 79,
              output_index: '.siem-signals-default',
              description: 'matches most events',
              from: 'now-360s',
              immutable: false,
              index: [
                'apm-*-transaction*',
                'auditbeat-*',
                'endgame-*',
                'filebeat-*',
                'packetbeat-*',
                'winlogbeat-*',
              ],
              interval: '5m',
              language: 'kuery',
              name: 'matches host.name exists',
              query: 'host.name : *',
              references: ['https://google.com'],
              severity: 'high',
              tags: [
                'host.name exists',
                'for testing',
                '__internal_rule_id:82b2b065-a2ee-49fc-9d6d-781a75c3d280',
                '__internal_immutable:false',
              ],
              type: 'query',
              to: 'now',
              enabled: true,
              filters: [],
              created_by: 'elastic',
              updated_by: 'elastic',
              threat: [
                {
                  framework: 'MITRE ATT&CK',
                  technique: [
                    {
                      reference: 'https://attack.mitre.org/techniques/T1110',
                      name: 'Brute Force',
                      id: 'T1110',
                    },
                    {
                      reference: 'https://attack.mitre.org/techniques/T1098',
                      name: 'Account Manipulation',
                      id: 'T1098',
                    },
                    {
                      reference: 'https://attack.mitre.org/techniques/T1081',
                      name: 'Credentials in Files',
                      id: 'T1081',
                    },
                  ],
                  tactic: {
                    reference: 'https://attack.mitre.org/tactics/TA0006',
                    name: 'Credential Access',
                    id: 'TA0006',
                  },
                },
                {
                  framework: 'MITRE ATT&CK',
                  technique: [
                    {
                      reference: 'https://attack.mitre.org/techniques/T1530',
                      name: 'Data from Cloud Storage Object',
                      id: 'T1530',
                    },
                  ],
                  tactic: {
                    reference: 'https://attack.mitre.org/tactics/TA0009',
                    name: 'Collection',
                    id: 'TA0009',
                  },
                },
              ],
              version: 1,
              created_at: '2020-02-12T19:49:29.417Z',
              updated_at: '2020-02-14T23:15:06.186Z',
            },
            original_event: {
              dataset: 'process',
              kind: 'error',
              action: 'process_error',
              module: 'system',
            },
          },
        },
      },
      {
        _index: '.siem-signals-default-000001',
        _id: '8b25a774791261eb6b452a29330a9b540e4c15d1780e168ba3f3640eae0915e5',
        _score: 0,
        _source: {
          '@timestamp': '2020-02-15T00:15:19.231Z',
          message: 'Process runc (PID: 317706) by user root STARTED',
          agent: {
            id: '4ae34f08-4770-4e5b-bd5b-c8b13741eafa',
            version: '7.2.0',
            type: 'auditbeat',
            ephemeral_id: '3b3939af-dc90-4be8-b20b-a3d9f555d379',
            hostname: 'beats-ci-immutable-ubuntu-1604-1581723302100990071',
          },
          cloud: {
            instance: {
              id: '5167639562480685129',
              name: 'beats-ci-immutable-ubuntu-1604-1581723302100990071',
            },
            machine: {
              type: 'n1-highmem-4',
            },
            availability_zone: 'us-central1-b',
            project: {
              id: 'elastic-ci-prod',
            },
            provider: 'gcp',
          },
          event: {
            kind: 'signal',
            action: 'process_started',
            module: 'system',
            dataset: 'process',
          },
          process: {
            start: '2020-02-15T00:09:18.260Z',
            hash: {
              sha1: '8fac1f8560a82a87c4574090b2a674bd1f991c0e',
            },
            name: 'runc',
            working_directory:
              '/run/containerd/io.containerd.runtime.v1.linux/moby/c7b542af63eb78776a3c01b6a54b8020c9a8c6046aab4998132558a5ad091159',
            executable: '/usr/bin/runc',
            entity_id: '/CQ7XxYGavA4G9NA',
            pid: 317706,
            args: [
              'runc',
              '--root',
              '/var/run/docker/runtime-runc/moby',
              '--log',
              '/run/containerd/io.containerd.runtime.v1.linux/moby/c7b542af63eb78776a3c01b6a54b8020c9a8c6046aab4998132558a5ad091159/log.json',
              '--log-format',
              'json',
              'exec',
              '--process',
              '/tmp/runc-process980346866',
              '--detach',
              '--pid-file',
              '/run/containerd/io.containerd.runtime.v1.linux/moby/c7b542af63eb78776a3c01b6a54b8020c9a8c6046aab4998132558a5ad091159/5e248845d131ede3ce495dec86d57c927bd0900e69300bc1eb53997cb5ff8c28.pid',
              'c7b542af63eb78776a3c01b6a54b8020c9a8c6046aab4998132558a5ad091159',
            ],
            ppid: 305756,
          },
          user: {
            saved: {
              id: '0',
              group: {
                id: '0',
              },
            },
            name: 'root',
            id: '0',
            group: {
              id: '0',
              name: 'root',
            },
            effective: {
              group: {
                id: '0',
              },
              id: '0',
            },
          },
          service: {
            type: 'system',
          },
          ecs: {
            version: '1.0.0',
          },
          host: {
            architecture: 'x86_64',
            os: {
              version: '16.04.6 LTS (Xenial Xerus)',
              family: 'debian',
              name: 'Ubuntu',
              kernel: '4.15.0-1052-gcp',
              codename: 'xenial',
              platform: 'ubuntu',
            },
            id: 'c428794c81ade2eb0633d2bbea7ecf51',
            containerized: false,
            hostname: 'beats-ci-immutable-ubuntu-1604-1581723302100990071',
            name: 'beats-ci-immutable-ubuntu-1604-1581723302100990071',
          },
          signal: {
            parent: {
              rule: '2df3a613-f5a8-4b55-bf6a-487fc820b842',
              id: '8NctRnABMQha2n6bnxxQ',
              type: 'event',
              index: 'auditbeat-7.2.0',
              depth: 1,
            },
            ancestors: [
              {
                rule: '2df3a613-f5a8-4b55-bf6a-487fc820b842',
                id: '8NctRnABMQha2n6bnxxQ',
                type: 'event',
                index: 'auditbeat-7.2.0',
                depth: 1,
              },
            ],
            original_time: '2020-02-15T00:09:18.860Z',
            status: 'open',
            rule: {
              id: '2df3a613-f5a8-4b55-bf6a-487fc820b842',
              rule_id: '82b2b065-a2ee-49fc-9d6d-781a75c3d280',
              false_positives: [],
              meta: {
                from: '1m',
              },
              max_signals: 100,
              risk_score: 79,
              output_index: '.siem-signals-default',
              description: 'matches most events',
              from: 'now-360s',
              immutable: false,
              index: [
                'apm-*-transaction*',
                'auditbeat-*',
                'endgame-*',
                'filebeat-*',
                'packetbeat-*',
                'winlogbeat-*',
              ],
              interval: '5m',
              language: 'kuery',
              name: 'matches host.name exists',
              query: 'host.name : *',
              references: ['https://google.com'],
              severity: 'high',
              tags: [
                'host.name exists',
                'for testing',
                '__internal_rule_id:82b2b065-a2ee-49fc-9d6d-781a75c3d280',
                '__internal_immutable:false',
              ],
              type: 'query',
              to: 'now',
              enabled: true,
              filters: [],
              created_by: 'elastic',
              updated_by: 'elastic',
              threat: [
                {
                  framework: 'MITRE ATT&CK',
                  technique: [
                    {
                      reference: 'https://attack.mitre.org/techniques/T1110',
                      name: 'Brute Force',
                      id: 'T1110',
                    },
                    {
                      reference: 'https://attack.mitre.org/techniques/T1098',
                      name: 'Account Manipulation',
                      id: 'T1098',
                    },
                    {
                      reference: 'https://attack.mitre.org/techniques/T1081',
                      name: 'Credentials in Files',
                      id: 'T1081',
                    },
                  ],
                  tactic: {
                    reference: 'https://attack.mitre.org/tactics/TA0006',
                    name: 'Credential Access',
                    id: 'TA0006',
                  },
                },
                {
                  framework: 'MITRE ATT&CK',
                  technique: [
                    {
                      reference: 'https://attack.mitre.org/techniques/T1530',
                      name: 'Data from Cloud Storage Object',
                      id: 'T1530',
                    },
                  ],
                  tactic: {
                    reference: 'https://attack.mitre.org/tactics/TA0009',
                    name: 'Collection',
                    id: 'TA0009',
                  },
                },
              ],
              version: 1,
              created_at: '2020-02-12T19:49:29.417Z',
              updated_at: '2020-02-14T23:15:06.186Z',
            },
            original_event: {
              kind: 'event',
              action: 'process_started',
              module: 'system',
              dataset: 'process',
            },
          },
        },
      },
      {
        _index: '.siem-signals-default-000001',
        _id: '21475df9042b05c0e3a4815d5683f86093dddd0b4bfbc987022f3e510aa26cf6',
        _score: 0,
        _source: {
          '@timestamp': '2020-02-15T00:15:19.231Z',
          process: {
            working_directory: '/',
            executable: '/bin/bash',
            entity_id: 'W5R5gIGSXZMipAza',
            args: ['/bin/bash', '/healthcheck.sh'],
            ppid: 317283,
            start: '2020-02-15T00:09:17.400Z',
            name: 'healthcheck.sh',
            pid: 317350,
            hash: {
              sha1: 'fb4fe80f89df4c09ab16881fae70c983c379dd1d',
            },
          },
          cloud: {
            instance: {
              id: '5167639562480685129',
              name: 'beats-ci-immutable-ubuntu-1604-1581723302100990071',
            },
            machine: {
              type: 'n1-highmem-4',
            },
            availability_zone: 'us-central1-b',
            project: {
              id: 'elastic-ci-prod',
            },
            provider: 'gcp',
          },
          event: {
            module: 'system',
            dataset: 'process',
            kind: 'signal',
            action: 'process_started',
          },
          user: {
            name: 'root',
            id: '0',
            group: {
              name: 'root',
              id: '0',
            },
            effective: {
              id: '0',
              group: {
                id: '0',
              },
            },
            saved: {
              id: '0',
              group: {
                id: '0',
              },
            },
          },
          service: {
            type: 'system',
          },
          ecs: {
            version: '1.0.0',
          },
          host: {
            os: {
              name: 'Ubuntu',
              kernel: '4.15.0-1052-gcp',
              codename: 'xenial',
              platform: 'ubuntu',
              version: '16.04.6 LTS (Xenial Xerus)',
              family: 'debian',
            },
            id: 'c428794c81ade2eb0633d2bbea7ecf51',
            containerized: false,
            hostname: 'beats-ci-immutable-ubuntu-1604-1581723302100990071',
            name: 'beats-ci-immutable-ubuntu-1604-1581723302100990071',
            architecture: 'x86_64',
          },
          agent: {
            hostname: 'beats-ci-immutable-ubuntu-1604-1581723302100990071',
            id: '4ae34f08-4770-4e5b-bd5b-c8b13741eafa',
            version: '7.2.0',
            type: 'auditbeat',
            ephemeral_id: '3b3939af-dc90-4be8-b20b-a3d9f555d379',
          },
          message: 'Process healthcheck.sh (PID: 317350) by user root STARTED',
          signal: {
            parent: {
              rule: '2df3a613-f5a8-4b55-bf6a-487fc820b842',
              id: '8dctRnABMQha2n6bnxxQ',
              type: 'event',
              index: 'auditbeat-7.2.0',
              depth: 1,
            },
            ancestors: [
              {
                rule: '2df3a613-f5a8-4b55-bf6a-487fc820b842',
                id: '8dctRnABMQha2n6bnxxQ',
                type: 'event',
                index: 'auditbeat-7.2.0',
                depth: 1,
              },
            ],
            original_time: '2020-02-15T00:09:18.860Z',
            status: 'open',
            rule: {
              id: '2df3a613-f5a8-4b55-bf6a-487fc820b842',
              rule_id: '82b2b065-a2ee-49fc-9d6d-781a75c3d280',
              false_positives: [],
              meta: {
                from: '1m',
              },
              max_signals: 100,
              risk_score: 79,
              output_index: '.siem-signals-default',
              description: 'matches most events',
              from: 'now-360s',
              immutable: false,
              index: [
                'apm-*-transaction*',
                'auditbeat-*',
                'endgame-*',
                'filebeat-*',
                'packetbeat-*',
                'winlogbeat-*',
              ],
              interval: '5m',
              language: 'kuery',
              name: 'matches host.name exists',
              query: 'host.name : *',
              references: ['https://google.com'],
              severity: 'high',
              tags: [
                'host.name exists',
                'for testing',
                '__internal_rule_id:82b2b065-a2ee-49fc-9d6d-781a75c3d280',
                '__internal_immutable:false',
              ],
              type: 'query',
              to: 'now',
              enabled: true,
              filters: [],
              created_by: 'elastic',
              updated_by: 'elastic',
              threat: [
                {
                  framework: 'MITRE ATT&CK',
                  technique: [
                    {
                      reference: 'https://attack.mitre.org/techniques/T1110',
                      name: 'Brute Force',
                      id: 'T1110',
                    },
                    {
                      reference: 'https://attack.mitre.org/techniques/T1098',
                      name: 'Account Manipulation',
                      id: 'T1098',
                    },
                    {
                      reference: 'https://attack.mitre.org/techniques/T1081',
                      name: 'Credentials in Files',
                      id: 'T1081',
                    },
                  ],
                  tactic: {
                    reference: 'https://attack.mitre.org/tactics/TA0006',
                    name: 'Credential Access',
                    id: 'TA0006',
                  },
                },
                {
                  framework: 'MITRE ATT&CK',
                  technique: [
                    {
                      reference: 'https://attack.mitre.org/techniques/T1530',
                      name: 'Data from Cloud Storage Object',
                      id: 'T1530',
                    },
                  ],
                  tactic: {
                    reference: 'https://attack.mitre.org/tactics/TA0009',
                    name: 'Collection',
                    id: 'TA0009',
                  },
                },
              ],
              version: 1,
              created_at: '2020-02-12T19:49:29.417Z',
              updated_at: '2020-02-14T23:15:06.186Z',
            },
            original_event: {
              module: 'system',
              dataset: 'process',
              kind: 'event',
              action: 'process_started',
            },
          },
        },
      },
      {
        _index: '.siem-signals-default-000001',
        _id: '61f58ccf13abcb805729468e3e29cfacb1bbe20d096480c5c2c4afd7e9be81ad',
        _score: 0,
        _source: {
          '@timestamp': '2020-02-15T00:15:19.231Z',
          message: 'Process java (PID: 317356) by user root STARTED',
          agent: {
            version: '7.2.0',
            type: 'auditbeat',
            ephemeral_id: '3b3939af-dc90-4be8-b20b-a3d9f555d379',
            hostname: 'beats-ci-immutable-ubuntu-1604-1581723302100990071',
            id: '4ae34f08-4770-4e5b-bd5b-c8b13741eafa',
          },
          cloud: {
            provider: 'gcp',
            instance: {
              id: '5167639562480685129',
              name: 'beats-ci-immutable-ubuntu-1604-1581723302100990071',
            },
            machine: {
              type: 'n1-highmem-4',
            },
            availability_zone: 'us-central1-b',
            project: {
              id: 'elastic-ci-prod',
            },
          },
          process: {
            args: [
              'java',
              '-Xmx256M',
              '-server',
              '-XX:+UseG1GC',
              '-XX:MaxGCPauseMillis=20',
              '-XX:InitiatingHeapOccupancyPercent=35',
              '-XX:+ExplicitGCInvokesConcurrent',
              '-Djava.awt.headless=true',
              '-Dcom.sun.management.jmxremote',
              '-Dcom.sun.management.jmxremote.authenticate=false',
              '-Dcom.sun.management.jmxremote.ssl=false',
              '-Dkafka.logs.dir=/kafka/bin/../logs',
              '-Dlog4j.configuration=file:/kafka/bin/../config/tools-log4j.properties',
              '-cp',
              '/kafka/bin/../libs/activation-1.1.1.jar:/kafka/bin/../libs/aopalliance-repackaged-2.5.0-b42.jar:/kafka/bin/../libs/argparse4j-0.7.0.jar:/kafka/bin/../libs/audience-annotations-0.5.0.jar:/kafka/bin/../libs/commons-lang3-3.8.1.jar:/kafka/bin/../libs/connect-api-2.1.1.jar:/kafka/bin/../libs/connect-basic-auth-extension-2.1.1.jar:/kafka/bin/../libs/connect-file-2.1.1.jar:/kafka/bin/../libs/connect-json-2.1.1.jar:/kafka/bin/../libs/connect-runtime-2.1.1.jar:/kafka/bin/../libs/connect-transforms-2.1.1.jar:/kafka/bin/../libs/guava-20.0.jar:/kafka/bin/../libs/hk2-api-2.5.0-b42.jar:/kafka/bin/../libs/hk2-locator-2.5.0-b42.jar:/kafka/bin/../libs/hk2-utils-2.5.0-b42.jar:/kafka/bin/../libs/jackson-annotations-2.9.8.jar:/kafka/bin/../libs/jackson-core-2.9.8.jar:/kafka/bin/../libs/jackson-databind-2.9.8.jar:/kafka/bin/../libs/jackson-jaxrs-base-2.9.8.jar:/kafka/bin/../libs/jackson-jaxrs-json-provider-2.9.8.jar:/kafka/bin/../libs/jackson-module-jaxb-annotations-2.9.8.jar:/kafka/bin/../libs/javassist-3.22.0-CR2.jar:/kafka/bin/../libs/javax.annotation-api-1.2.jar:/kafka/bin/../libs/javax.inject-1.jar:/kafka/bin/../libs/javax.inject-2.5.0-b42.jar:/kafka/bin/../libs/javax.servlet-api-3.1.0.jar:/kafka/bin/../libs/javax.ws.rs-api-2.1.1.jar:/kafka/bin/../libs/javax.ws.rs-api-2.1.jar:/kafka/bin/../libs/jaxb-api-2.3.0.jar:/kafka/bin/../libs/jersey-client-2.27.jar:/kafka/bin/../libs/jersey-common-2.27.jar:/kafka/bin/../libs/jersey-container-servlet-2.27.jar:/kafka/bin/../libs/jersey-container-servlet-core-2.27.jar:/kafka/bin/../libs/jersey-hk2-2.27.jar:/kafka/bin/../libs/jersey-media-jaxb-2.27.jar:/kafka/bin/../libs/jersey-server-2.27.jar:/kafka/bin/../libs/jetty-client-9.4.12.v20180830.jar:/kafka/bin/../libs/jetty-continuation-9.4.12.v20180830.jar:/kafka/bin/../libs/jetty-http-9.4.12.v20180830.jar:/kafka/bin/../libs/jetty-io-9.4.12.v20180830.jar:/kafka/bin/../libs/jetty-security-9.4.12.v20180830.jar:/kafka/bin/../libs/jetty-server-9.4.12.v20180830.jar:/kafka/bin/../libs/jetty-servlet-9.4.12.v20180830.jar:/kafka/bin/../libs/jetty-servlets-9.4.12.v20180830.jar:/kafka/bin/../libs/jetty-util-9.4.12.v20180830.jar:/kafka/bin/../libs/jopt-simple-5.0.4.jar:/kafka/bin/../libs/kafka-clients-2.1.1.jar:/kafka/bin/../libs/kafka-log4j-appender-2.1.1.jar:/kafka/bin/../libs/kafka-streams-2.1.1.jar:/kafka/bin/../libs/kafka-streams-examples-2.1.1.jar:/kafka/bin/../libs/kafka-streams-scala_2.11-2.1.1.jar:/kafka/bin/../libs/kafka-streams-test-utils-2.1.1.jar:/kafka/bin/../libs/kafka-tools-2.1.1.jar:/kafka/bin/../libs/kafka_2.11-2.1.1-sources.jar:/kafka/bin/../libs/kafka_2.11-2.1.1.jar:/kafka/bin/../libs/log4j-1.2.17.jar:/kafka/bin/../libs/lz4-java-1.5.0.jar:/kafka/bin/../libs/maven-artifact-3.6.0.jar:/kafka/bin/../libs/metrics-core-2.2.0.jar:/kafka/bin/../libs/osgi-resource-locator-1.0.1.jar:/kafka/bin/../libs/plexus-utils-3.1.0.jar:/kafka/bin/../libs/reflections-0.9.11.jar:/kafka/bin/../libs/rocksdbjni-5.14.2.jar:/kafka/bin/../libs/scala-library-2.11.12.jar:/kafka/bin/../libs/scala-logging_2.11-3.9.0.jar:/kafka/bin/../libs/scala-reflect-2.11.12.jar:/kafka/bin/../libs/slf4j-api-1.7.25.jar:/kafka/bin/../libs/slf4j-log4j12-1.7.25.jar:/kafka/bin/../libs/snappy-java-1.1.7.2.jar:/kafka/bin/../libs/validation-api-1.1.0.Final.jar:/kafka/bin/../libs/zkclient-0.11.jar:/kafka/bin/../libs/zookeeper-3.4.13.jar:/kafka/bin/../libs/zstd-jni-1.3.7-1.jar',
              'kafka.admin.TopicCommand',
              '--zookeeper=127.0.0.1:2181',
              '--create',
              '--partitions',
              '1',
              '--topic',
              'foo-1581725357-537137899',
              '--replication-factor',
              '1',
            ],
            executable: '/usr/lib/jvm/java-8-openjdk-amd64/jre/bin/java',
            working_directory: '/',
            start: '2020-02-15T00:09:17.410Z',
            entity_id: 'hvAFxDHDqln8TnGk',
            name: 'java',
            pid: 317356,
            ppid: 317350,
            hash: {
              sha1: 'c17d539180f68c9df2265b6a1925311ee945e599',
            },
          },
          user: {
            name: 'root',
            id: '0',
            group: {
              id: '0',
              name: 'root',
            },
            effective: {
              id: '0',
              group: {
                id: '0',
              },
            },
            saved: {
              id: '0',
              group: {
                id: '0',
              },
            },
          },
          service: {
            type: 'system',
          },
          ecs: {
            version: '1.0.0',
          },
          host: {
            hostname: 'beats-ci-immutable-ubuntu-1604-1581723302100990071',
            architecture: 'x86_64',
            os: {
              kernel: '4.15.0-1052-gcp',
              codename: 'xenial',
              platform: 'ubuntu',
              version: '16.04.6 LTS (Xenial Xerus)',
              family: 'debian',
              name: 'Ubuntu',
            },
            id: 'c428794c81ade2eb0633d2bbea7ecf51',
            name: 'beats-ci-immutable-ubuntu-1604-1581723302100990071',
            containerized: false,
          },
          event: {
            kind: 'signal',
            action: 'process_started',
            module: 'system',
            dataset: 'process',
          },
          signal: {
            parent: {
              rule: '2df3a613-f5a8-4b55-bf6a-487fc820b842',
              id: '8tctRnABMQha2n6bnxxQ',
              type: 'event',
              index: 'auditbeat-7.2.0',
              depth: 1,
            },
            ancestors: [
              {
                rule: '2df3a613-f5a8-4b55-bf6a-487fc820b842',
                id: '8tctRnABMQha2n6bnxxQ',
                type: 'event',
                index: 'auditbeat-7.2.0',
                depth: 1,
              },
            ],
            original_time: '2020-02-15T00:09:18.860Z',
            status: 'open',
            rule: {
              id: '2df3a613-f5a8-4b55-bf6a-487fc820b842',
              rule_id: '82b2b065-a2ee-49fc-9d6d-781a75c3d280',
              false_positives: [],
              meta: {
                from: '1m',
              },
              max_signals: 100,
              risk_score: 79,
              output_index: '.siem-signals-default',
              description: 'matches most events',
              from: 'now-360s',
              immutable: false,
              index: [
                'apm-*-transaction*',
                'auditbeat-*',
                'endgame-*',
                'filebeat-*',
                'packetbeat-*',
                'winlogbeat-*',
              ],
              interval: '5m',
              language: 'kuery',
              name: 'matches host.name exists',
              query: 'host.name : *',
              references: ['https://google.com'],
              severity: 'high',
              tags: [
                'host.name exists',
                'for testing',
                '__internal_rule_id:82b2b065-a2ee-49fc-9d6d-781a75c3d280',
                '__internal_immutable:false',
              ],
              type: 'query',
              to: 'now',
              enabled: true,
              filters: [],
              created_by: 'elastic',
              updated_by: 'elastic',
              threat: [
                {
                  framework: 'MITRE ATT&CK',
                  technique: [
                    {
                      reference: 'https://attack.mitre.org/techniques/T1110',
                      name: 'Brute Force',
                      id: 'T1110',
                    },
                    {
                      reference: 'https://attack.mitre.org/techniques/T1098',
                      name: 'Account Manipulation',
                      id: 'T1098',
                    },
                    {
                      reference: 'https://attack.mitre.org/techniques/T1081',
                      name: 'Credentials in Files',
                      id: 'T1081',
                    },
                  ],
                  tactic: {
                    reference: 'https://attack.mitre.org/tactics/TA0006',
                    name: 'Credential Access',
                    id: 'TA0006',
                  },
                },
                {
                  framework: 'MITRE ATT&CK',
                  technique: [
                    {
                      reference: 'https://attack.mitre.org/techniques/T1530',
                      name: 'Data from Cloud Storage Object',
                      id: 'T1530',
                    },
                  ],
                  tactic: {
                    reference: 'https://attack.mitre.org/tactics/TA0009',
                    name: 'Collection',
                    id: 'TA0009',
                  },
                },
              ],
              version: 1,
              created_at: '2020-02-12T19:49:29.417Z',
              updated_at: '2020-02-14T23:15:06.186Z',
            },
            original_event: {
              kind: 'event',
              action: 'process_started',
              module: 'system',
              dataset: 'process',
            },
          },
        },
      },
      {
        _index: '.siem-signals-default-000001',
        _id: '70c136aea1eac1ff3b806fe562ce5a2db2af0f67a25670c79a3a12a118a8ddd9',
        _score: 0,
        _source: {
          '@timestamp': '2020-02-15T00:15:19.231Z',
          user: {
            id: '0',
            group: {
              id: '0',
              name: 'root',
            },
            effective: {
              id: '0',
              group: {
                id: '0',
              },
            },
            saved: {
              id: '0',
              group: {
                id: '0',
              },
            },
            name: 'root',
          },
          event: {
            action: 'process_started',
            module: 'system',
            dataset: 'process',
            kind: 'signal',
          },
          agent: {
            type: 'auditbeat',
            ephemeral_id: '3b3939af-dc90-4be8-b20b-a3d9f555d379',
            hostname: 'beats-ci-immutable-ubuntu-1604-1581723302100990071',
            id: '4ae34f08-4770-4e5b-bd5b-c8b13741eafa',
            version: '7.2.0',
          },
          process: {
            hash: {
              sha1: '4ce28b5cb6179da43132c0d6cacb3d369fbadd90',
            },
            name: 'sh',
            ppid: 211653,
            working_directory: '/',
            pid: 317283,
            executable: '/bin/dash',
            args: ['/bin/sh', '-c', '/healthcheck.sh'],
            start: '2020-02-15T00:09:16.980Z',
            entity_id: '9b0lq42G8KrytmGn',
          },
          message: 'Process sh (PID: 317283) by user root STARTED',
          service: {
            type: 'system',
          },
          ecs: {
            version: '1.0.0',
          },
          host: {
            architecture: 'x86_64',
            os: {
              codename: 'xenial',
              platform: 'ubuntu',
              version: '16.04.6 LTS (Xenial Xerus)',
              family: 'debian',
              name: 'Ubuntu',
              kernel: '4.15.0-1052-gcp',
            },
            id: 'c428794c81ade2eb0633d2bbea7ecf51',
            containerized: false,
            name: 'beats-ci-immutable-ubuntu-1604-1581723302100990071',
            hostname: 'beats-ci-immutable-ubuntu-1604-1581723302100990071',
          },
          cloud: {
            availability_zone: 'us-central1-b',
            project: {
              id: 'elastic-ci-prod',
            },
            provider: 'gcp',
            instance: {
              id: '5167639562480685129',
              name: 'beats-ci-immutable-ubuntu-1604-1581723302100990071',
            },
            machine: {
              type: 'n1-highmem-4',
            },
          },
          signal: {
            parent: {
              rule: '2df3a613-f5a8-4b55-bf6a-487fc820b842',
              id: '89ctRnABMQha2n6bnxxQ',
              type: 'event',
              index: 'auditbeat-7.2.0',
              depth: 1,
            },
            ancestors: [
              {
                rule: '2df3a613-f5a8-4b55-bf6a-487fc820b842',
                id: '89ctRnABMQha2n6bnxxQ',
                type: 'event',
                index: 'auditbeat-7.2.0',
                depth: 1,
              },
            ],
            original_time: '2020-02-15T00:09:18.860Z',
            status: 'open',
            rule: {
              id: '2df3a613-f5a8-4b55-bf6a-487fc820b842',
              rule_id: '82b2b065-a2ee-49fc-9d6d-781a75c3d280',
              false_positives: [],
              meta: {
                from: '1m',
              },
              max_signals: 100,
              risk_score: 79,
              output_index: '.siem-signals-default',
              description: 'matches most events',
              from: 'now-360s',
              immutable: false,
              index: [
                'apm-*-transaction*',
                'auditbeat-*',
                'endgame-*',
                'filebeat-*',
                'packetbeat-*',
                'winlogbeat-*',
              ],
              interval: '5m',
              language: 'kuery',
              name: 'matches host.name exists',
              query: 'host.name : *',
              references: ['https://google.com'],
              severity: 'high',
              tags: [
                'host.name exists',
                'for testing',
                '__internal_rule_id:82b2b065-a2ee-49fc-9d6d-781a75c3d280',
                '__internal_immutable:false',
              ],
              type: 'query',
              to: 'now',
              enabled: true,
              filters: [],
              created_by: 'elastic',
              updated_by: 'elastic',
              threat: [
                {
                  framework: 'MITRE ATT&CK',
                  technique: [
                    {
                      reference: 'https://attack.mitre.org/techniques/T1110',
                      name: 'Brute Force',
                      id: 'T1110',
                    },
                    {
                      reference: 'https://attack.mitre.org/techniques/T1098',
                      name: 'Account Manipulation',
                      id: 'T1098',
                    },
                    {
                      reference: 'https://attack.mitre.org/techniques/T1081',
                      name: 'Credentials in Files',
                      id: 'T1081',
                    },
                  ],
                  tactic: {
                    reference: 'https://attack.mitre.org/tactics/TA0006',
                    name: 'Credential Access',
                    id: 'TA0006',
                  },
                },
                {
                  framework: 'MITRE ATT&CK',
                  technique: [
                    {
                      reference: 'https://attack.mitre.org/techniques/T1530',
                      name: 'Data from Cloud Storage Object',
                      id: 'T1530',
                    },
                  ],
                  tactic: {
                    reference: 'https://attack.mitre.org/tactics/TA0009',
                    name: 'Collection',
                    id: 'TA0009',
                  },
                },
              ],
              version: 1,
              created_at: '2020-02-12T19:49:29.417Z',
              updated_at: '2020-02-14T23:15:06.186Z',
            },
            original_event: {
              action: 'process_started',
              module: 'system',
              dataset: 'process',
              kind: 'event',
            },
          },
        },
      },
      {
        _index: '.siem-signals-default-000001',
        _id: '0e8d2449f31b2327be16f2228d1c41fe35a35d9b88d3fd5872ff1a644383e6db',
        _score: 0,
        _source: {
          '@timestamp': '2020-02-15T00:15:19.231Z',
          user: {
            id: '0',
            group: {
              id: '0',
              name: 'root',
            },
            effective: {
              id: '0',
              group: {
                id: '0',
              },
            },
            saved: {
              group: {
                id: '0',
              },
              id: '0',
            },
            name: 'root',
          },
          event: {
            dataset: 'process',
            kind: 'signal',
            action: 'process_stopped',
            module: 'system',
          },
          ecs: {
            version: '1.0.0',
          },
          process: {
            start: '2020-02-15T00:09:08.270Z',
            ppid: 255136,
            working_directory:
              '/run/containerd/io.containerd.runtime.v1.linux/moby/573c0bb62e18fa95c8d12a569913dbb5508832a4c9d67c0bdfc24fa08b7ef409',
            hash: {
              sha1: '8fac1f8560a82a87c4574090b2a674bd1f991c0e',
            },
            entity_id: '6UPQW/HXppHN3sqj',
            args: [
              'runc',
              '--root',
              '/var/run/docker/runtime-runc/moby',
              '--log',
              '/run/containerd/io.containerd.runtime.v1.linux/moby/573c0bb62e18fa95c8d12a569913dbb5508832a4c9d67c0bdfc24fa08b7ef409/log.json',
              '--log-format',
              'json',
              'exec',
              '--process',
              '/tmp/runc-process641978302',
              '--detach',
              '--pid-file',
              '/run/containerd/io.containerd.runtime.v1.linux/moby/573c0bb62e18fa95c8d12a569913dbb5508832a4c9d67c0bdfc24fa08b7ef409/c61c2a64a1c31a3b61f4bfecad44d57ac109e6743a298526534fdbc29df35d02.pid',
              '573c0bb62e18fa95c8d12a569913dbb5508832a4c9d67c0bdfc24fa08b7ef409',
            ],
            executable: '/usr/bin/runc',
            name: 'runc',
            pid: 315827,
          },
          message: 'Process runc (PID: 315827) by user root STOPPED',
          service: {
            type: 'system',
          },
          agent: {
            version: '7.2.0',
            type: 'auditbeat',
            ephemeral_id: '3b3939af-dc90-4be8-b20b-a3d9f555d379',
            hostname: 'beats-ci-immutable-ubuntu-1604-1581723302100990071',
            id: '4ae34f08-4770-4e5b-bd5b-c8b13741eafa',
          },
          host: {
            name: 'beats-ci-immutable-ubuntu-1604-1581723302100990071',
            hostname: 'beats-ci-immutable-ubuntu-1604-1581723302100990071',
            architecture: 'x86_64',
            os: {
              platform: 'ubuntu',
              version: '16.04.6 LTS (Xenial Xerus)',
              family: 'debian',
              name: 'Ubuntu',
              kernel: '4.15.0-1052-gcp',
              codename: 'xenial',
            },
            id: 'c428794c81ade2eb0633d2bbea7ecf51',
            containerized: false,
          },
          cloud: {
            machine: {
              type: 'n1-highmem-4',
            },
            availability_zone: 'us-central1-b',
            project: {
              id: 'elastic-ci-prod',
            },
            provider: 'gcp',
            instance: {
              id: '5167639562480685129',
              name: 'beats-ci-immutable-ubuntu-1604-1581723302100990071',
            },
          },
          signal: {
            parent: {
              rule: '2df3a613-f5a8-4b55-bf6a-487fc820b842',
              id: '9NctRnABMQha2n6bnxxQ',
              type: 'event',
              index: 'auditbeat-7.2.0',
              depth: 1,
            },
            ancestors: [
              {
                rule: '2df3a613-f5a8-4b55-bf6a-487fc820b842',
                id: '9NctRnABMQha2n6bnxxQ',
                type: 'event',
                index: 'auditbeat-7.2.0',
                depth: 1,
              },
            ],
            original_time: '2020-02-15T00:09:18.860Z',
            status: 'open',
            rule: {
              id: '2df3a613-f5a8-4b55-bf6a-487fc820b842',
              rule_id: '82b2b065-a2ee-49fc-9d6d-781a75c3d280',
              false_positives: [],
              meta: {
                from: '1m',
              },
              max_signals: 100,
              risk_score: 79,
              output_index: '.siem-signals-default',
              description: 'matches most events',
              from: 'now-360s',
              immutable: false,
              index: [
                'apm-*-transaction*',
                'auditbeat-*',
                'endgame-*',
                'filebeat-*',
                'packetbeat-*',
                'winlogbeat-*',
              ],
              interval: '5m',
              language: 'kuery',
              name: 'matches host.name exists',
              query: 'host.name : *',
              references: ['https://google.com'],
              severity: 'high',
              tags: [
                'host.name exists',
                'for testing',
                '__internal_rule_id:82b2b065-a2ee-49fc-9d6d-781a75c3d280',
                '__internal_immutable:false',
              ],
              type: 'query',
              to: 'now',
              enabled: true,
              filters: [],
              created_by: 'elastic',
              updated_by: 'elastic',
              threat: [
                {
                  framework: 'MITRE ATT&CK',
                  technique: [
                    {
                      reference: 'https://attack.mitre.org/techniques/T1110',
                      name: 'Brute Force',
                      id: 'T1110',
                    },
                    {
                      reference: 'https://attack.mitre.org/techniques/T1098',
                      name: 'Account Manipulation',
                      id: 'T1098',
                    },
                    {
                      reference: 'https://attack.mitre.org/techniques/T1081',
                      name: 'Credentials in Files',
                      id: 'T1081',
                    },
                  ],
                  tactic: {
                    reference: 'https://attack.mitre.org/tactics/TA0006',
                    name: 'Credential Access',
                    id: 'TA0006',
                  },
                },
                {
                  framework: 'MITRE ATT&CK',
                  technique: [
                    {
                      reference: 'https://attack.mitre.org/techniques/T1530',
                      name: 'Data from Cloud Storage Object',
                      id: 'T1530',
                    },
                  ],
                  tactic: {
                    reference: 'https://attack.mitre.org/tactics/TA0009',
                    name: 'Collection',
                    id: 'TA0009',
                  },
                },
              ],
              version: 1,
              created_at: '2020-02-12T19:49:29.417Z',
              updated_at: '2020-02-14T23:15:06.186Z',
            },
            original_event: {
              dataset: 'process',
              kind: 'event',
              action: 'process_stopped',
              module: 'system',
            },
          },
        },
      },
      {
        _index: '.siem-signals-default-000001',
        _id: '24ab4e82c1696cf80cad4ca06ead714f9be460f2b84cbb117f0e447f52fbb6ca',
        _score: 0,
        _source: {
          '@timestamp': '2020-02-15T00:15:19.231Z',
          event: {
            module: 'system',
            dataset: 'process',
            kind: 'signal',
            action: 'process_stopped',
          },
          process: {
            name: 'healthcheck.sh',
            hash: {
              sha1: 'fb4fe80f89df4c09ab16881fae70c983c379dd1d',
            },
            working_directory: '/',
            executable: '/bin/bash',
            start: '2020-02-15T00:09:07.290Z',
            entity_id: 'EWRy3K9Oq04tpoNt',
            args: ['/bin/bash', '/healthcheck.sh'],
            pid: 315448,
            ppid: 315411,
          },
          agent: {
            type: 'auditbeat',
            ephemeral_id: '3b3939af-dc90-4be8-b20b-a3d9f555d379',
            hostname: 'beats-ci-immutable-ubuntu-1604-1581723302100990071',
            id: '4ae34f08-4770-4e5b-bd5b-c8b13741eafa',
            version: '7.2.0',
          },
          ecs: {
            version: '1.0.0',
          },
          message: 'Process healthcheck.sh (PID: 315448) by user root STOPPED',
          user: {
            id: '0',
            group: {
              id: '0',
              name: 'root',
            },
            effective: {
              group: {
                id: '0',
              },
              id: '0',
            },
            saved: {
              id: '0',
              group: {
                id: '0',
              },
            },
            name: 'root',
          },
          cloud: {
            instance: {
              id: '5167639562480685129',
              name: 'beats-ci-immutable-ubuntu-1604-1581723302100990071',
            },
            machine: {
              type: 'n1-highmem-4',
            },
            availability_zone: 'us-central1-b',
            project: {
              id: 'elastic-ci-prod',
            },
            provider: 'gcp',
          },
          service: {
            type: 'system',
          },
          host: {
            os: {
              name: 'Ubuntu',
              kernel: '4.15.0-1052-gcp',
              codename: 'xenial',
              platform: 'ubuntu',
              version: '16.04.6 LTS (Xenial Xerus)',
              family: 'debian',
            },
            id: 'c428794c81ade2eb0633d2bbea7ecf51',
            containerized: false,
            name: 'beats-ci-immutable-ubuntu-1604-1581723302100990071',
            hostname: 'beats-ci-immutable-ubuntu-1604-1581723302100990071',
            architecture: 'x86_64',
          },
          signal: {
            parent: {
              rule: '2df3a613-f5a8-4b55-bf6a-487fc820b842',
              id: '9dctRnABMQha2n6bnxxQ',
              type: 'event',
              index: 'auditbeat-7.2.0',
              depth: 1,
            },
            ancestors: [
              {
                rule: '2df3a613-f5a8-4b55-bf6a-487fc820b842',
                id: '9dctRnABMQha2n6bnxxQ',
                type: 'event',
                index: 'auditbeat-7.2.0',
                depth: 1,
              },
            ],
            original_time: '2020-02-15T00:09:18.860Z',
            status: 'open',
            rule: {
              id: '2df3a613-f5a8-4b55-bf6a-487fc820b842',
              rule_id: '82b2b065-a2ee-49fc-9d6d-781a75c3d280',
              false_positives: [],
              meta: {
                from: '1m',
              },
              max_signals: 100,
              risk_score: 79,
              output_index: '.siem-signals-default',
              description: 'matches most events',
              from: 'now-360s',
              immutable: false,
              index: [
                'apm-*-transaction*',
                'auditbeat-*',
                'endgame-*',
                'filebeat-*',
                'packetbeat-*',
                'winlogbeat-*',
              ],
              interval: '5m',
              language: 'kuery',
              name: 'matches host.name exists',
              query: 'host.name : *',
              references: ['https://google.com'],
              severity: 'high',
              tags: [
                'host.name exists',
                'for testing',
                '__internal_rule_id:82b2b065-a2ee-49fc-9d6d-781a75c3d280',
                '__internal_immutable:false',
              ],
              type: 'query',
              to: 'now',
              enabled: true,
              filters: [],
              created_by: 'elastic',
              updated_by: 'elastic',
              threat: [
                {
                  framework: 'MITRE ATT&CK',
                  technique: [
                    {
                      reference: 'https://attack.mitre.org/techniques/T1110',
                      name: 'Brute Force',
                      id: 'T1110',
                    },
                    {
                      reference: 'https://attack.mitre.org/techniques/T1098',
                      name: 'Account Manipulation',
                      id: 'T1098',
                    },
                    {
                      reference: 'https://attack.mitre.org/techniques/T1081',
                      name: 'Credentials in Files',
                      id: 'T1081',
                    },
                  ],
                  tactic: {
                    reference: 'https://attack.mitre.org/tactics/TA0006',
                    name: 'Credential Access',
                    id: 'TA0006',
                  },
                },
                {
                  framework: 'MITRE ATT&CK',
                  technique: [
                    {
                      reference: 'https://attack.mitre.org/techniques/T1530',
                      name: 'Data from Cloud Storage Object',
                      id: 'T1530',
                    },
                  ],
                  tactic: {
                    reference: 'https://attack.mitre.org/tactics/TA0009',
                    name: 'Collection',
                    id: 'TA0009',
                  },
                },
              ],
              version: 1,
              created_at: '2020-02-12T19:49:29.417Z',
              updated_at: '2020-02-14T23:15:06.186Z',
            },
            original_event: {
              module: 'system',
              dataset: 'process',
              kind: 'event',
              action: 'process_stopped',
            },
          },
        },
      },
    ],
  },
  aggregations: {
    signalsByGrouping: {
      doc_count_error_upper_bound: 0,
      sum_other_doc_count: 0,
      buckets: [
        {
          key: '79',
          doc_count: 12600,
          signals: {
            buckets: [
              {
                key_as_string: '2020-01-21T04:30:00.000Z',
                key: 1579581000000,
                doc_count: 0,
              },
              {
                key_as_string: '2020-01-22T03:00:00.000Z',
                key: 1579662000000,
                doc_count: 0,
              },
              {
                key_as_string: '2020-01-23T01:30:00.000Z',
                key: 1579743000000,
                doc_count: 0,
              },
              {
                key_as_string: '2020-01-24T00:00:00.000Z',
                key: 1579824000000,
                doc_count: 0,
              },
              {
                key_as_string: '2020-01-24T22:30:00.000Z',
                key: 1579905000000,
                doc_count: 0,
              },
              {
                key_as_string: '2020-01-25T21:00:00.000Z',
                key: 1579986000000,
                doc_count: 0,
              },
              {
                key_as_string: '2020-01-26T19:30:00.000Z',
                key: 1580067000000,
                doc_count: 0,
              },
              {
                key_as_string: '2020-01-27T18:00:00.000Z',
                key: 1580148000000,
                doc_count: 0,
              },
              {
                key_as_string: '2020-01-28T16:30:00.000Z',
                key: 1580229000000,
                doc_count: 0,
              },
              {
                key_as_string: '2020-01-29T15:00:00.000Z',
                key: 1580310000000,
                doc_count: 0,
              },
              {
                key_as_string: '2020-01-30T13:30:00.000Z',
                key: 1580391000000,
                doc_count: 0,
              },
              {
                key_as_string: '2020-01-31T12:00:00.000Z',
                key: 1580472000000,
                doc_count: 0,
              },
              {
                key_as_string: '2020-02-01T10:30:00.000Z',
                key: 1580553000000,
                doc_count: 0,
              },
              {
                key_as_string: '2020-02-02T09:00:00.000Z',
                key: 1580634000000,
                doc_count: 0,
              },
              {
                key_as_string: '2020-02-03T07:30:00.000Z',
                key: 1580715000000,
                doc_count: 0,
              },
              {
                key_as_string: '2020-02-04T06:00:00.000Z',
                key: 1580796000000,
                doc_count: 0,
              },
              {
                key_as_string: '2020-02-05T04:30:00.000Z',
                key: 1580877000000,
                doc_count: 0,
              },
              {
                key_as_string: '2020-02-06T03:00:00.000Z',
                key: 1580958000000,
                doc_count: 0,
              },
              {
                key_as_string: '2020-02-07T01:30:00.000Z',
                key: 1581039000000,
                doc_count: 0,
              },
              {
                key_as_string: '2020-02-08T00:00:00.000Z',
                key: 1581120000000,
                doc_count: 0,
              },
              {
                key_as_string: '2020-02-08T22:30:00.000Z',
                key: 1581201000000,
                doc_count: 0,
              },
              {
                key_as_string: '2020-02-09T21:00:00.000Z',
                key: 1581282000000,
                doc_count: 0,
              },
              {
                key_as_string: '2020-02-10T19:30:00.000Z',
                key: 1581363000000,
                doc_count: 0,
              },
              {
                key_as_string: '2020-02-11T18:00:00.000Z',
                key: 1581444000000,
                doc_count: 0,
              },
              {
                key_as_string: '2020-02-12T16:30:00.000Z',
                key: 1581525000000,
                doc_count: 0,
              },
              {
                key_as_string: '2020-02-13T15:00:00.000Z',
                key: 1581606000000,
                doc_count: 0,
              },
              {
                key_as_string: '2020-02-14T13:30:00.000Z',
                key: 1581687000000,
                doc_count: 12600,
              },
              {
                key_as_string: '2020-02-15T12:00:00.000Z',
                key: 1581768000000,
                doc_count: 0,
              },
              {
                key_as_string: '2020-02-16T10:30:00.000Z',
                key: 1581849000000,
                doc_count: 0,
              },
              {
                key_as_string: '2020-02-17T09:00:00.000Z',
                key: 1581930000000,
                doc_count: 0,
              },
              {
                key_as_string: '2020-02-18T07:30:00.000Z',
                key: 1582011000000,
                doc_count: 0,
              },
              {
                key_as_string: '2020-02-19T06:00:00.000Z',
                key: 1582092000000,
                doc_count: 0,
              },
              {
                key_as_string: '2020-02-20T04:30:00.000Z',
                key: 1582173000000,
                doc_count: 0,
              },
            ],
          },
        },
      ],
    },
  },
};

export const mockSignalsQuery: object = {
  aggs: {
    signalsByGrouping: {
      terms: {
        field: 'signal.rule.risk_score',
        missing: 'All others',
        order: { _count: 'desc' },
        size: 10,
      },
      aggs: {
        signals: {
          date_histogram: {
            field: '@timestamp',
            fixed_interval: '81000000ms',
            min_doc_count: 0,
            extended_bounds: { min: 1579644343954, max: 1582236343955 },
          },
        },
      },
    },
  },
  query: {
    bool: {
      filter: [
        { bool: { must: [], filter: [{ match_all: {} }], should: [], must_not: [] } },
        { range: { '@timestamp': { gte: 1579644343954, lte: 1582236343955 } } },
      ],
    },
  },
};

export const mockStatusSignalQuery: object = {
  bool: {
    filter: {
      terms: { _id: ['b4ee5c32e3a321057edcc953ca17228c6fdfe5ba43fdbbdaffa8cefa11605cc5'] },
    },
  },
};

export const mockSignalIndex: SignalsIndex = {
  name: 'mock-signal-index',
};

export const mockUserPrivilege: Privilege = {
  username: 'elastic',
  has_all_requested: false,
  cluster: {
    monitor_ml: true,
    manage_ccr: true,
    manage_index_templates: true,
    monitor_watcher: true,
    monitor_transform: true,
    read_ilm: true,
    manage_api_key: true,
    manage_security: true,
    manage_own_api_key: false,
    manage_saml: true,
    all: true,
    manage_ilm: true,
    manage_ingest_pipelines: true,
    read_ccr: true,
    manage_rollup: true,
    monitor: true,
    manage_watcher: true,
    manage: true,
    manage_transform: true,
    manage_token: true,
    manage_ml: true,
    manage_pipeline: true,
    monitor_rollup: true,
    transport_client: true,
    create_snapshot: true,
  },
  index: {
    '.siem-signals-default': {
      all: true,
      manage_ilm: true,
      read: true,
      create_index: true,
      read_cross_cluster: true,
      index: true,
      monitor: true,
      delete: true,
      manage: true,
      delete_index: true,
      create_doc: true,
      view_index_metadata: true,
      create: true,
      manage_follow_index: true,
      manage_leader_index: true,
      write: true,
    },
  },
  application: {},
  is_authenticated: true,
  has_encryption_key: true,
};
