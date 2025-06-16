/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { groupAttackDiscoveryAlerts } from '.';

describe('groupAttackDiscoveryAlerts', () => {
  const getAttackDiscoveryDocument = () => ({
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
          details_markdown:
            '- The attack chain spans multiple hosts, including {{ host.name debdbf9b-9e88-442d-8885-7cd6a18fddbc }}.',
          entity_summary_markdown:
            'Credential access on {{ host.name debdbf9b-9e88-442d-8885-7cd6a18fddbc }}.',
          mitre_attack_tactics: ['Credential Access', 'Lateral Movement', 'Defense Evasion'],
          replacements: [
            { uuid: '3bc96e6a-d2ad-411e-8202-f2c6ee892f5b', value: 'g1thqubmti' },
            { uuid: 'debdbf9b-9e88-442d-8885-7cd6a18fddbc', value: 'Host-7y3d5eahjg' },
            { uuid: '686626cb-1a91-45b1-ba46-78cc783c2176', value: 'mimzsybazr' },
          ],
          summary_markdown:
            'Credential dumping tools like {{ process.name mimikatz.exe }} and {{ process.name lsass.exe }}.',
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
  });

  it('returns an empty group if there are no alerts', () => {
    expect(groupAttackDiscoveryAlerts([])).toEqual([]);
  });

  it('returns a group for a valid attack discovery alert', () => {
    const doc = getAttackDiscoveryDocument();
    const groups = groupAttackDiscoveryAlerts([doc]);
    expect(groups.length).toEqual(1);
    expect(groups[0].alerts).toEqual([
      {
        _id: '5dd43c0aa62e75fa7613ae9345384fd402fc9b074a82c89c01c3e8075a4b1e5d',
        _index: '.alerts-security.alerts-default',
      },
      {
        _id: '83047a3ca7e9d852aa48f46fb6329884ed25d5155642c551629402228657ef37',
        _index: '.alerts-security.alerts-default',
      },
      {
        _id: '854da5fb177c06630de28e87bb9c0baeee3143e1fc37f8755d83075af59a22e0',
        _index: '.alerts-security.alerts-default',
      },
    ]);
    expect(groups[0].grouping).toEqual({
      attack_discovery: '012479c7-bcb6-4945-a6cf-65e40931a156',
    });
    expect(
      groups[0].comments?.[0].startsWith('## Coordinated credential access across hosts')
    ).toBeTruthy();
    expect(groups[0].title).toEqual('Coordinated credential access across hosts');
  });

  it('returns a group for each valid attack discovery alert', () => {
    const doc1 = getAttackDiscoveryDocument();
    const doc2 = {
      ...getAttackDiscoveryDocument(),
      _id: 'another-id',
      kibana: {
        ...getAttackDiscoveryDocument().kibana,
        alert: {
          ...getAttackDiscoveryDocument().kibana.alert,
          attack_discovery: {
            ...getAttackDiscoveryDocument().kibana.alert.attack_discovery,
            title: 'Another attack',
            alert_ids: ['id1', 'id2'],
          },
        },
      },
    };
    const groups = groupAttackDiscoveryAlerts([doc1, doc2]);
    expect(groups.length).toEqual(2);

    expect(groups[0].alerts).toEqual([
      {
        _id: '5dd43c0aa62e75fa7613ae9345384fd402fc9b074a82c89c01c3e8075a4b1e5d',
        _index: '.alerts-security.alerts-default',
      },
      {
        _id: '83047a3ca7e9d852aa48f46fb6329884ed25d5155642c551629402228657ef37',
        _index: '.alerts-security.alerts-default',
      },
      {
        _id: '854da5fb177c06630de28e87bb9c0baeee3143e1fc37f8755d83075af59a22e0',
        _index: '.alerts-security.alerts-default',
      },
    ]);
    expect(groups[0].grouping).toEqual({
      attack_discovery: '012479c7-bcb6-4945-a6cf-65e40931a156',
    });
    expect(
      groups[0].comments?.[0].startsWith('## Coordinated credential access across hosts')
    ).toBeTruthy();
    expect(groups[0].title).toEqual('Coordinated credential access across hosts');

    expect(groups[1].alerts).toEqual([
      { _id: 'id1', _index: '.alerts-security.alerts-default' },
      { _id: 'id2', _index: '.alerts-security.alerts-default' },
    ]);
    expect(groups[1].grouping).toEqual({ attack_discovery: 'another-id' });
    expect(groups[1].comments?.[0].startsWith('## Another attack')).toBeTruthy();
    expect(groups[1].title).toEqual('Another attack');
  });

  it('throws if input does not comply with `AttackDiscoveryExpandedAlertsSchema`', () => {
    const invalidAlerts = [{ _id: '1', _index: 'alerts' }];
    expect(() => groupAttackDiscoveryAlerts(invalidAlerts)).toThrow(
      '[0.kibana.alert.attack_discovery.alert_ids]: expected value of type [array] but got [undefined]'
    );
  });
});
