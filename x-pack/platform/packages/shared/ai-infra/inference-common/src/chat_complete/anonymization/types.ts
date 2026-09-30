/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { Message } from '../messages';

type NerEntityClass = 'PER' | 'ORG' | 'LOC' | 'MISC';
export type AnonymizationEntityClass =
  | NerEntityClass
  | 'HOST_NAME'
  | 'USER_NAME'
  | 'IP'
  | 'URL'
  | 'EMAIL'
  | 'CLOUD_ACCOUNT'
  | 'ENTITY_NAME'
  | 'RESOURCE_NAME'
  | 'RESOURCE_ID';

interface AnonymizationRuleBase {
  type: string;
  enabled: boolean;
}

export interface NamedEntityRecognitionRule extends AnonymizationRuleBase {
  type: 'NER';
  /**
   * The Elasticsearch ML model ID to use for NER inference.
   */
  modelId?: string;
  timeoutSeconds?: number;
  allowedEntityClasses?: Array<'PER' | 'ORG' | 'LOC' | 'MISC'>;
}
export interface RegexAnonymizationRule extends AnonymizationRuleBase {
  type: 'RegExp';
  pattern: string;
  entityClass: AnonymizationEntityClass;
  mask?: RuleMaskType;
  /** Stable identifier, used by the management UI to reference a rule (e.g. for edit/delete). */
  id?: string;
  /** Human-readable label shown in the management UI (e.g. "Email addresses"). */
  name?: string;
  /** Whether this rule is an Elastic-maintained default (non-editable pattern) vs. user-authored. */
  builtIn?: boolean;
}

export type AnonymizationRule = NamedEntityRecognitionRule | RegexAnonymizationRule;

/** How the pipeline reacts when anonymization cannot run (e.g. a regex rule fails to compile/execute). */
export type AnonymizationFailureMode = 'block' | 'allow_unsafe';

export interface AnonymizationSettings {
  rules: AnonymizationRule[];
  /** Master switch for the whole anonymization pipeline. Defaults to `false`. */
  maskingEnabled?: boolean;
  /** `block` (default) fails the chatComplete call; `allow_unsafe` proceeds unmasked. */
  onFailure?: AnonymizationFailureMode;
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
  replacementsId?: string;
}

export interface DeanonymizationOutput {
  messages: DeanonymizedMessage[];
}

export type DeanonymizedMessage = Message & { deanonymizations: Deanonymization[] };

/**
 * Anonymization metadata attached to inference responses and events.
 */
export interface AnonymizationResponseMetadata {
  anonymization?: {
    replacementsId?: string;
  };
}

/**
 * Deanonymization data for a single message, pairing the deanonymized message
 * with the positions/entities that were restored.
 */
export interface DeanonymizedMessageData {
  message: Message;
  deanonymizations: Deanonymization[];
}
