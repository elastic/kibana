/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ACTION_POLICY_AUTHORING_SKILL_ID } from '@kbn/alerting-v2-constants';

export const ACTION_POLICY_AUTHORING_SKILL_BASE_PATH = 'skills/platform/alerting';

export const WORKFLOW_DISPATCH_PAYLOAD_REFERENCE = {
  name: 'workflow-dispatch-payload',
  relativePath: './references',
} as const;

/** Filestore path for a skill referenced-content file: `{basePath}/{skillName}/{relativePath}/{name}.md`. */
export const referencedContentSkillPath = ({
  basePath,
  name,
  referencedContent,
}: {
  basePath: string;
  name: string;
  referencedContent: { relativePath: string; name: string };
}): string => {
  const segments = [basePath, name, referencedContent.relativePath, `${referencedContent.name}.md`]
    .flatMap((segment) => segment.split('/'))
    .filter((segment) => segment.length > 0 && segment !== '.');
  return segments.join('/');
};

export const WORKFLOW_DISPATCH_PAYLOAD_SKILL_REF = referencedContentSkillPath({
  basePath: ACTION_POLICY_AUTHORING_SKILL_BASE_PATH,
  name: ACTION_POLICY_AUTHORING_SKILL_ID,
  referencedContent: WORKFLOW_DISPATCH_PAYLOAD_REFERENCE,
});
