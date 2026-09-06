/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { ViewSpec } from '@kbn/adaptive-ui';
import {
  Badge,
  BadgeGroup,
  CodeBlock,
  Entity,
  EntityList,
  Text,
  View,
  toViewSpec,
} from '@kbn/adaptive-ui/jsx';

/**
 * Mirror of the `skill` attachment data (Agent Builder platform). Only the
 * presentational body subset is mirrored; live tool wiring is out of scope.
 */
export interface SkillReferencedContent {
  title: string;
  type?: string;
}

export interface SkillData {
  name: string;
  description?: string;
  content?: string;
  tool_ids?: string[];
  referenced_content?: SkillReferencedContent[];
}

/**
 * Alternate rendering for the `skill` attachment (body subset): the description,
 * the skill instructions as a `codeBlock`, a `badgeGroup` row of enabled tools, and an
 * `entityList` of referenced content.
 */
export const toSkillViewSpec = ({
  name,
  description,
  content,
  tool_ids: toolIds,
  referenced_content: referencedContent,
}: SkillData): ViewSpec =>
  toViewSpec(
    <View title={name} subtitle="Skill">
      {description && <Text body={description} />}
      {content && <CodeBlock language="markdown" code={content} title="Instructions" collapsible />}
      {toolIds && toolIds.length > 0 && (
        <BadgeGroup label="Tools">
          {toolIds.map((label) => (
            <Badge key={label} label={label} variant="hollow" />
          ))}
        </BadgeGroup>
      )}
      {referencedContent && referencedContent.length > 0 && (
        <EntityList label="Referenced content">
          {referencedContent.map((item) => (
            <Entity key={item.title} title={item.title} meta={item.type} />
          ))}
        </EntityList>
      )}
    </View>
  );

export const sampleSkill: SkillData = {
  name: 'Summarize on-call incident',
  description:
    'Collects the active significant event, related cases, and recent deploys, then drafts an incident summary for the on-call channel.',
  content: [
    '1. Fetch the active significant event for the affected stream.',
    '2. List open cases tagged with the service name.',
    '3. Summarize root cause and the top three remediations.',
  ].join('\n'),
  tool_ids: ['request_registered_view', 'search', 'get_cases'],
  referenced_content: [
    { title: 'Payments runbook', type: 'doc' },
    { title: 'On-call escalation policy', type: 'doc' },
  ],
};
