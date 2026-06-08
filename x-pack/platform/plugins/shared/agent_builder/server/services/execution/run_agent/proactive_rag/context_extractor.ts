/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHash } from 'crypto';
import type { Conversation, ConversationRound } from '@kbn/agent-builder-common';
import { isToolCallStep } from '@kbn/agent-builder-common';
import type { ExtractedContext } from './types';

/**
 * Extracts searchable context from a conversation.
 * Uses heuristics to identify topics, entities, and user intent.
 */
export const extractContext = (conversation: Conversation): ExtractedContext => {
  const rounds = conversation.rounds ?? [];

  const topics = extractTopics(rounds);
  const entities = extractEntities(rounds);
  const recentQuestions = extractRecentQuestions(rounds);
  const userIntent = inferUserIntent(rounds);
  const toolResultTopics = extractFromToolResults(rounds);

  const allTopics = [...new Set([...topics, ...toolResultTopics])].slice(0, 15);

  const contextString = [...allTopics, ...entities, ...recentQuestions, userIntent].join('|');

  const hash = createHash('sha256').update(contextString).digest('hex').substring(0, 16);

  return {
    topics: allTopics,
    entities,
    recentQuestions,
    userIntent,
    hash,
  };
};

/**
 * Extract context from in-progress tool results (actions array from graph state).
 * This allows discovering relevant context from tool outputs mid-execution.
 */
export const extractContextFromActions = (
  conversation: Conversation,
  actionResults: string[]
): ExtractedContext => {
  const baseContext = extractContext(conversation);

  const actionTopics = extractTopicsFromText(actionResults.join(' '));
  const actionEntities = extractEntitiesFromText(actionResults.join(' '));

  const allTopics = [...new Set([...baseContext.topics, ...actionTopics])].slice(0, 15);
  const allEntities = [...new Set([...baseContext.entities, ...actionEntities])].slice(0, 15);

  const contextString = [
    ...allTopics,
    ...allEntities,
    ...baseContext.recentQuestions,
    baseContext.userIntent,
  ].join('|');

  const hash = createHash('sha256').update(contextString).digest('hex').substring(0, 16);

  return {
    topics: allTopics,
    entities: allEntities,
    recentQuestions: baseContext.recentQuestions,
    userIntent: baseContext.userIntent,
    hash,
  };
};

/**
 * Build a search query from extracted context.
 */
export const buildSearchQuery = (context: ExtractedContext): string => {
  const parts: string[] = [];

  if (context.userIntent) {
    parts.push(context.userIntent);
  }

  if (context.topics.length > 0) {
    parts.push(context.topics.slice(0, 3).join(' '));
  }

  if (context.entities.length > 0) {
    parts.push(context.entities.slice(0, 3).join(' '));
  }

  if (context.recentQuestions.length > 0) {
    parts.push(context.recentQuestions[0]);
  }

  return parts.join(' ').trim().substring(0, 500);
};

const extractTopics = (rounds: ConversationRound[]): string[] => {
  const topics = new Set<string>();
  const recentRounds = rounds.slice(-5);

  for (const round of recentRounds) {
    const message = round.input?.message ?? '';
    const extracted = extractTopicsFromText(message);
    extracted.forEach((t) => topics.add(t));
  }

  return Array.from(topics).slice(0, 10);
};

const extractTopicsFromText = (text: string): string[] => {
  const topicPatterns = [
    /(?:about|regarding|concerning|related to)\s+([^,.?!]+)/gi,
    /(?:how to|what is|explain)\s+([^,.?!]+)/gi,
    /(?:issue with|problem with|error in)\s+([^,.?!]+)/gi,
  ];

  const topics = new Set<string>();

  for (const pattern of topicPatterns) {
    const matches = text.matchAll(pattern);
    for (const match of matches) {
      const topic = match[1]?.trim().toLowerCase();
      if (topic && topic.length > 2 && topic.length < 50) {
        topics.add(topic);
      }
    }
  }

  const words = text.toLowerCase().split(/\s+/);
  const technicalTerms = words.filter(
    (word) => /^[a-z][-a-z0-9_.]*[a-z0-9]$/.test(word) && word.length > 3
  );
  for (const term of technicalTerms.slice(0, 10)) {
    topics.add(term);
  }

  const errorCodePatterns = [/\b(PSE-\d+)\b/gi, /\b(ERR[_-]?\d+)\b/gi, /\b([A-Z]{2,5}-\d{3,})\b/g];
  for (const pattern of errorCodePatterns) {
    const matches = text.matchAll(pattern);
    for (const match of matches) {
      topics.add(match[1].toUpperCase());
    }
  }

  return Array.from(topics);
};

