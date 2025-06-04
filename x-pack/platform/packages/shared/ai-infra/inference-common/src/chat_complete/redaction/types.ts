/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Message } from '../messages';

interface RedactionRuleBase {
  type: string;
  enabled: boolean;
}

enum RuleMaskType {
  hash = 'hash',
}

export interface NamedEntityRecognitionRule extends RedactionRuleBase {
  type: 'NER';
}

export interface RegExpRule extends RedactionRuleBase {
  type: 'RegExp';
  pattern: string;
  class_name: string;
  mask?: RuleMaskType;
}

export type RedactionRule = NamedEntityRecognitionRule | RegExpRule;

export interface RedactionConfiguration {
  enabled: boolean;
  rules: RedactionRule[];
}

export interface RedactionEntity {
  class_name: string;
  value: string;
  mask: string;
}

export interface Redaction {
  rule: {
    type: string;
  };
  entity: RedactionEntity;
}

export interface Unredaction {
  start: number;
  end: number;
  entity: RedactionEntity;
}

export interface RedactionOutput {
  messages: Message[];
  redactions: Redaction[];
}

export interface UnredactionOutput {
  messages: UnredactedMessage[];
}

export type UnredactedMessage = Message & { unredactions: Unredaction[] };
