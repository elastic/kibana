/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { Message } from '../messages';

interface AnonymizationRuleBase {
  type: string;
  enabled: boolean;
}

export interface NamedEntityRecognitionRule extends AnonymizationRuleBase {
  type: 'NER';
  modelId: string;
  allowedEntityClasses?: Array<'PER' | 'ORG' | 'LOC' | 'MISC'>;
}
export interface RegexAnonymizationRule extends AnonymizationRuleBase {
  type: 'RegExp';
  pattern: string;
  entityClass: string;
  mask?: RuleMaskType;
}

export type AnonymizationRule = NamedEntityRecognitionRule | RegexAnonymizationRule;

export interface AnonymizationSettings {
  rules: AnonymizationRule[];
}

enum RuleMaskType {
  hash = 'hash',
}

export interface AnonymizationEntity {
  class_name: string;
  value: string;
  mask: string;
}

export interface Anonymization {
  rule: {
    type: string;
  };
  entity: AnonymizationEntity;
}

export interface Deanonymization {
  start: number;
  end: number;
  entity: AnonymizationEntity;
}

export interface AnonymizationOutput {
  messages: Message[];
  anonymizations: Anonymization[];
  system?: string;
}

export interface DeanonymizationOutput {
  messages: DeanonymizedMessage[];
}

export type DeanonymizedMessage = Message & { deanonymizations: Deanonymization[] };
export interface AnonymizationRegexWorkerTaskPayload {
  rule: RegexAnonymizationRule;
  records: Array<Record<string, string>>;
}