const extractEntities = (rounds: ConversationRound[]): string[] => {
  const entities = new Set<string>();
  const recentRounds = rounds.slice(-5);

  for (const round of recentRounds) {
    const message = round.input?.message ?? '';
    const response = round.response?.message ?? '';
    const combined = `${message} ${response}`;
    const extracted = extractEntitiesFromText(combined);
    extracted.forEach((e) => entities.add(e));
  }

  return Array.from(entities).slice(0, 10);
};

const extractEntitiesFromText = (text: string): string[] => {
  const entityPatterns = [
    /\b([a-z][-a-z0-9]*(?:[-_][a-z0-9]+)+)\b/gi,
    /\b(service|host|pod|container|namespace|index|stream)[-_:]?([a-z0-9][-a-z0-9]*)/gi,
    /\b([a-z]+(?:Service|Manager|Client|Handler|Controller))\b/g,
    /\b(redis|postgres|mysql|mongodb|kafka|rabbitmq|elasticsearch)\b/gi,
    /\b(checkout|payment|cart|inventory|shipping|order)\b/gi,
  ];

  const entities = new Set<string>();

  for (const pattern of entityPatterns) {
    const matches = text.matchAll(pattern);
    for (const match of matches) {
      const entity = (match[2] ? `${match[1]}-${match[2]}` : match[1])?.toLowerCase();
      if (entity && entity.length > 2 && entity.length < 50) {
        entities.add(entity);
      }
    }
  }

  return Array.from(entities);
};

const extractFromToolResults = (rounds: ConversationRound[]): string[] => {
  const topics = new Set<string>();
  const recentRounds = rounds.slice(-3);

  for (const round of recentRounds) {
    const steps = round.steps ?? [];
    for (const step of steps) {
      if (isToolCallStep(step)) {
        for (const result of step.results ?? []) {
          const resultText = extractTextFromToolResult(result);

          const extracted = extractTopicsFromText(resultText);
          extracted.forEach((t) => topics.add(t));

          const entities = extractEntitiesFromText(resultText);
          entities.forEach((e) => topics.add(e));
        }
      }
    }
  }

  return Array.from(topics);
};

const extractTextFromToolResult = (result: { type: string; data?: unknown }): string => {
  if (!result.data) {
    return '';
  }

  if (typeof result.data === 'string') {
    return result.data;
  }

  if (typeof result.data === 'object') {
    return JSON.stringify(result.data);
  }

  return String(result.data);
};

const extractRecentQuestions = (rounds: ConversationRound[]): string[] => {
  const questions: string[] = [];
  const recentRounds = rounds.slice(-3);

  for (const round of recentRounds) {
    const message = round.input?.message ?? '';

    if (
      message.includes('?') ||
      /^(what|how|why|when|where|who|can|could|would|should|is|are|do|does)/i.test(message)
    ) {
      const cleanQuestion = message
        .replace(/[^\w\s?]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .substring(0, 200);

      if (cleanQuestion.length > 10) {
        questions.push(cleanQuestion);
      }
    }
  }

  return questions;
};

const inferUserIntent = (rounds: ConversationRound[]): string => {
  if (rounds.length === 0) {
    return '';
  }

  const lastRound = rounds[rounds.length - 1];
  const message = lastRound.input?.message ?? '';

  const intentPatterns: Array<{ pattern: RegExp; intent: string }> = [
    { pattern: /debug|troubleshoot|investigate|diagnose/i, intent: 'troubleshooting' },
    { pattern: /why|cause|reason|explain/i, intent: 'understanding root cause' },
    { pattern: /fix|resolve|solve|repair/i, intent: 'finding a solution' },
    { pattern: /monitor|alert|watch|track/i, intent: 'monitoring and alerting' },
    { pattern: /performance|slow|latency|throughput/i, intent: 'performance analysis' },
    { pattern: /error|exception|failure|crash/i, intent: 'error investigation' },
    { pattern: /log|metric|trace|span/i, intent: 'observability data analysis' },
    { pattern: /deploy|release|rollout|upgrade/i, intent: 'deployment analysis' },
  ];

  for (const { pattern, intent } of intentPatterns) {
    if (pattern.test(message)) {
      return intent;
    }
  }

  if (message.includes('?')) {
    return 'answering a question';
  }

  return 'general assistance';
};
