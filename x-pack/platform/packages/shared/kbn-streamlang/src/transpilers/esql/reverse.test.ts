/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { esqlToStreamlangProcessors, esqlToStreamlangSteps } from './reverse';
import type {
  GrokProcessor,
  DissectProcessor,
  SetProcessor,
  DateProcessor,
  RenameProcessor,
} from '../../../types/processors';

describe('ES|QL to Streamlang Reverse Translation', () => {
  describe('esqlToStreamlangProcessors', () => {
    describe('WHERE conditions', () => {
      it('should attach WHERE condition to subsequent processors', () => {
        const query = `WHERE host.name == "host-1" | GROK message "%{IP:client_ip}"`;
        const processors = esqlToStreamlangProcessors(query);
        
        expect(processors).toHaveLength(1);
        expect(processors[0]).toMatchObject({
          action: 'grok',
          from: 'message',
          patterns: ['%{IP:client_ip}'],
          where: { field: 'host.name', eq: 'host-1' },
        });
      });

      it('should compound multiple WHERE conditions with AND', () => {
        const query = `WHERE host.name == "host-1" | WHERE status == "active" | GROK message "%{IP:client_ip}"`;
        const processors = esqlToStreamlangProcessors(query);
        
        expect(processors).toHaveLength(1);
        expect(processors[0]).toMatchObject({
          action: 'grok',
          from: 'message',
          patterns: ['%{IP:client_ip}'],
          where: {
            and: [
              { field: 'host.name', eq: 'host-1' },
              { field: 'status', eq: 'active' },
            ],
          },
        });
      });
    });

    describe('GROK processor', () => {
      it('should convert GROK command to grok processor', () => {
        const query = `GROK body.text "%{IP:client_ip} %{WORD:method}"`;
        const processors = esqlToStreamlangProcessors(query);
        
        expect(processors).toHaveLength(1);
        const grok = processors[0] as GrokProcessor;
        expect(grok).toMatchObject({
          action: 'grok',
          from: 'body.text',
          patterns: ['%{IP:client_ip} %{WORD:method}'],
        });
      });

      it('should handle GROK with escaped quotes in pattern', () => {
        const query = `GROK message "\\"quoted\\" %{WORD:field}"`;
        const processors = esqlToStreamlangProcessors(query);
        
        expect(processors).toHaveLength(1);
        expect(processors[0]).toMatchObject({
          action: 'grok',
          from: 'message',
          patterns: ['"quoted" %{WORD:field}'],
        });
      });
    });

    describe('DISSECT processor', () => {
      it('should convert DISSECT command to dissect processor', () => {
        const query = `DISSECT message "%{timestamp} %{+timestamp} %{+timestamp} [%{loglevel}] %{message}"`;
        const processors = esqlToStreamlangProcessors(query);
        
        expect(processors).toHaveLength(1);
        const dissect = processors[0] as DissectProcessor;
        expect(dissect).toMatchObject({
          action: 'dissect',
          from: 'message',
          pattern: '%{timestamp} %{+timestamp} %{+timestamp} [%{loglevel}] %{message}',
        });
      });
    });

    describe('EVAL processors', () => {
      it('should convert EVAL literal assignment to set processor', () => {
        const query = `EVAL service.name = "ftpd"`;
        const processors = esqlToStreamlangProcessors(query);
        
        expect(processors).toHaveLength(1);
        const set = processors[0] as SetProcessor;
        expect(set).toMatchObject({
          action: 'set',
          to: 'service.name',
          value: 'ftpd',
        });
      });

      it('should convert EVAL copy assignment to set processor with copy_from', () => {
        const query = `EVAL target_field = source_field`;
        const processors = esqlToStreamlangProcessors(query);
        
        expect(processors).toHaveLength(1);
        const set = processors[0] as SetProcessor;
        expect(set).toMatchObject({
          action: 'set',
          to: 'target_field',
          copy_from: 'source_field',
        });
      });

      it('should convert EVAL with DATE_PARSE to date processor', () => {
        const query = `EVAL timestamp = DATE_PARSE(date_string, "yyyy-MM-dd'T'HH:mm:ss'Z'")`;
        const processors = esqlToStreamlangProcessors(query);
        
        expect(processors).toHaveLength(1);
        const date = processors[0] as DateProcessor;
        expect(date).toMatchObject({
          action: 'date',
          from: 'date_string',
          to: 'timestamp',
          formats: ["yyyy-MM-dd'T'HH:mm:ss'Z'"],
        });
      });

      it('should handle multiple EVAL assignments', () => {
        const query = `EVAL a = "x", b = c, timestamp = DATE_PARSE(d, "yyyy-MM-dd")`;
        const processors = esqlToStreamlangProcessors(query);
        
        expect(processors).toHaveLength(3);
        expect(processors[0]).toMatchObject({
          action: 'set',
          to: 'a',
          value: 'x',
        });
        expect(processors[1]).toMatchObject({
          action: 'set',
          to: 'b',
          copy_from: 'c',
        });
        expect(processors[2]).toMatchObject({
          action: 'date',
          from: 'd',
          to: 'timestamp',
          formats: ['yyyy-MM-dd'],
        });
      });

      it('should handle numeric literal assignments', () => {
        const query = `EVAL count = 42, active = true`;
        const processors = esqlToStreamlangProcessors(query);
        
        expect(processors).toHaveLength(2);
        expect(processors[0]).toMatchObject({
          action: 'set',
          to: 'count',
          value: 42,
        });
        expect(processors[1]).toMatchObject({
          action: 'set',
          to: 'active',
          value: true,
        });
      });
    });

    describe('RENAME processor', () => {
      it('should convert RENAME command to rename processor', () => {
        const query = `RENAME old_field AS new_field`;
        const processors = esqlToStreamlangProcessors(query);
        
        expect(processors).toHaveLength(1);
        const rename = processors[0] as RenameProcessor;
        expect(rename).toMatchObject({
          action: 'rename',
          from: 'old_field',
          to: 'new_field',
        });
      });

      it('should handle multiple RENAME assignments', () => {
        const query = `RENAME a AS b, x AS y`;
        const processors = esqlToStreamlangProcessors(query);
        
        expect(processors).toHaveLength(2);
        expect(processors[0]).toMatchObject({
          action: 'rename',
          from: 'a',
          to: 'b',
        });
        expect(processors[1]).toMatchObject({
          action: 'rename',
          from: 'x',
          to: 'y',
        });
      });
    });

    describe('Complex queries', () => {
      it('should handle complex query with multiple commands and WHERE', () => {
        const query = `
          WHERE host.name == "host-1" 
          | GROK body.text "%{IP:client_ip}" 
          | EVAL service.name = "ftpd"
          | RENAME client_ip AS ip_address
        `;
        const processors = esqlToStreamlangProcessors(query);
        
        expect(processors).toHaveLength(3);
        
        // All processors should have the WHERE condition
        const expectedWhere = { field: 'host.name', eq: 'host-1' };
        
        expect(processors[0]).toMatchObject({
          action: 'grok',
          where: expectedWhere,
        });
        expect(processors[1]).toMatchObject({
          action: 'set',
          where: expectedWhere,
        });
        expect(processors[2]).toMatchObject({
          action: 'rename',
          where: expectedWhere,
        });
      });
    });

    describe('Edge cases', () => {
      it('should handle empty query', () => {
        const processors = esqlToStreamlangProcessors('');
        expect(processors).toHaveLength(0);
      });

      it('should handle query with only WHERE', () => {
        const processors = esqlToStreamlangProcessors('WHERE field == "value"');
        expect(processors).toHaveLength(0);
      });

      it('should ignore unsupported commands', () => {
        const query = `FROM logs | LIMIT 10 | GROK message "%{IP:ip}"`;
        const processors = esqlToStreamlangProcessors(query);
        
        expect(processors).toHaveLength(1);
        expect(processors[0]).toMatchObject({
          action: 'grok',
          from: 'message',
        });
      });
    });
  });

  describe('esqlToStreamlangSteps', () => {
    it('should convert WHERE-only query to top-level where block', () => {
      const query = `WHERE host.name == "host-1"`;
      const steps = esqlToStreamlangSteps(query);
      
      expect(steps).toHaveLength(1);
      expect(steps[0]).toMatchObject({
        where: {
          field: 'host.name',
          eq: 'host-1',
          steps: [],
        },
      });
    });

    it('should produce same processor results as esqlToStreamlangProcessors', () => {
      const query = `WHERE status == "active" | GROK message "%{IP:ip}" | EVAL processed = true`;
      
      const processors = esqlToStreamlangProcessors(query);
      const steps = esqlToStreamlangSteps(query);
      
      expect(steps).toHaveLength(processors.length);
      
      steps.forEach((step, i) => {
        expect(step).toMatchObject(processors[i]);
      });
    });
  });
});

