/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { Message } from '../messages';

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
