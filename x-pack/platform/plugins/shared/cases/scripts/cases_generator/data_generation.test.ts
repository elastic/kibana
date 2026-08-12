/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CaseSeverity } from '../../common';
import {
  buildCaseRequest,
  generateObservabilityAlert,
  generateProcessEvent,
  generateSecurityAlert,
  getAlertsIndex,
  getEventsIndex,
} from './data_generation';
import { AUTO_GENERATED_TAG, installSeededRandom } from './utils';

describe('data_generation', () => {
  describe('getAlertsIndex', () => {
    it('routes observability alerts to the metrics index', () => {
      expect(getAlertsIndex('observability', 'analytics-1')).toBe(
        '.alerts-observability.metrics.alerts-analytics-1'
      );
    });

    it('routes other owners to the security alerts index', () => {
      expect(getAlertsIndex('securitySolution', 'analytics-1')).toBe(
        '.alerts-security.alerts-analytics-1'
      );
      expect(getAlertsIndex('cases', 'analytics-1')).toBe('.alerts-security.alerts-analytics-1');
    });

    it('falls back to the "default" space ID when none is provided', () => {
      expect(getAlertsIndex('securitySolution', '')).toBe('.alerts-security.alerts-default');
      expect(getAlertsIndex('observability', '')).toBe(
        '.alerts-observability.metrics.alerts-default'
      );
    });
  });

  describe('getEventsIndex', () => {
    it('returns the endpoint process events data stream', () => {
      expect(getEventsIndex()).toBe('logs-endpoint.events.process-default');
    });
  });

  describe('generateSecurityAlert', () => {
    it('emits the fields required by the security alerts mapping', () => {
      const restore = installSeededRandom('sec-alert-shape');
      try {
        const alert = generateSecurityAlert(0, { space: 'analytics-1', kibanaVersion: '9.2.0' });

        expect(alert._id).toMatch(/^[0-9a-f-]+$/);
        expect(alert.ruleId).toMatch(/^[0-9a-f-]+$/);
        expect(alert.ruleName).toBe('Generated Rule 1');
        expect(alert._source['kibana.alert.uuid']).toBe(alert._id);
        expect(alert._source['kibana.alert.rule.uuid']).toBe(alert.ruleId);
        expect(alert._source['kibana.alert.rule.rule_id']).toBe(alert.ruleId);
        expect(alert._source['kibana.alert.rule.rule_type_id']).toBe('siem.queryRule');
        expect(alert._source['kibana.alert.rule.consumer']).toBe('siem');
        expect(alert._source['kibana.alert.rule.producer']).toBe('siem');
        expect(['low', 'medium', 'high', 'critical']).toContain(
          alert._source['kibana.alert.severity']
        );
        expect(alert._source['kibana.alert.risk_score']).toBeGreaterThanOrEqual(0);
        expect(alert._source['kibana.alert.risk_score']).toBeLessThan(100);
        expect(alert._source['kibana.space_ids']).toEqual(['analytics-1']);
        expect(alert._source['kibana.version']).toBe('9.2.0');
      } finally {
        restore();
      }
    });

    it('uses "default" as the space ID when none is provided', () => {
      const restore = installSeededRandom('sec-alert-default');
      try {
        const alert = generateSecurityAlert(0, { space: '', kibanaVersion: '9.2.0' });
        expect(alert._source['kibana.space_ids']).toEqual(['default']);
      } finally {
        restore();
      }
    });

    it('numbers rule names from the supplied counter (1-based)', () => {
      const restore = installSeededRandom('sec-alert-counter');
      try {
        const alert = generateSecurityAlert(4, { space: '', kibanaVersion: '9.2.0' });
        expect(alert.ruleName).toBe('Generated Rule 5');
        expect(alert._source['kibana.alert.rule.name']).toBe('Generated Rule 5');
      } finally {
        restore();
      }
    });

    it('produces a unique alertId/ruleId per invocation', () => {
      const restore = installSeededRandom('sec-alert-unique');
      try {
        const a = generateSecurityAlert(0, { space: '', kibanaVersion: '9.2.0' });
        const b = generateSecurityAlert(1, { space: '', kibanaVersion: '9.2.0' });
        expect(a._id).not.toBe(b._id);
        expect(a.ruleId).not.toBe(b.ruleId);
      } finally {
        restore();
      }
    });

    it('is deterministic when the same seed is installed', () => {
      const seed = 'sec-alert-deterministic';
      const restoreA = installSeededRandom(seed);
      const a = generateSecurityAlert(0, { space: 'analytics-1', kibanaVersion: '9.2.0' });
      restoreA();

      const restoreB = installSeededRandom(seed);
      const b = generateSecurityAlert(0, { space: 'analytics-1', kibanaVersion: '9.2.0' });
      restoreB();

      // UUIDs are not derived from the seeded RNG (they use uuidv4 directly),
      // but everything driven by `pick`/`rng` should be identical.
      expect(a._source['kibana.alert.severity']).toBe(b._source['kibana.alert.severity']);
      expect(a._source['kibana.alert.risk_score']).toBe(b._source['kibana.alert.risk_score']);
      expect(a._source['kibana.alert.reason']).toBe(b._source['kibana.alert.reason']);
    });
  });

  describe('generateObservabilityAlert', () => {
    it('emits a metrics-style observability alert', () => {
      const restore = installSeededRandom('obs-alert-shape');
      try {
        const alert = generateObservabilityAlert(0, {
          space: 'analytics-2',
          kibanaVersion: '9.2.0',
        });

        expect(alert._id).toMatch(/^[0-9a-f-]+$/);
        expect(alert.ruleId).toMatch(/^[0-9a-f-]+$/);
        expect(alert._source['kibana.alert.rule.rule_type_id']).toMatch(/^metrics\.alert\./);
        expect(alert._source['kibana.alert.rule.producer']).toBe('infrastructure');
        expect(alert._source['kibana.alert.rule.consumer']).toBe('infrastructure');
        expect(alert._source['kibana.alert.action_group']).toBe('metrics.threshold.fired');
        expect(['warning', 'critical']).toContain(alert._source['kibana.alert.severity']);
        expect(alert._source['kibana.alert.flapping']).toBe(false);
        expect(alert._source['event.kind']).toBe('signal');
        expect(alert._source['event.action']).toBe('active');
        expect(alert._source['kibana.space_ids']).toEqual(['analytics-2']);
        expect(alert._source['kibana.version']).toBe('9.2.0');
        expect(typeof alert._source['kibana.alert.evaluation.value']).toBe('number');
        expect(typeof alert._source['kibana.alert.evaluation.threshold']).toBe('number');
      } finally {
        restore();
      }
    });

    it('uses "default" as the space ID when none is provided', () => {
      const restore = installSeededRandom('obs-alert-default-space');
      try {
        const alert = generateObservabilityAlert(0, { space: '', kibanaVersion: '9.2.0' });
        expect(alert._source['kibana.space_ids']).toEqual(['default']);
      } finally {
        restore();
      }
    });

    it('numbers rule names from the supplied counter (1-based)', () => {
      const restore = installSeededRandom('obs-alert-counter');
      try {
        const alert = generateObservabilityAlert(2, { space: '', kibanaVersion: '9.2.0' });
        expect(alert.ruleName).toMatch(/Rule 3$/);
      } finally {
        restore();
      }
    });
  });

  describe('generateProcessEvent', () => {
    it('emits a process event with the expected ECS shape', () => {
      const restore = installSeededRandom('proc-event-shape');
      try {
        const event = generateProcessEvent({ space: '', kibanaVersion: '9.2.0' });

        expect(event['@timestamp']).toMatch(/^\d{4}-\d{2}-\d{2}T/);
        expect(event.event.dataset).toBe('process');
        expect(event.event.kind).toBe('event');
        expect(event.event.module).toBe('system');
        expect(event.event.category).toEqual(['process']);
        expect(event.data_stream).toEqual({
          type: 'logs',
          dataset: 'endpoint.events.process',
          namespace: 'default',
        });
        expect(event.process.pid).toBeGreaterThanOrEqual(1);
        expect(event.process.pid).toBeLessThanOrEqual(65535);
        expect(event.process.ppid).toBeGreaterThanOrEqual(1);
        expect(event.process.ppid).toBeLessThanOrEqual(65535);
        expect(event.agent.version).toBe('9.2.0');
        expect(['auditbeat', 'endpoint']).toContain(event.agent.type);
      } finally {
        restore();
      }
    });
  });

  describe('buildCaseRequest', () => {
    it('produces a CasePostRequest carrying the auto-generated tag', () => {
      const restore = installSeededRandom('case-request-shape');
      try {
        const req = buildCaseRequest(7, 'securitySolution', 'abc123');

        expect(req.title).toBe('[securitySolution] Sample Case abc123-7');
        expect(req.description).toBe(
          'Auto generated case 7 (request abc123, owner securitySolution)'
        );
        expect(req.owner).toBe('securitySolution');
        expect(req.tags).toContain(AUTO_GENERATED_TAG);
        expect(req.assignees).toEqual([]);
        expect(req.customFields).toEqual([]);
        expect(req.connector).toEqual({
          id: 'none',
          name: 'none',
          type: '.none',
          fields: null,
        });
        expect(req.settings).toEqual({ syncAlerts: false, extractObservables: false });
        expect([
          CaseSeverity.LOW,
          CaseSeverity.MEDIUM,
          CaseSeverity.HIGH,
          CaseSeverity.CRITICAL,
        ]).toContain(req.severity);
      } finally {
        restore();
      }
    });

    it('falls back to the "cases" owner when none is supplied', () => {
      const restore = installSeededRandom('case-request-fallback');
      try {
        const req = buildCaseRequest(1, undefined as unknown as string, 'r1');
        expect(req.owner).toBe('cases');
      } finally {
        restore();
      }
    });

    it('produces identical output for the same seed', () => {
      const seed = 'case-request-deterministic';
      const restoreA = installSeededRandom(seed);
      const a = buildCaseRequest(3, 'cases', 'reqid');
      restoreA();

      const restoreB = installSeededRandom(seed);
      const b = buildCaseRequest(3, 'cases', 'reqid');
      restoreB();

      expect(a).toEqual(b);
    });

    it('passes through legacy customFields when supplied via options', () => {
      const restore = installSeededRandom('case-request-legacy-cf');
      try {
        const req = buildCaseRequest(1, 'cases', 'r1', null, {
          legacyCustomFieldValues: [
            { key: 'incident_summary', type: 'text', value: 'manual-summary' },
            { key: 'requires_postmortem', type: 'toggle', value: true },
            { key: 'sla_minutes', type: 'number', value: 60 },
          ],
        });
        expect(req.customFields).toHaveLength(3);
        expect(req.customFields).toEqual(
          expect.arrayContaining([
            expect.objectContaining({ key: 'incident_summary', type: 'text' }),
            expect.objectContaining({ key: 'requires_postmortem', type: 'toggle', value: true }),
            expect.objectContaining({ key: 'sla_minutes', type: 'number', value: 60 }),
          ])
        );
      } finally {
        restore();
      }
    });
  });
});
