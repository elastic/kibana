/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AttackDiscoveryExpandedAlerts } from './types';

export const attackDiscoveryAlerts: AttackDiscoveryExpandedAlerts = [
  {
    _id: '012479c7-bcb6-4945-a6cf-65e40931a156',
    _index: '.internal.alerts-security.attack.discovery.alerts-default-000001',
    kibana: {
      alert: {
        attack_discovery: {
          alert_ids: [
            '5dd43c0aa62e75fa7613ae9345384fd402fc9b074a82c89c01c3e8075a4b1e5d',
            '83047a3ca7e9d852aa48f46fb6329884ed25d5155642c551629402228657ef37',
            '854da5fb177c06630de28e87bb9c0baeee3143e1fc37f8755d83075af59a22e0',
          ],
          details_markdown: `- The attack chain spans multiple hosts, including {{ host.name debdbf9b-9e88-442d-8885-7cd6a18fddbc }}.`,
          entity_summary_markdown: `Credential access on {{ host.name debdbf9b-9e88-442d-8885-7cd6a18fddbc }}.`,
          mitre_attack_tactics: ['Credential Access', 'Lateral Movement', 'Defense Evasion'],
          replacements: [
            { uuid: '3bc96e6a-d2ad-411e-8202-f2c6ee892f5b', value: 'g1thqubmti' },
            { uuid: 'debdbf9b-9e88-442d-8885-7cd6a18fddbc', value: 'Host-7y3d5eahjg' },
            { uuid: '686626cb-1a91-45b1-ba46-78cc783c2176', value: 'mimzsybazr' },
          ],
          summary_markdown: `Credential dumping tools like {{ process.name mimikatz.exe }} and {{ process.name lsass.exe }}.`,
          title: 'Coordinated credential access across hosts',
        },
        rule: {
          parameters: {
            alertsIndexPattern: '.alerts-security.alerts-default',
          },
          rule_type_id: 'attack-discovery',
        },
      },
    },
  },
  {
    _id: 'ee0f98c7-6a0d-4a87-ad15-4128daf53c84',
    _index: '.internal.alerts-security.attack.discovery.alerts-default-000002',
    kibana: {
      alert: {
        attack_discovery: {
          alert_ids: [
            '2a15777907cd95ec65a97a505c3d522c0342ae4d3bf2aee610e5ab72bdb5825a',
            '4a61c1e09acad151735ad557cf45f8c08bea2ac668e346f86af92de35c79a505',
          ],
          details_markdown: `This attack chain spans multiple hosts and platforms, with strong evidence linking the events.`,
          entity_summary_markdown: `Malware and suspicious activity on {{ host.name a83cddca-0560-4ca8-bd1e-9f1591ac9253 }}, {{ host.name fa52a0b7-799f-4f4f-948e-9c182dec12b6 }}.`,
          mitre_attack_tactics: ['Initial Access', 'Execution'],
          replacements: [
            { uuid: '4663c6e2-6812-4867-b2e5-78f9b5b0c18e', value: 'fze61k1ys8' },
            { uuid: '483e2e72-7a56-41aa-9eb0-d760d038e488', value: 'Host-zc6tlnwgdd' },
          ],
          summary_markdown: `Coordinated multi-host attack: malware, credential access, and suspicious binaries on {{ host.name a83cddca-0560-4ca8-bd1e-9f1591ac9253 }}, {{ host.name fa52a0b7-799f-4f4f-948e-9c182dec12b6 }}.`,
          title: 'Coordinated multi-host malware campaign',
        },
        rule: {
          parameters: {
            alertsIndexPattern: '.alerts-security.alerts-default',
          },
          rule_type_id: 'attack-discovery',
        },
      },
    },
  },
];
