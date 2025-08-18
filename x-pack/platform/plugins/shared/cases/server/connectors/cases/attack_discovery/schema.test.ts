/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AttackDiscoveryExpandedAlertSchema, AttackDiscoveryExpandedAlertsSchema } from './schema';

describe('AttackDiscoveryExpandedAlertSchema', () => {
  const getAttackDiscoveryDocument = () => {
    return {
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
    };
  };

  it('accepts valid attack discovery alert document and strips unknown keys', () => {
    expect(AttackDiscoveryExpandedAlertSchema.validate(getAttackDiscoveryDocument()))
      .toMatchInlineSnapshot(`
        Object {
          "_id": "012479c7-bcb6-4945-a6cf-65e40931a156",
          "_index": ".internal.alerts-security.attack.discovery.alerts-default-000001",
          "kibana": Object {
            "alert": Object {
              "attack_discovery": Object {
                "alert_ids": Array [
                  "5dd43c0aa62e75fa7613ae9345384fd402fc9b074a82c89c01c3e8075a4b1e5d",
                  "83047a3ca7e9d852aa48f46fb6329884ed25d5155642c551629402228657ef37",
                  "854da5fb177c06630de28e87bb9c0baeee3143e1fc37f8755d83075af59a22e0",
                ],
                "details_markdown": "- The attack chain spans multiple hosts, including {{ host.name debdbf9b-9e88-442d-8885-7cd6a18fddbc }}.",
                "entity_summary_markdown": "Credential access on {{ host.name debdbf9b-9e88-442d-8885-7cd6a18fddbc }}.",
                "mitre_attack_tactics": Array [
                  "Credential Access",
                  "Lateral Movement",
                  "Defense Evasion",
                ],
                "replacements": Array [
                  Object {
                    "uuid": "3bc96e6a-d2ad-411e-8202-f2c6ee892f5b",
                    "value": "g1thqubmti",
                  },
                  Object {
                    "uuid": "debdbf9b-9e88-442d-8885-7cd6a18fddbc",
                    "value": "Host-7y3d5eahjg",
                  },
                  Object {
                    "uuid": "686626cb-1a91-45b1-ba46-78cc783c2176",
                    "value": "mimzsybazr",
                  },
                ],
                "summary_markdown": "Credential dumping tools like {{ process.name mimikatz.exe }} and {{ process.name lsass.exe }}.",
                "title": "Coordinated credential access across hosts",
              },
              "rule": Object {
                "parameters": Object {
                  "alertsIndexPattern": ".alerts-security.alerts-default",
                },
                "rule_type_id": "attack-discovery",
              },
            },
          },
        }
      `);
  });

  it('throws if attack discovery alert document has unknown fields', () => {
    expect(() =>
      AttackDiscoveryExpandedAlertSchema.validate({
        ...getAttackDiscoveryDocument(),
        field1: 'hello',
        host: { name: 'test1' },
      })
    ).toThrow();
  });

  it('accepts valid array of attack discovery alert documents', () => {
    expect(() =>
      AttackDiscoveryExpandedAlertsSchema.validate([
        getAttackDiscoveryDocument(),
        getAttackDiscoveryDocument(),
        getAttackDiscoveryDocument(),
      ])
    ).not.toThrow();
  });
});
