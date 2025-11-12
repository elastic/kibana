/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Condition } from '../../../../types/conditions';
import type { ProcessorBase } from '../../../../types/processors';
import { convertConditionToOTTL } from '../condition_to_ottl';
import type { OTTLStatement } from '../types';

export interface ProcessorConverterContext {
  streamName: string;
  processorIndex: number;
}

export interface ProcessorConversionResult {
  statements: OTTLStatement[];
  // Optional: if processor needs dedicated transform processor
  dedicatedProcessor?: {
    name: string;
    config: any;
  };
}

/**
 * Base class for OTTL processor converters
 */
export abstract class OTTLProcessorConverter<T extends ProcessorBase> {
  abstract convert(processor: T, context: ProcessorConverterContext): ProcessorConversionResult;

  /**
   * Wraps OTTL statements with an optional condition
   */
  protected wrapWithCondition(statements: string[], condition?: Condition): OTTLStatement {
    if (!condition) {
      return {
        context: 'log',
        statements,
      };
    }

    return {
      context: 'log',
      conditions: [convertConditionToOTTL(condition)],
      statements,
    };
  }

  /**
   * Creates multiple OTTL statements with optional conditions
   */
  protected createStatements(
    statementGroups: Array<{ statements: string[]; conditions?: string[] }>
  ): OTTLStatement[] {
    return statementGroups.map((group) => ({
      context: 'log' as const,
      ...(group.conditions ? { conditions: group.conditions } : {}),
      statements: group.statements,
    }));
  }
}
