/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  BUILT_IN_ENTITY_TYPES,
  BUILT_IN_RELATIONSHIP_TYPES,
  canonicalEntityTypeId,
  KNOWN_EUI_ICONS,
  normalizeEntityType,
} from './built_in_types';
import { impactMapEntityTypeSchema, impactMapRelationshipTypeSchema } from './impact_map';

describe('built-in types', () => {
  it('are valid, unique and use only icons EUI has', () => {
    const ids = BUILT_IN_ENTITY_TYPES.map(({ id }) => id);
    expect(new Set(ids).size).toBe(ids.length);
    BUILT_IN_ENTITY_TYPES.forEach((type) => {
      expect(impactMapEntityTypeSchema.safeParse(type).success).toBe(true);
      if (type.icon?.eui_icon) {
        expect(KNOWN_EUI_ICONS).toContain(type.icon.eui_icon);
      }
    });
    BUILT_IN_RELATIONSHIP_TYPES.forEach((type) => {
      expect(impactMapRelationshipTypeSchema.safeParse(type).success).toBe(true);
    });
  });

  it('keep every Kubernetes object infrastructure with the Kubernetes logo', () => {
    BUILT_IN_ENTITY_TYPES.filter(({ id }) => id.startsWith('k8s_')).forEach((type) => {
      expect(type.kind).toBe('infrastructure');
      expect(type.icon?.eui_icon).toBe('logoKubernetes');
    });
  });
});

describe('normalizeEntityType', () => {
  it('fixes the case of an icon EUI has and drops one it does not', () => {
    expect(
      normalizeEntityType({
        id: 'gcp_vm',
        label: 'VM',
        kind: 'infrastructure',
        icon: { eui_icon: 'logoGcp' },
      }).icon
    ).toEqual({ eui_icon: 'logoGCP' });
    expect(
      normalizeEntityType({
        id: 'thing',
        label: 'Thing',
        kind: 'infrastructure',
        icon: { eui_icon: 'logoGolang', span_type: 'db' },
      }).icon
    ).toEqual({ span_type: 'db' });
  });

  it('moves an old service type that is really Kubernetes to infrastructure', () => {
    expect(
      normalizeEntityType({
        id: 'k8s_deployment',
        label: 'K8s deployment',
        kind: 'service',
        icon: { eui_icon: 'logoKubernetes' },
      }).kind
    ).toBe('infrastructure');
    expect(
      normalizeEntityType({ id: 'go', label: 'Go', kind: 'service', icon: { agent_name: 'go' } })
        .kind
    ).toBe('service');
  });
});

describe('OpenTelemetry-based types', () => {
  it('has a type for each Kubernetes entity in our OTel data, keyed by its OTel attributes', () => {
    const byId = new Map(BUILT_IN_ENTITY_TYPES.map((type) => [type.id, type]));
    [
      'cluster',
      'namespace',
      'node',
      'deployment',
      'statefulset',
      'daemonset',
      'replicaset',
      'pod',
    ].forEach((object) => {
      const keys = byId.get(`k8s.${object}`)?.metadata_fields?.map(({ key }) => key);
      expect(keys).toContain(`k8s.${object}.name`);
      expect(new Set(keys).size).toBe(keys?.length);
    });
    // A deployment is found by its cluster and namespace, so they lead.
    expect(
      byId
        .get('k8s.deployment')
        ?.metadata_fields?.filter(({ featured }) => featured)
        .map(({ key }) => key)
    ).toEqual(['k8s.cluster.name', 'k8s.namespace.name']);
  });

  it('reads the ids used before as the OpenTelemetry ones', () => {
    expect(canonicalEntityTypeId('k8s_deployment')).toBe('k8s.deployment');
    expect(canonicalEntityTypeId('postgresql')).toBe('db.postgresql');
    expect(canonicalEntityTypeId('something_new')).toBe('something_new');
  });
});
